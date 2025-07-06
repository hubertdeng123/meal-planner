from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import Optional, List
from datetime import time, datetime, timedelta
from pydantic import BaseModel
from app.db.database import get_db
from app.api.deps import get_current_active_user
from app.models import User
from app.schemas.user import UserNotificationPreferences, UserNotificationUpdate
from app.services.email_service import email_service
from app.services.scheduler_service import scheduler_service
from app.core.exceptions import (
    EmailServiceError,
    SMTPConfigurationError,
    SMTPConnectionError,
    SMTPAuthenticationError,
    EmailDeliveryError,
    EmailTemplateError,
)
import pytz
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


class GroceryNotificationRequest(BaseModel):
    grocery_list_id: Optional[int] = None
    additional_emails: Optional[List[str]] = None


class WeeklyMealPlanNotificationRequest(BaseModel):
    meal_plan_id: Optional[int] = None
    additional_emails: Optional[List[str]] = None
    weekly_recipes: Optional[dict] = None  # For AI-generated meal plans without IDs


@router.get("/preferences/", response_model=UserNotificationPreferences)
async def get_notification_preferences(
    current_user: User = Depends(get_current_active_user),
):
    """Get user's notification preferences"""
    return UserNotificationPreferences(
        email_notifications_enabled=current_user.email_notifications_enabled,
        weekly_planning_reminder=current_user.weekly_planning_reminder,
        reminder_day_of_week=current_user.reminder_day_of_week,
        reminder_time=current_user.reminder_time,
        timezone=current_user.timezone,
    )


@router.put("/preferences/", response_model=UserNotificationPreferences)
async def update_notification_preferences(
    preferences: UserNotificationUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Update user's notification preferences"""

    # Validate timezone if provided
    if preferences.timezone:
        try:
            pytz.timezone(preferences.timezone)
        except pytz.exceptions.UnknownTimeZoneError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid timezone"
            )

    # Validate day of week
    if preferences.reminder_day_of_week is not None:
        if preferences.reminder_day_of_week < 0 or preferences.reminder_day_of_week > 6:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="reminder_day_of_week must be between 0 (Monday) and 6 (Sunday)",
            )

    # Update user preferences
    if preferences.email_notifications_enabled is not None:
        current_user.email_notifications_enabled = (
            preferences.email_notifications_enabled
        )

    if preferences.weekly_planning_reminder is not None:
        current_user.weekly_planning_reminder = preferences.weekly_planning_reminder

    if preferences.reminder_day_of_week is not None:
        current_user.reminder_day_of_week = preferences.reminder_day_of_week

    if preferences.reminder_time is not None:
        current_user.reminder_time = preferences.reminder_time

    if preferences.timezone is not None:
        current_user.timezone = preferences.timezone

    current_user.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(current_user)

    return UserNotificationPreferences(
        email_notifications_enabled=current_user.email_notifications_enabled,
        weekly_planning_reminder=current_user.weekly_planning_reminder,
        reminder_day_of_week=current_user.reminder_day_of_week,
        reminder_time=current_user.reminder_time,
        timezone=current_user.timezone,
    )


@router.post("/test-weekly-reminder/")
async def send_test_weekly_reminder(
    current_user: User = Depends(get_current_active_user),
):
    """Send a test weekly reminder email to the current user"""

    if not current_user.email_notifications_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email notifications are disabled for your account. Please enable them in settings first.",
        )

    try:
        success = await scheduler_service.send_immediate_reminder(current_user.id)

        if success:
            return {
                "detail": "Test reminder sent successfully",
                "email": current_user.email,
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to send test reminder for unknown reasons",
            )

    except SMTPConfigurationError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e)
        )

    except SMTPConnectionError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e)
        )

    except SMTPAuthenticationError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e)
        )

    except EmailDeliveryError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    except EmailTemplateError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )

    except EmailServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error sending test reminder: {str(e)}",
        )


