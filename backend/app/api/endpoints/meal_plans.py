from datetime import timedelta
from math import ceil
from typing import List, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import asc, desc, func
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.api.deps import get_current_active_user
from app.models import Recipe as RecipeModel
from app.models import User
from app.models.meal_plan import MealPlan, MealPlanItem
from app.models.meal_plan import GroceryItem as GroceryItemModel
from app.models.meal_plan import GroceryList as GroceryListModel
from app.schemas.meal_plan import (
    MealPlanCreate,
    MealPlanUpdate,
    MealPlan as MealPlanSchema,
    MealPlanList,
    PaginatedMealPlans,
    MealPlanItemCreate,
    MealPlanItemUpdate,
    MealPlanItem as MealPlanItemSchema,
    MealPlanAutofillResponse,
)
from app.schemas.grocery import GroceryList as GroceryListSchema
from app.services.ingredient_service import (
    category_sort_key,
    categorize_ingredient,
    normalize_ingredient_name,
    sorted_ingredient_entries,
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


@router.get("/list", response_model=PaginatedMealPlans)
def list_meal_plans_paginated(
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=100),
    q: str | None = Query(default=None, min_length=1),
    sort: Literal["created_at", "name", "start_date"] = Query(default="created_at"),
    order: Literal["asc", "desc"] = Query(default="desc"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    query = (
        db.query(
            MealPlan,
            func.count(MealPlanItem.id).label("item_count"),
        )
        .outerjoin(MealPlanItem)
        .filter(MealPlan.user_id == current_user.id)
    )

    if q:
        query = query.filter(MealPlan.name.ilike(f"%{q.strip()}%"))

    sort_column = {
        "created_at": MealPlan.created_at,
        "name": MealPlan.name,
        "start_date": MealPlan.start_date,
    }[sort]
    query = query.group_by(MealPlan.id).order_by(
        desc(sort_column) if order == "desc" else asc(sort_column)
    )

    total = query.count()
    rows = query.offset((page - 1) * page_size).limit(page_size).all()

    return {
        "items": [
            MealPlanList(
                id=mp.id,
                name=mp.name,
                start_date=mp.start_date,
                end_date=mp.end_date,
                theme=mp.theme,
                created_at=mp.created_at,
                item_count=item_count,
            )
            for mp, item_count in rows
        ],
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": ceil(total / page_size) if total else 0,
    }


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
    proposed_start = update_data.get("start_date", meal_plan.start_date)
    proposed_end = update_data.get("end_date", meal_plan.end_date)
    if proposed_start > proposed_end:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="start_date must be on or before end_date",
        )

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


@router.post(
    "/{meal_plan_id}/autofill",
    response_model=MealPlanAutofillResponse,
)
def autofill_meal_plan_slots(
    meal_plan_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Fill open breakfast/lunch/dinner slots with the user's saved recipes."""
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

    recipes = (
        db.query(RecipeModel)
        .filter(RecipeModel.user_id == current_user.id)
        .order_by(RecipeModel.created_at.desc())
        .all()
    )
    if not recipes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Create at least one recipe before autofill.",
        )

    meal_types = ["breakfast", "lunch", "dinner"]
    existing = {(item.date, item.meal_type.lower()) for item in meal_plan.items}
    date_cursor = meal_plan.start_date
    recipe_index = 0
    created = 0

    while date_cursor <= meal_plan.end_date:
        for meal_type in meal_types:
            key = (date_cursor, meal_type)
            if key in existing:
                continue

            recipe = recipes[recipe_index % len(recipes)]
            recipe_index += 1
            db.add(
                MealPlanItem(
                    meal_plan_id=meal_plan.id,
                    date=date_cursor,
                    meal_type=meal_type,
                    servings=recipe.servings or 4,
                    recipe_id=recipe.id,
                )
            )
            created += 1
        date_cursor += timedelta(days=1)

    db.commit()
    return {
        "created_count": created,
        "message": f"Added {created} meal slot(s).",
    }


@router.post("/{meal_plan_id}/grocery-list", response_model=GroceryListSchema)
def create_grocery_list_from_meal_plan(
    meal_plan_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Create a grocery list from all recipe-linked items in a meal plan."""
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

    recipe_ids = [item.recipe_id for item in meal_plan.items if item.recipe_id]
    if not recipe_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No recipe-linked slots found in this meal plan.",
        )

    recipes = (
        db.query(RecipeModel)
        .filter(RecipeModel.id.in_(recipe_ids), RecipeModel.user_id == current_user.id)
        .all()
    )
    if not recipes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid recipes found for this meal plan.",
        )

    grocery_list = GroceryListModel(
        user_id=current_user.id,
        meal_plan_id=meal_plan.id,
        name=meal_plan.name or "Weekly meal plan list",
    )
    db.add(grocery_list)
    db.flush()

    ingredient_dict: dict[str, dict[str, str | float]] = {}
    for recipe in recipes:
        for ingredient in recipe.ingredients or []:
            raw_name = ingredient.get("name") or ""
            name = normalize_ingredient_name(raw_name)
            if not name:
                continue

            quantity = ingredient.get("quantity") or 0
            unit = (ingredient.get("unit") or "").strip().lower()
            key = (
                name
                if name not in ingredient_dict
                else (
                    name
                    if ingredient_dict[name]["unit"] == unit
                    else f"{name} ({unit})"
                )
            )

            if key in ingredient_dict:
                ingredient_dict[key]["quantity"] = float(
                    ingredient_dict[key]["quantity"]
                ) + float(quantity)
            else:
                ingredient_dict[key] = {
                    "quantity": float(quantity),
                    "unit": unit,
                    "category": categorize_ingredient(name),
                }

    for name, details in sorted_ingredient_entries(ingredient_dict):
        db.add(
            GroceryItemModel(
                grocery_list_id=grocery_list.id,
                name=name,
                quantity=details["quantity"],
                unit=details["unit"],
                category=details["category"],
            )
        )

    db.commit()
    db.refresh(grocery_list)
    sorted_items = sorted(
        grocery_list.items,
        key=lambda item: category_sort_key(item.category, item.name),
    )
    return {
        "id": grocery_list.id,
        "user_id": grocery_list.user_id,
        "meal_plan_id": grocery_list.meal_plan_id,
        "name": grocery_list.name,
        "created_at": grocery_list.created_at,
        "updated_at": grocery_list.updated_at,
        "items": [
            {
                "id": item.id,
                "grocery_list_id": item.grocery_list_id,
                "name": item.name,
                "quantity": item.quantity,
                "unit": item.unit,
                "category": item.category,
                "checked": item.checked,
            }
            for item in sorted_items
        ],
    }
