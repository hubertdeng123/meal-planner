from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict
from datetime import datetime, time


class UserBase(BaseModel):
    email: EmailStr
    username: str


class UserCreate(UserBase):
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserPreferences(BaseModel):
    food_preferences: Dict[str, List[str]] = {
        "cuisines": [],
        "favorite_ingredients": [],
        "cooking_methods": [],
    }
    dietary_restrictions: List[str] = []


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    food_preferences: Optional[Dict[str, List[str]]] = None
    dietary_restrictions: Optional[List[str]] = None


class User(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    food_preferences: Dict[str, List[str]]
    dietary_restrictions: List[str]

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    user_id: Optional[int] = None


class UserNotificationPreferences(BaseModel):
    """User's email notification preferences"""

    email_notifications_enabled: bool
    weekly_planning_reminder: bool
    reminder_day_of_week: int  # 0=Monday, 6=Sunday
    reminder_time: time
    timezone: str


class UserNotificationUpdate(BaseModel):
    """Update user's notification preferences"""

    email_notifications_enabled: Optional[bool] = None
    weekly_planning_reminder: Optional[bool] = None
    reminder_day_of_week: Optional[int] = None  # 0=Monday, 6=Sunday
    reminder_time: Optional[time] = None
    timezone: Optional[str] = None