@router.post("/send-grocery-notification/")
async def send_grocery_list_notification(
    request: GroceryNotificationRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Send grocery list ready notification with items included

    Args:
        request: Request body containing grocery_list_id and additional_emails
    """

    if not current_user.email_notifications_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email notifications are disabled for your account. Please enable them in settings first.",
        )

    # Get grocery list and items if ID provided
    grocery_list = None
    grocery_items = None
    item_count = 0

    if request.grocery_list_id:
        from app.models.meal_plan import GroceryList, GroceryItem

        # Verify grocery list belongs to user
        grocery_list = (
            db.query(GroceryList)
            .filter(
                GroceryList.id == request.grocery_list_id,
                GroceryList.user_id == current_user.id,
            )
            .first()
        )

        if not grocery_list:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Grocery list not found"
            )

        # Get unchecked items (items still needed for shopping)
        unchecked_items = (
            db.query(GroceryItem)
            .filter(
                GroceryItem.grocery_list_id == request.grocery_list_id,
                GroceryItem.checked == 0,  # Unchecked items
            )
            .all()
        )

        item_count = len(unchecked_items)

        # Group items by category for email template
        if unchecked_items:
            grocery_items = {}
            for item in unchecked_items:
                category = item.category or "Other"
                if category not in grocery_items:
                    grocery_items[category] = []
                grocery_items[category].append(item)

            # Sort categories for consistent display
            grocery_items = dict(sorted(grocery_items.items()))

    # Validate additional emails
    if request.additional_emails:
        import re

        email_pattern = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")
        invalid_emails = [
            email
            for email in request.additional_emails
            if not email_pattern.match(email)
        ]

        if invalid_emails:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid email addresses: {', '.join(invalid_emails)}",
            )

    try:
        results = await email_service.send_grocery_list_notification(
            user=current_user,
            grocery_list=grocery_list,
            grocery_items=grocery_items,
            item_count=item_count,
            additional_emails=request.additional_emails or [],
        )

        if results["total_sent"] > 0:
            response = {
                "detail": f"Grocery list notification sent to {results['total_sent']} recipient(s)",
                "sent_to": results["sent_to"],
                "total_sent": results["total_sent"],
            }

            if results["total_failed"] > 0:
                response["failed"] = results["failed"]
                response["total_failed"] = results["total_failed"]
                response["detail"] += f" ({results['total_failed']} failed)"

            return response
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to send notifications. Errors: {results['failed']}",
            )

    except SMTPConfigurationError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e)
        )

    except SMTPConnectionError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e)
        )

    except SMTPAuthenticationError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e)
        )

    except EmailDeliveryError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    except EmailTemplateError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )

    except EmailServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )

    except HTTPException:
        # Re-raise HTTPException as-is
        raise

    except Exception as e:
        logger.error(f"Unexpected error in grocery list notification: {str(e)}")
        raise EmailServiceError(f"Failed to send grocery list notification: {str(e)}")


@router.post("/send-weekly-meal-plan-notification/")
async def send_weekly_meal_plan_notification(
    request: WeeklyMealPlanNotificationRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Send weekly meal plan notification with recipe names and grocery list

    Args:
        request: Request body containing meal_plan_id and additional_emails
    """

    if not current_user.email_notifications_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email notifications are disabled for your account. Please enable them in settings first.",
        )

    # Get meal plan if ID provided
    meal_plan = None
    weekly_recipes = None
    grocery_list = None
    grocery_items = None
    item_count = 0

    if request.meal_plan_id:
        from app.models.meal_plan import (
            MealPlan as WeeklyMealPlanModel,
            GroceryList,
            GroceryItem,
            MealPlanItem,
        )

        # Verify meal plan belongs to user
        meal_plan = (
            db.query(WeeklyMealPlanModel)
            .options(
                joinedload(WeeklyMealPlanModel.items).options(
                    joinedload(MealPlanItem.recipe)
                )
            )
            .filter(
                WeeklyMealPlanModel.id == request.meal_plan_id,
                WeeklyMealPlanModel.user_id == current_user.id,
            )
            .first()
        )

        if not meal_plan:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Meal plan not found"
            )

        # Get associated grocery list
        grocery_list = (
            db.query(GroceryList)
            .filter(GroceryList.meal_plan_id == request.meal_plan_id)
            .first()
        )

        if grocery_list:
            # Get unchecked items (items still needed for shopping)
            unchecked_items = (
                db.query(GroceryItem)
                .filter(
                    GroceryItem.grocery_list_id == grocery_list.id,
                    GroceryItem.checked == 0,  # Unchecked items
                )
                .all()
            )

            item_count = len(unchecked_items)

            # Group items by category for email template
            if unchecked_items:
                grocery_items = {}
                for item in unchecked_items:
                    category = item.category or "Other"
                    if category not in grocery_items:
                        grocery_items[category] = []
                    grocery_items[category].append(item)

                # Sort categories for consistent display
                grocery_items = dict(sorted(grocery_items.items()))

        # Extract recipe names from meal plan data
        if meal_plan.items:
            weekly_recipes = {}
            # Sort items by date and meal_type for consistent order
            sorted_items = sorted(meal_plan.items, key=lambda x: (x.date, x.meal_type))
            for item in sorted_items:
                day_name = item.date.strftime("%A")
                if day_name not in weekly_recipes:
                    weekly_recipes[day_name] = []

                recipe_name = "Untitled Recipe"
                if item.recipe:
                    recipe_name = item.recipe.name
                elif item.recipe_data and "name" in item.recipe_data:
                    recipe_name = item.recipe_data["name"]

                weekly_recipes[day_name].append(
                    {
                        "name": recipe_name,
                        "meal_type": item.meal_type.title(),
                    }
                )
    elif request.weekly_recipes:
        # Use weekly_recipes data provided directly from frontend (for AI-generated plans)
        weekly_recipes = request.weekly_recipes
        logger.info(f"Using weekly_recipes data from request: {weekly_recipes}")
    else:
        # No meal plan ID and no weekly_recipes data - send basic notification
        logger.info(
            "No meal plan ID or weekly_recipes data provided, sending basic notification"
        )

    # Validate additional emails
    if request.additional_emails:
        import re

        email_pattern = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")
        invalid_emails = [
            email
            for email in request.additional_emails
            if not email_pattern.match(email)
        ]

        if invalid_emails:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid email addresses: {', '.join(invalid_emails)}",
            )

    try:
        results = await email_service.send_weekly_meal_plan_notification(
            user=current_user,
            meal_plan=meal_plan,
            weekly_recipes=weekly_recipes,
            grocery_list=grocery_list,
            grocery_items=grocery_items,
            item_count=item_count,
            additional_emails=request.additional_emails or [],
        )

        if results["total_sent"] > 0:
            response = {
                "detail": f"Weekly meal plan notification sent to {results['total_sent']} recipient(s)",
                "sent_to": results["sent_to"],
                "total_sent": results["total_sent"],
            }

            if results["total_failed"] > 0:
                response["failed"] = results["failed"]
                response["total_failed"] = results["total_failed"]
                response["detail"] += f" ({results['total_failed']} failed)"

            return response
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to send notifications. Errors: {results['failed']}",
            )

    except SMTPConfigurationError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e)
        )

    except SMTPConnectionError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e)
        )

    except SMTPAuthenticationError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e)
        )

    except EmailDeliveryError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    except EmailTemplateError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )

    except EmailServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.get("/timezone-list/")
