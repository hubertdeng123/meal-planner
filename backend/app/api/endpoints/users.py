"""
User management and preferences API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any
from app.db.database import get_db
from app.api.deps import get_current_active_user
from app.models import User
from app.schemas.user import (
    UserPreferencesUpdate,
    UserPreferences,
    IngredientRules,
    NutritionalRules,
)

router = APIRouter()


@router.get("/preferences", response_model=UserPreferences)
async def get_user_preferences(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Get comprehensive user preferences"""
    return UserPreferences(
        food_preferences=current_user.food_preferences or {},
        dietary_restrictions=current_user.dietary_restrictions or [],
        ingredient_rules=current_user.ingredient_rules or {},
        food_type_rules=current_user.food_type_rules or {},
        nutritional_rules=current_user.nutritional_rules or {},
        scheduling_rules=current_user.scheduling_rules or {},
        dietary_rules=current_user.dietary_rules or {},
    )


@router.put("/preferences", response_model=UserPreferences)
async def update_user_preferences(
    preferences: UserPreferencesUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Update user preferences"""
    try:
        # Update only the fields that are provided
        update_data = preferences.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            if hasattr(current_user, field):
                setattr(current_user, field, value)

        db.commit()
        db.refresh(current_user)

        return UserPreferences(
            food_preferences=current_user.food_preferences or {},
            dietary_restrictions=current_user.dietary_restrictions or [],
            ingredient_rules=current_user.ingredient_rules or {},
            food_type_rules=current_user.food_type_rules or {},
            nutritional_rules=current_user.nutritional_rules or {},
            scheduling_rules=current_user.scheduling_rules or {},
            dietary_rules=current_user.dietary_rules or {},
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update preferences: {str(e)}",
        )


@router.patch("/preferences/food", response_model=UserPreferences)
async def update_food_preferences(
    food_preferences: Dict[str, Any],
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Update food preferences specifically"""
    try:
        current_user.food_preferences = food_preferences
        db.commit()
        db.refresh(current_user)

        return UserPreferences(
            food_preferences=current_user.food_preferences or {},
            dietary_restrictions=current_user.dietary_restrictions or [],
            ingredient_rules=current_user.ingredient_rules or {},
            food_type_rules=current_user.food_type_rules or {},
            nutritional_rules=current_user.nutritional_rules or {},
            scheduling_rules=current_user.scheduling_rules or {},
            dietary_rules=current_user.dietary_rules or {},
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update food preferences: {str(e)}",
        )


@router.patch("/preferences/dietary-restrictions")
async def update_dietary_restrictions(
    dietary_restrictions: list[str],
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Update dietary restrictions specifically"""
    try:
        current_user.dietary_restrictions = dietary_restrictions
        db.commit()
        db.refresh(current_user)

        return {"dietary_restrictions": current_user.dietary_restrictions}
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update dietary restrictions: {str(e)}",
        )


@router.patch("/preferences/ingredient-rules")
async def update_ingredient_rules(
    ingredient_rules: IngredientRules,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Update ingredient rules specifically"""
    try:
        current_user.ingredient_rules = ingredient_rules.model_dump()
        db.commit()
        db.refresh(current_user)

        return {"ingredient_rules": current_user.ingredient_rules}
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update ingredient rules: {str(e)}",
        )


@router.patch("/preferences/nutritional-rules")
async def update_nutritional_rules(
    nutritional_rules: NutritionalRules,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Update nutritional rules specifically"""
    try:
        current_user.nutritional_rules = nutritional_rules.model_dump()
        db.commit()
        db.refresh(current_user)

        return {"nutritional_rules": current_user.nutritional_rules}
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update nutritional rules: {str(e)}",
        )


@router.get("/profile")
async def get_user_profile(
    current_user: User = Depends(get_current_active_user),
):
    """Get user profile information"""
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "is_active": current_user.is_active,
        "created_at": current_user.created_at,
        "has_preferences": bool(
            current_user.food_preferences
            or current_user.dietary_restrictions
            or current_user.ingredient_rules
            or current_user.nutritional_rules
        ),
    }


@router.delete("/preferences")
async def reset_user_preferences(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Reset all user preferences to default"""
    try:
        current_user.food_preferences = {}
        current_user.dietary_restrictions = []
        current_user.ingredient_rules = {}
        current_user.food_type_rules = {}
        current_user.nutritional_rules = {}
        current_user.scheduling_rules = {}
        current_user.dietary_rules = {}

        db.commit()
        db.refresh(current_user)

        return {"detail": "User preferences reset successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to reset preferences: {str(e)}",
        )
