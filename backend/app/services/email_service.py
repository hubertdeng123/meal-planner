import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from pathlib import Path
from typing import List, Optional
from jinja2 import Environment, FileSystemLoader, TemplateError
from app.core.config import settings
from app.core.exceptions import (
    EmailServiceError,
    SMTPConfigurationError,
    SMTPConnectionError,
    SMTPAuthenticationError,
    EmailDeliveryError,
    EmailTemplateError,
)
from app.models import User
import logging
import socket

logger = logging.getLogger(__name__)

# Template directory path
TEMPLATE_DIR = Path(__file__).parent.parent / "templates" / "email"


class EmailService:
    def __init__(self):
        self.smtp_host = settings.SMTP_HOST
        self.smtp_port = settings.SMTP_PORT
        self.smtp_username = settings.SMTP_USERNAME
        self.smtp_password = settings.SMTP_PASSWORD
        self.smtp_use_tls = settings.SMTP_USE_TLS
        self.from_email = settings.FROM_EMAIL
        self.from_name = settings.FROM_NAME
        self.base_url = settings.BASE_URL

        # Validate configuration on initialization
        self._validate_configuration()

        # Email templates using FileSystemLoader for external template files
        self.template_env = Environment(loader=FileSystemLoader(str(TEMPLATE_DIR)))

    def _validate_configuration(self):
        """Validate that required email configuration is present"""
        if not self.smtp_host:
            raise SMTPConfigurationError("SMTP host is not configured")
        if not self.from_email:
            raise SMTPConfigurationError("From email address is not configured")
        if not self.smtp_username or not self.smtp_password:
            logger.warning("SMTP authentication not configured - emails may fail")

    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
    ) -> bool:
        """Send an email using SMTP"""
        try:
            # Create message
            msg = MIMEMultipart("alternative")
            msg["From"] = f"{self.from_name} <{self.from_email}>"
            msg["To"] = to_email
            msg["Subject"] = subject

            # Add text content
            if text_content:
                text_part = MIMEText(text_content, "plain")
                msg.attach(text_part)

            # Add HTML content
            html_part = MIMEText(html_content, "html")
            msg.attach(html_part)

            # Send email
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                if self.smtp_use_tls:
                    server.starttls()

                if self.smtp_username and self.smtp_password:
                    server.login(self.smtp_username, self.smtp_password)

                server.send_message(msg)

            logger.info(f"Email sent successfully to {to_email}")
            return True

        except smtplib.SMTPConnectError as e:
            logger.error(f"SMTP Connection Error: {str(e)}")
            raise SMTPConnectionError(
                "Unable to connect to email server. Please try again later."
            )

        except smtplib.SMTPAuthenticationError as e:
            logger.error(f"SMTP Authentication Error: {str(e)}")
            raise SMTPAuthenticationError(
                "Email server authentication failed. Please contact support."
            )

        except smtplib.SMTPRecipientsRefused as e:
            logger.error(f"SMTP Recipients Refused: {str(e)}")
            raise EmailDeliveryError(
                "The email address was rejected by the server. Please check your email address."
            )

        except smtplib.SMTPDataError as e:
            logger.error(f"SMTP Data Error: {str(e)}")
            raise EmailDeliveryError(
                "Email content was rejected by the server. Please try again."
            )

        except smtplib.SMTPException as e:
            logger.error(f"SMTP Error: {str(e)}")
            raise EmailDeliveryError(
                "Failed to send email due to server error. Please try again later."
            )

        except socket.gaierror as e:
            logger.error(f"DNS/Network Error: {str(e)}")
            raise SMTPConnectionError(
                "Network error - unable to reach email server. Please check your internet connection."
            )

        except socket.timeout as e:
            logger.error(f"Connection Timeout: {str(e)}")
            raise SMTPConnectionError(
                "Email server connection timed out. Please try again later."
            )

        except Exception as e:
            logger.error(f"Unexpected error sending email to {to_email}: {str(e)}")
            raise EmailServiceError(
                f"Unexpected error occurred while sending email: {str(e)}"
            )

    async def send_weekly_reminder(
        self, user: User, recent_recipes: Optional[List] = None
    ) -> bool:
        """Send weekly meal planning reminder email"""
        try:
            template = self.template_env.get_template("weekly_reminder.html")

            # Get current day name
            from datetime import datetime

            day_name = datetime.now().strftime("%A")

            html_content = template.render(
                user=user,
                day_name=day_name,
                base_url=self.base_url,
                recent_recipes=recent_recipes or [],
            )

            subject = f"🍳 Weekly Meal Planning Reminder - Plan Your {day_name}!"

            return await self.send_email(
                to_email=user.email, subject=subject, html_content=html_content
            )

        except TemplateError as e:
            logger.error(f"Template rendering error for weekly reminder: {str(e)}")
            raise EmailTemplateError("Error generating weekly reminder email content.")

        except EmailServiceError:
            # Re-raise email service errors
            raise

        except Exception as e:
            logger.error(
                f"Unexpected error sending weekly reminder to {user.email}: {str(e)}"
            )
            raise EmailServiceError(f"Failed to send weekly reminder: {str(e)}")

    async def send_grocery_list_notification(
        self,
        user: User,
        grocery_list=None,
        grocery_items: dict = None,
        item_count: int = 0,
        additional_emails: list = None,
    ) -> dict:
        """Send notification when grocery list is ready

        Args:
            user: The user who owns the grocery list
            grocery_list: The GroceryList model instance (optional)
            grocery_items: Dict of categorized grocery items {category: [items]} (optional)
            item_count: Total number of items
            additional_emails: List of additional email addresses to send to (optional)

        Returns:
            dict: Summary of email sending results
        """
        if additional_emails is None:
            additional_emails = []

        results = {"sent_to": [], "failed": [], "total_sent": 0, "total_failed": 0}

        try:
            template = self.template_env.get_template("grocery_list_ready.html")

            # Send to primary user
            try:
                html_content = template.render(
                    user=user,
                    base_url=self.base_url,
                    grocery_list=grocery_list,
                    grocery_items=grocery_items,
                    item_count=item_count,
                    additional_recipient=False,
                )

                subject = "🛒 Your Grocery List is Ready!"

                success = await self.send_email(
                    to_email=user.email, subject=subject, html_content=html_content
                )

                if success:
                    results["sent_to"].append(user.email)
                    results["total_sent"] += 1
                else:
                    results["failed"].append(
                        {"email": user.email, "error": "Unknown error"}
                    )
                    results["total_failed"] += 1

            except Exception as e:
                logger.error(
                    f"Failed to send grocery notification to primary user {user.email}: {str(e)}"
                )
                results["failed"].append({"email": user.email, "error": str(e)})
                results["total_failed"] += 1

            # Send to additional recipients
            for additional_email in additional_emails:
                try:
                    # Render template for additional recipient
                    html_content = template.render(
                        user=user,
                        base_url=self.base_url,
                        grocery_list=grocery_list,
                        grocery_items=grocery_items,
                        item_count=item_count,
                        additional_recipient=True,
                    )

                    subject = f"🛒 Grocery List from {user.username}"

                    success = await self.send_email(
                        to_email=additional_email,
                        subject=subject,
                        html_content=html_content,
                    )

                    if success:
                        results["sent_to"].append(additional_email)
                        results["total_sent"] += 1
                    else:
                        results["failed"].append(
                            {"email": additional_email, "error": "Unknown error"}
                        )
                        results["total_failed"] += 1

                except Exception as e:
                    logger.error(
                        f"Failed to send grocery notification to {additional_email}: {str(e)}"
                    )
                    results["failed"].append(
                        {"email": additional_email, "error": str(e)}
                    )
                    results["total_failed"] += 1

            return results

        except TemplateError as e:
            logger.error(f"Template rendering error for grocery notification: {str(e)}")
            raise EmailTemplateError(
                "Error generating grocery list notification email content."
            )

        except Exception as e:
            logger.error(f"Unexpected error in grocery list notification: {str(e)}")
            raise EmailServiceError(
                f"Failed to send grocery list notification: {str(e)}"
            )

    async def send_weekly_meal_plan_notification(
        self,
        user: User,
        meal_plan=None,
        weekly_recipes: dict = None,
        grocery_list=None,
        grocery_items: dict = None,
        item_count: int = 0,
        additional_emails: list = None,
    ) -> dict:
        """Send notification when weekly meal plan is ready with recipe names and grocery list

        Args:
            user: The user who owns the meal plan
            meal_plan: The meal plan model instance (optional)
            weekly_recipes: Dict of recipes organized by day {day_name: [recipes]} (optional)
            grocery_list: The GroceryList model instance (optional)
            grocery_items: Dict of categorized grocery items {category: [items]} (optional)
            item_count: Total number of grocery items
            additional_emails: List of additional email addresses to send to (optional)

        Returns:
            dict: Summary of email sending results
        """
        if additional_emails is None:
            additional_emails = []

        results = {"sent_to": [], "failed": [], "total_sent": 0, "total_failed": 0}

        try:
            template = self.template_env.get_template("weekly_meal_plan_ready.html")

            # Send to primary user
            try:
                html_content = template.render(
                    user=user,
                    base_url=self.base_url,
                    meal_plan=meal_plan,
                    weekly_recipes=weekly_recipes,
                    grocery_list=grocery_list,
                    grocery_items=grocery_items,
                    item_count=item_count,
                )

                subject = "📅 Your Weekly Meal Plan is Ready!"

                success = await self.send_email(
                    to_email=user.email, subject=subject, html_content=html_content
                )

                if success:
                    results["sent_to"].append(user.email)
                    results["total_sent"] += 1
                else:
                    results["failed"].append(
                        {"email": user.email, "error": "Unknown error"}
                    )
                    results["total_failed"] += 1

            except Exception as e:
                logger.error(
                    f"Failed to send weekly meal plan notification to primary user {user.email}: {str(e)}"
                )
                results["failed"].append({"email": user.email, "error": str(e)})
                results["total_failed"] += 1

            # Send to additional recipients if provided
            for additional_email in additional_emails:
                try:
                    # Render template for additional recipient
                    html_content = template.render(
                        user=user,
                        base_url=self.base_url,
                        meal_plan=meal_plan,
                        weekly_recipes=weekly_recipes,
                        grocery_list=grocery_list,
                        grocery_items=grocery_items,
                        item_count=item_count,
                    )

                    subject = f"📅 Weekly Meal Plan from {user.username}"

                    success = await self.send_email(
                        to_email=additional_email,
                        subject=subject,
                        html_content=html_content,
                    )

                    if success:
                        results["sent_to"].append(additional_email)
                        results["total_sent"] += 1
                    else:
                        results["failed"].append(
                            {"email": additional_email, "error": "Unknown error"}
                        )
                        results["total_failed"] += 1

                except Exception as e:
                    logger.error(
                        f"Failed to send weekly meal plan notification to {additional_email}: {str(e)}"
                    )
                    results["failed"].append(
                        {"email": additional_email, "error": str(e)}
                    )
                    results["total_failed"] += 1

            return results

        except TemplateError as e:
            logger.error(
                f"Template rendering error for weekly meal plan notification: {str(e)}"
            )
            raise EmailTemplateError(
                "Error generating weekly meal plan notification email content."
            )

        except Exception as e:
            logger.error(f"Unexpected error in weekly meal plan notification: {str(e)}")
            raise EmailServiceError(
                f"Failed to send weekly meal plan notification: {str(e)}"
            )


# Create singleton instance
email_service = EmailService()
