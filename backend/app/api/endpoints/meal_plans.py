from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List

from app.db.database import get_db
from app.api.deps import get_current_active_user
from app.models import User
from app.models.meal_plan import MealPlan, MealPlanItem
from app.schemas.meal_plan import (
    MealPlanCreate,
    MealPlanUpdate,
    MealPlan as MealPlanSchema,
    MealPlanList,
    MealPlanItemCreate,
    MealPlanItemUpdate,
    MealPlanItem as MealPlanItemSchema,
)

router = APIRouter()


@router.get("/", response_model=List[MealPlanList])
def list_meal_plans(
    skip: int = 0,
    limit: int = 20,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """List all meal plans for the current user"""
    meal_plans = (
        db.query(
            MealPlan,
            func.count(MealPlanItem.id).label("item_count"),
        )
        .outerjoin(MealPlanItem)
        .filter(MealPlan.user_id == current_user.id)
        .group_by(MealPlan.id)
        .order_by(MealPlan.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    return [
        MealPlanList(
            id=mp.id,
            name=mp.name,
            start_date=mp.start_date,
            end_date=mp.end_date,
            theme=mp.theme,
            created_at=mp.created_at,
            item_count=item_count,
        )
        for mp, item_count in meal_plans
    ]


@router.post("/", response_model=MealPlanSchema, status_code=status.HTTP_201_CREATED)
def create_meal_plan(
    meal_plan_data: MealPlanCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Create a new meal plan"""
    meal_plan = MealPlan(
        user_id=current_user.id,
        name=meal_plan_data.name,
        start_date=meal_plan_data.start_date,
        end_date=meal_plan_data.end_date,
        description=meal_plan_data.description,
        theme=meal_plan_data.theme,
        occasion=meal_plan_data.occasion,
        budget_target=meal_plan_data.budget_target,
        prep_time_preference=meal_plan_data.prep_time_preference,
        special_notes=meal_plan_data.special_notes or {},
        week_dietary_restrictions=meal_plan_data.week_dietary_restrictions or [],
        week_food_preferences=meal_plan_data.week_food_preferences or {},
    )

    db.add(meal_plan)
    db.flush()

    # Add items if provided
    if meal_plan_data.items:
        for item_data in meal_plan_data.items:
            item = MealPlanItem(
                meal_plan_id=meal_plan.id,
                date=item_data.date,
                meal_type=item_data.meal_type,
                servings=item_data.servings,
                recipe_id=item_data.recipe_id,
                recipe_data=item_data.recipe_data,
            )
            db.add(item)

    db.commit()
    db.refresh(meal_plan)

    return meal_plan


@router.get("/{meal_plan_id}", response_model=MealPlanSchema)
def get_meal_plan(
    meal_plan_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Get a specific meal plan by ID"""
    meal_plan = (
        db.query(MealPlan)
        .filter(MealPlan.id == meal_plan_id, MealPlan.user_id == current_user.id)
        .first()
    )

    if not meal_plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meal plan not found",
        )

    return meal_plan


@router.put("/{meal_plan_id}", response_model=MealPlanSchema)
def update_meal_plan(
    meal_plan_id: int,
    meal_plan_data: MealPlanUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Update a meal plan"""
    meal_plan = (
        db.query(MealPlan)
        .filter(MealPlan.id == meal_plan_id, MealPlan.user_id == current_user.id)
        .first()
    )

    if not meal_plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meal plan not found",
        )

    update_data = meal_plan_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(meal_plan, field, value)

    db.commit()
    db.refresh(meal_plan)

    return meal_plan


@router.delete("/{meal_plan_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_meal_plan(
    meal_plan_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Delete a meal plan"""
    meal_plan = (
        db.query(MealPlan)
        .filter(MealPlan.id == meal_plan_id, MealPlan.user_id == current_user.id)
        .first()
    )

    if not meal_plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meal plan not found",
        )

    db.delete(meal_plan)
    db.commit()

    return None


# Meal Plan Item endpoints


@router.post(
    "/{meal_plan_id}/items",
    response_model=MealPlanItemSchema,
    status_code=status.HTTP_201_CREATED,
)
def add_meal_plan_item(
    meal_plan_id: int,
    item_data: MealPlanItemCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Add an item to a meal plan"""
    meal_plan = (
        db.query(MealPlan)
        .filter(MealPlan.id == meal_plan_id, MealPlan.user_id == current_user.id)
        .first()
    )

    if not meal_plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meal plan not found",
        )

    item = MealPlanItem(
        meal_plan_id=meal_plan.id,
        date=item_data.date,
        meal_type=item_data.meal_type,
        servings=item_data.servings,
        recipe_id=item_data.recipe_id,
        recipe_data=item_data.recipe_data,
    )

    db.add(item)
    db.commit()
    db.refresh(item)

    return item


@router.put("/{meal_plan_id}/items/{item_id}", response_model=MealPlanItemSchema)
def update_meal_plan_item(
    meal_plan_id: int,
    item_id: int,
    item_data: MealPlanItemUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Update a meal plan item"""
    item = (
        db.query(MealPlanItem)
        .join(MealPlan)
        .filter(
            MealPlanItem.id == item_id,
            MealPlanItem.meal_plan_id == meal_plan_id,
            MealPlan.user_id == current_user.id,
        )
        .first()
    )

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meal plan item not found",
        )

    update_data = item_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)

    db.commit()
    db.refresh(item)

    return item


@router.delete(
    "/{meal_plan_id}/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT
)
def delete_meal_plan_item(
    meal_plan_id: int,
    item_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Delete a meal plan item"""
    item = (
        db.query(MealPlanItem)
        .join(MealPlan)
        .filter(
            MealPlanItem.id == item_id,
            MealPlanItem.meal_plan_id == meal_plan_id,
            MealPlan.user_id == current_user.id,
        )
        .first()
    )

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meal plan item not found",
        )

    db.delete(item)
    db.commit()

    return None
