from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token
from app.models import User
from app.schemas.user import (
    UserCreate,
    User as UserSchema,
    Token,
    UserPreferences,
    UserUpdate,
)
from app.api.deps import get_current_active_user
from pydantic import BaseModel


router = APIRouter()


class RegisterRequest(BaseModel):
    user_data: UserCreate
    preferences: UserPreferences


@router.post("/register", response_model=UserSchema)
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    # Check if user exists
    if db.query(User).filter(User.email == request.user_data.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered"
        )

    if db.query(User).filter(User.username == request.user_data.username).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Username already taken"
        )

    # Create new user with enhanced preferences
    db_user = User(
        email=request.user_data.email,
        username=request.user_data.username,
        hashed_password=get_password_hash(request.user_data.password),
        food_preferences=request.preferences.food_preferences.model_dump(),
        dietary_restrictions=request.preferences.dietary_restrictions,
        ingredient_rules=request.preferences.ingredient_rules.model_dump(),
        food_type_rules=request.preferences.food_type_rules.model_dump(),
        nutritional_rules=request.preferences.nutritional_rules.model_dump(),
        scheduling_rules=request.preferences.scheduling_rules.model_dump(),
        dietary_rules=request.preferences.dietary_rules.model_dump(),
    )

    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    return db_user


@router.post("/login", response_model=Token)
def login(
    db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()
):
    # OAuth2PasswordRequestForm uses username field, but we'll accept email
    user = (
        db.query(User)
        .filter(
            (User.email == form_data.username) | (User.username == form_data.username)
        )
        .first()
    )

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(data={"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserSchema)
def get_current_user_info(current_user: User = Depends(get_current_active_user)):
    """Get current authenticated user information"""
    user_prefs = UserPreferences.model_validate(current_user)
    return UserSchema(
        id=current_user.id,
        email=current_user.email,
        username=current_user.username,
        is_active=current_user.is_active,
        created_at=current_user.created_at,
        updated_at=current_user.updated_at,
        preferences=user_prefs,
    )


@router.put("/me", response_model=UserSchema)
def update_current_user(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Update current authenticated user information and preferences"""

    # Update basic user info
    if user_update.email is not None:
        # Check if email is already taken by another user
        existing_user = (
            db.query(User)
            .filter(User.email == user_update.email, User.id != current_user.id)
            .first()
        )
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered by another user",
            )
        current_user.email = user_update.email

    if user_update.username is not None:
        # Check if username is already taken by another user
        existing_user = (
            db.query(User)
            .filter(User.username == user_update.username, User.id != current_user.id)
            .first()
        )
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken by another user",
            )
        current_user.username = user_update.username

    # Update preferences
    if user_update.preferences is not None:
        prefs = user_update.preferences
        current_user.food_preferences = prefs.food_preferences.model_dump()
        current_user.dietary_restrictions = prefs.dietary_restrictions
        current_user.ingredient_rules = prefs.ingredient_rules.model_dump()
        current_user.food_type_rules = prefs.food_type_rules.model_dump()
        current_user.nutritional_rules = prefs.nutritional_rules.model_dump()
        current_user.scheduling_rules = prefs.scheduling_rules.model_dump()
        current_user.dietary_rules = prefs.dietary_rules.model_dump()

    # Update timestamp
    from datetime import datetime

    current_user.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(current_user)

    return current_user


@router.get("/me/preferences", response_model=UserPreferences)
def get_current_user_preferences(current_user: User = Depends(get_current_active_user)):
    """Get current user's detailed preferences"""
    # By validating the user model against the UserPreferences schema,
    # we ensure that any missing fields get their default values.
    return UserPreferences.model_validate(current_user)


@router.put("/me/preferences", response_model=UserPreferences)
async def update_user_preferences(
    preferences: UserPreferences,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> UserPreferences:
    """
    Update current user's preferences.
    """
    current_user.food_preferences = preferences.food_preferences.model_dump()
    current_user.dietary_restrictions = preferences.dietary_restrictions
    current_user.ingredient_rules = preferences.ingredient_rules.model_dump()
    current_user.food_type_rules = preferences.food_type_rules.model_dump()
    current_user.nutritional_rules = preferences.nutritional_rules.model_dump()
    current_user.scheduling_rules = preferences.scheduling_rules.model_dump()
    current_user.dietary_rules = preferences.dietary_rules.model_dump()

    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    return preferences