async def get_available_timezones():
    """Get list of available timezones"""
    # Return common timezones
    common_timezones = [
        "UTC",
        "US/Eastern",
        "US/Central",
        "US/Mountain",
        "US/Pacific",
        "Europe/London",
        "Europe/Paris",
        "Europe/Berlin",
        "Asia/Tokyo",
        "Asia/Shanghai",
        "Australia/Sydney",
        "America/New_York",
        "America/Chicago",
        "America/Denver",
        "America/Los_Angeles",
        "America/Toronto",
        "America/Vancouver",
    ]

    return {"timezones": common_timezones}


@router.get("/reminder-schedule/")
async def get_reminder_schedule(current_user: User = Depends(get_current_active_user)):
    """Get when the user's next reminder will be sent"""

    if (
        not current_user.weekly_planning_reminder
        or not current_user.email_notifications_enabled
    ):
        return {"next_reminder": None, "message": "Weekly reminders are disabled"}

    try:
        # Calculate next reminder datetime
        user_tz = (
            pytz.timezone(current_user.timezone)
            if current_user.timezone != "UTC"
            else pytz.UTC
        )
        now = datetime.now(user_tz)

        # Find next occurrence of reminder day
        days_ahead = current_user.reminder_day_of_week - now.weekday()
        if days_ahead <= 0:  # Target day already happened this week
            days_ahead += 7

        next_reminder_date = now.date() + timedelta(days=days_ahead)
        reminder_time = current_user.reminder_time or time(9, 0)

        next_reminder_datetime = user_tz.localize(
            datetime.combine(next_reminder_date, reminder_time)
        )

        # Convert to UTC for API response
        next_reminder_utc = next_reminder_datetime.astimezone(pytz.UTC)

        weekday_names = [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday",
        ]
        reminder_day_name = weekday_names[current_user.reminder_day_of_week]

        return {
            "next_reminder": next_reminder_utc.isoformat(),
            "reminder_day": reminder_day_name,
            "reminder_time": reminder_time.strftime("%H:%M"),
            "timezone": current_user.timezone,
            "message": f"Next reminder: {reminder_day_name} at {reminder_time.strftime('%H:%M')} ({current_user.timezone})",
        }

    except Exception as e:
        return {
            "next_reminder": None,
            "message": f"Error calculating next reminder: {str(e)}",
        }
