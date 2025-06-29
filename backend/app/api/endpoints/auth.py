from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token
from app.models import User
from app.schemas.user import UserCreate, User as UserSchema, Token, UserPreferences
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

    # Create new user
    db_user = User(
        email=request.user_data.email,
        username=request.user_data.username,
        hashed_password=get_password_hash(request.user_data.password),
        food_preferences=request.preferences.food_preferences,
        dietary_restrictions=request.preferences.dietary_restrictions,
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
    return current_user
