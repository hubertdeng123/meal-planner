from datetime import datetime, timedelta, time as dt_time
from typing import List
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models import User, Recipe, RecipeFeedback
from app.services.email_service import email_service
from app.core.exceptions import (
    EmailServiceError,
    SMTPConfigurationError,
    SMTPConnectionError,
    SMTPAuthenticationError,
    EmailDeliveryError,
    EmailTemplateError,
)
import logging
import pytz

logger = logging.getLogger(__name__)


class SchedulerService:
    def __init__(self):
        self.scheduler = AsyncIOScheduler(timezone=pytz.UTC)
        self.is_running = False

    def start(self):
        """Start the scheduler"""
        if not self.is_running:
            # Schedule weekly reminder checks
            self.scheduler.add_job(
                func=self.check_weekly_reminders,
                trigger=CronTrigger(
                    hour=0, minute=0
                ),  # Run every hour at the top of the hour
                id="weekly_reminder_check",
                name="Check for weekly meal planning reminders",
                replace_existing=True,
            )

            self.scheduler.start()
            self.is_running = True
            logger.info("Scheduler service started")

    def stop(self):
        """Stop the scheduler"""
        if self.is_running:
            self.scheduler.shutdown()
            self.is_running = False
            logger.info("Scheduler service stopped")

    async def check_weekly_reminders(self):
        """Check which users should receive weekly reminders now"""
        try:
            db = next(get_db())

            # Get current UTC time
            now_utc = datetime.utcnow()
            current_hour = now_utc.hour
            current_weekday = now_utc.weekday()  # Monday = 0, Sunday = 6

            # Query users who should receive reminders
            users_to_remind = (
                db.query(User)
                .filter(
                    User.email_notifications_enabled,
                    User.weekly_planning_reminder,
                    User.reminder_day_of_week == current_weekday,
                )
                .all()
            )

            reminded_count = 0
            failed_count = 0

            for user in users_to_remind:
                try:
                    # Convert user's reminder time to UTC
                    user_tz = (
                        pytz.timezone(user.timezone)
                        if user.timezone != "UTC"
                        else pytz.UTC
                    )

                    # Create a datetime for today at the user's reminder time
                    user_reminder_time = user.reminder_time or dt_time(
                        9, 0
                    )  # Default 9 AM
                    today = now_utc.date()
                    reminder_datetime_local = user_tz.localize(
                        datetime.combine(today, user_reminder_time)
                    )
                    reminder_datetime_utc = reminder_datetime_local.astimezone(pytz.UTC)

                    # Check if current time is within 1 hour of the reminder time
                    time_diff = abs((now_utc - reminder_datetime_utc).total_seconds())

                    if time_diff <= 3600:  # Within 1 hour
                        # Get user's recent favorite recipes for personalization
                        recent_recipes = await self.get_recent_favorite_recipes(
                            db, user.id
                        )

                        # Send reminder
                        try:
                            success = await email_service.send_weekly_reminder(
                                user, recent_recipes
                            )
                            if success:
                                reminded_count += 1
                                logger.info(f"Sent weekly reminder to {user.email}")
                            else:
                                failed_count += 1
                                logger.error(
                                    f"Failed to send weekly reminder to {user.email} - unknown reason"
                                )

                        except SMTPConfigurationError as e:
                            failed_count += 1
                            logger.error(
                                f"SMTP configuration error sending reminder to {user.email}: {str(e)}"
                            )

                        except SMTPConnectionError as e:
                            failed_count += 1
                            logger.error(
                                f"SMTP connection error sending reminder to {user.email}: {str(e)}"
                            )

                        except SMTPAuthenticationError as e:
                            failed_count += 1
                            logger.error(
                                f"SMTP authentication error sending reminder to {user.email}: {str(e)}"
                            )

                        except EmailDeliveryError as e:
                            failed_count += 1
                            logger.error(
                                f"Email delivery error sending reminder to {user.email}: {str(e)}"
                            )

                        except EmailTemplateError as e:
                            failed_count += 1
                            logger.error(
                                f"Email template error sending reminder to {user.email}: {str(e)}"
                            )

                        except EmailServiceError as e:
                            failed_count += 1
                            logger.error(
                                f"Email service error sending reminder to {user.email}: {str(e)}"
                            )

                except Exception as e:
                    failed_count += 1
                    logger.error(
                        f"Unexpected error processing reminder for user {user.id}: {str(e)}"
                    )
                    continue

            if reminded_count > 0 or failed_count > 0:
                logger.info(
                    f"Weekly reminder results: {reminded_count} sent, {failed_count} failed"
                )

        except Exception as e:
            logger.error(f"Error in check_weekly_reminders: {str(e)}")
        finally:
            if "db" in locals():
                db.close()

    async def get_recent_favorite_recipes(
        self, db: Session, user_id: int
    ) -> List[dict]:
        """Get user's recent highly-rated recipes for email personalization"""
        try:
            # Get recipes with high ratings (4+ stars) or liked recipes from the last 30 days
            recent_feedback = (
                db.query(RecipeFeedback, Recipe)
                .join(Recipe, RecipeFeedback.recipe_id == Recipe.id)
                .filter(
                    RecipeFeedback.user_id == user_id,
                    RecipeFeedback.created_at >= datetime.utcnow() - timedelta(days=30),
                    (RecipeFeedback.rating >= 4) | (RecipeFeedback.liked),
                )
                .order_by(RecipeFeedback.rating.desc())
                .limit(3)
                .all()
            )

            recipes = []
            for feedback, recipe in recent_feedback:
                recipes.append(
                    {
                        "name": recipe.name,
                        "rating": feedback.rating,
                        "liked": feedback.liked,
                    }
                )

            return recipes

        except Exception as e:
            logger.error(
                f"Error getting recent favorite recipes for user {user_id}: {str(e)}"
            )
            return []

    async def send_immediate_reminder(self, user_id: int) -> bool:
        """Send an immediate weekly reminder to a specific user (for testing)"""
        try:
            db = next(get_db())
            user = db.query(User).filter(User.id == user_id).first()

            if not user:
                logger.error(f"User {user_id} not found")
                return False

            if not user.email_notifications_enabled:
                logger.warning(f"Email notifications disabled for user {user_id}")
                return False

            # Get recent recipes
            recent_recipes = await self.get_recent_favorite_recipes(db, user.id)

            # Send reminder - let exceptions bubble up to be handled by the API endpoint
            success = await email_service.send_weekly_reminder(user, recent_recipes)

            if success:
                logger.info(f"Sent immediate weekly reminder to {user.email}")

            return success

        except EmailServiceError:
            # Re-raise email service errors to be handled by API endpoint
            raise

        except Exception as e:
            logger.error(
                f"Unexpected error sending immediate reminder to user {user_id}: {str(e)}"
            )
            raise EmailServiceError(f"Unexpected error sending reminder: {str(e)}")
        finally:
            if "db" in locals():
                db.close()

    def schedule_one_time_reminder(self, user_id: int, send_datetime: datetime):
        """Schedule a one-time reminder for a specific user"""
        job_id = f"one_time_reminder_{user_id}_{send_datetime.timestamp()}"

        self.scheduler.add_job(
            func=self.send_immediate_reminder,
            trigger="date",
            run_date=send_datetime,
            args=[user_id],
            id=job_id,
            name=f"One-time reminder for user {user_id}",
            replace_existing=True,
        )

        logger.info(
            f"Scheduled one-time reminder for user {user_id} at {send_datetime}"
        )


# Create singleton instance
scheduler_service = SchedulerService()
