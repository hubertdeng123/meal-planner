from math import ceil
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import asc, desc
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.api.deps import get_current_active_user
from app.models import (
    User,
    GroceryList as GroceryListModel,
    GroceryItem as GroceryItemModel,
    Recipe as RecipeModel,
)
from app.schemas.grocery import (
    GroceryList,
    GroceryListCreate,
    GroceryItem,
    GroceryItemCreate,
    GroceryItemUpdate,
    PaginatedGroceryLists,
)

router = APIRouter()


@router.post("/", response_model=GroceryList)
async def create_grocery_list(
    grocery_list: GroceryListCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Create a new grocery list"""
    db_grocery_list = GroceryListModel(
        user_id=current_user.id, meal_plan_id=grocery_list.meal_plan_id
    )

    db.add(db_grocery_list)
    db.commit()
    db.refresh(db_grocery_list)

    return _format_grocery_list_response(db_grocery_list)


@router.get("/", response_model=list[GroceryList])
async def get_grocery_lists(
    skip: int = 0,
    limit: int = 20,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Get user's grocery lists"""
    grocery_lists = (
        db.query(GroceryListModel)
        .filter(GroceryListModel.user_id == current_user.id)
        .offset(skip)
        .limit(limit)
        .all()
    )

    return [_format_grocery_list_response(gl) for gl in grocery_lists]


@router.get("/list", response_model=PaginatedGroceryLists)
async def get_grocery_lists_paginated(
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=100),
    q: str | None = Query(default=None, min_length=1),
    sort: Literal["created_at", "name"] = Query(default="created_at"),
    order: Literal["asc", "desc"] = Query(default="desc"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Get user's grocery lists with pagination and optional search."""
    query = db.query(GroceryListModel).filter(
        GroceryListModel.user_id == current_user.id
    )

    if q:
        query = query.filter(GroceryListModel.name.ilike(f"%{q.strip()}%"))

    sort_column = (
        GroceryListModel.created_at if sort == "created_at" else GroceryListModel.name
    )
    query = query.order_by(desc(sort_column) if order == "desc" else asc(sort_column))

    total = query.count()
    grocery_lists = query.offset((page - 1) * page_size).limit(page_size).all()

    return {
        "items": [_format_grocery_list_response(gl) for gl in grocery_lists],
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": ceil(total / page_size) if total else 0,
    }


@router.get("/{grocery_list_id}", response_model=GroceryList)
async def get_grocery_list(
    grocery_list_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Get a specific grocery list"""
    grocery_list = (
        db.query(GroceryListModel)
        .filter(
            GroceryListModel.id == grocery_list_id,
            GroceryListModel.user_id == current_user.id,
        )
        .first()
    )

    if not grocery_list:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Grocery list not found"
        )

    return _format_grocery_list_response(grocery_list)


@router.delete("/{grocery_list_id}")
async def delete_grocery_list(
    grocery_list_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Delete a grocery list"""
    grocery_list = (
        db.query(GroceryListModel)
        .filter(
            GroceryListModel.id == grocery_list_id,
            GroceryListModel.user_id == current_user.id,
        )
        .first()
    )

    if not grocery_list:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Grocery list not found"
        )

    db.delete(grocery_list)
    db.commit()

    return {"detail": "Grocery list deleted successfully"}


@router.post("/{grocery_list_id}/items", response_model=GroceryItem)
async def add_grocery_item(
    grocery_list_id: int,
    item: GroceryItemCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Add an item to a grocery list"""
    grocery_list = (
        db.query(GroceryListModel)
        .filter(
            GroceryListModel.id == grocery_list_id,
            GroceryListModel.user_id == current_user.id,
        )
        .first()
    )

    if not grocery_list:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Grocery list not found"
        )

    db_item = GroceryItemModel(
        grocery_list_id=grocery_list_id,
        name=item.name,
        quantity=item.quantity,
        unit=item.unit,
        category=item.category,
    )

    db.add(db_item)
    db.commit()
    db.refresh(db_item)

    return _format_grocery_item_response(db_item)


@router.put("/{grocery_list_id}/items/{item_id}", response_model=GroceryItem)
async def update_grocery_item(
    grocery_list_id: int,
    item_id: int,
    item_update: GroceryItemUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Update a grocery item"""
    grocery_list = (
        db.query(GroceryListModel)
        .filter(
            GroceryListModel.id == grocery_list_id,
            GroceryListModel.user_id == current_user.id,
        )
        .first()
    )

    if not grocery_list:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Grocery list not found"
        )

    item = (
        db.query(GroceryItemModel)
        .filter(
            GroceryItemModel.id == item_id,
            GroceryItemModel.grocery_list_id == grocery_list_id,
        )
        .first()
    )

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Grocery item not found"
        )

    update_data = item_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)

    db.commit()
    db.refresh(item)

    return _format_grocery_item_response(item)


@router.delete("/{grocery_list_id}/items/{item_id}")
async def delete_grocery_item(
    grocery_list_id: int,
    item_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Delete a grocery item"""
    grocery_list = (
        db.query(GroceryListModel)
        .filter(
            GroceryListModel.id == grocery_list_id,
            GroceryListModel.user_id == current_user.id,
        )
        .first()
    )

    if not grocery_list:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Grocery list not found"
        )

    item = (
        db.query(GroceryItemModel)
        .filter(
            GroceryItemModel.id == item_id,
            GroceryItemModel.grocery_list_id == grocery_list_id,
        )
        .first()
    )

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Grocery item not found"
        )

    db.delete(item)
    db.commit()

    return {"detail": "Grocery item deleted successfully"}


@router.post("/from-recipes/", response_model=GroceryList)
async def create_grocery_list_from_recipes(
    recipe_ids: list[int],
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Create a grocery list from selected recipes"""
    recipes = (
        db.query(RecipeModel)
        .filter(RecipeModel.id.in_(recipe_ids), RecipeModel.user_id == current_user.id)
        .all()
    )

    if len(recipes) != len(recipe_ids):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="One or more recipes not found",
        )

    # Generate name from recipe names
    recipe_names = [r.name for r in recipes[:3]]
    if len(recipes) > 3:
        name = f"{', '.join(recipe_names[:2])} & {len(recipes) - 2} more"
    else:
        name = ", ".join(recipe_names)

    db_grocery_list = GroceryListModel(user_id=current_user.id, name=name)

    db.add(db_grocery_list)
    db.commit()
    db.refresh(db_grocery_list)

    ingredient_dict = {}

    for recipe in recipes:
        for ingredient in recipe.ingredients:
            name = ingredient["name"].lower()
            quantity = ingredient.get("quantity", 0)
            unit = ingredient.get("unit", "")

            if name in ingredient_dict:
                if ingredient_dict[name]["unit"] == unit:
                    ingredient_dict[name]["quantity"] += quantity
                else:
                    name_with_unit = f"{name} ({unit})"
                    ingredient_dict[name_with_unit] = {
                        "quantity": quantity,
                        "unit": unit,
                        "category": _categorize_ingredient(name),
                    }
            else:
                ingredient_dict[name] = {
                    "quantity": quantity,
                    "unit": unit,
                    "category": _categorize_ingredient(name),
                }

    for name, details in ingredient_dict.items():
        db_item = GroceryItemModel(
            grocery_list_id=db_grocery_list.id,
            name=name,
            quantity=details["quantity"],
            unit=details["unit"],
            category=details["category"],
        )
        db.add(db_item)

    db.commit()
    db.refresh(db_grocery_list)

    return _format_grocery_list_response(db_grocery_list)


def _categorize_ingredient(ingredient_name: str) -> str:
    """Categorize ingredient by name"""
    ingredient_name = ingredient_name.lower()

    produce = [
        "tomato",
        "onion",
        "garlic",
        "potato",
        "carrot",
        "bell pepper",
        "mushroom",
        "spinach",
        "lettuce",
        "cucumber",
        "avocado",
        "lemon",
        "lime",
        "parsley",
        "basil",
        "cilantro",
        "ginger",
        "apple",
        "banana",
    ]
    dairy = [
        "milk",
        "cheese",
        "butter",
        "cream",
        "yogurt",
        "egg",
        "mozzarella",
        "parmesan",
    ]
    meat = [
        "chicken",
        "beef",
        "pork",
        "fish",
        "salmon",
        "shrimp",
        "turkey",
        "bacon",
        "sausage",
    ]
    pantry = [
        "rice",
        "pasta",
        "flour",
        "sugar",
        "salt",
        "pepper",
        "oil",
        "vinegar",
        "soy sauce",
        "olive oil",
        "bread",
        "beans",
        "lentils",
    ]

    for item in produce:
        if item in ingredient_name:
            return "Produce"
    for item in dairy:
        if item in ingredient_name:
            return "Dairy"
    for item in meat:
        if item in ingredient_name:
            return "Meat & Seafood"
    for item in pantry:
        if item in ingredient_name:
            return "Pantry"

    return "Other"


def _format_grocery_list_response(grocery_list: GroceryListModel) -> dict:
    """Format grocery list model to response schema"""
    return {
        "id": grocery_list.id,
        "user_id": grocery_list.user_id,
        "meal_plan_id": grocery_list.meal_plan_id,
        "name": grocery_list.name,
        "created_at": grocery_list.created_at,
        "updated_at": grocery_list.updated_at,
        "items": [_format_grocery_item_response(item) for item in grocery_list.items],
    }


def _format_grocery_item_response(item: GroceryItemModel) -> dict:
    """Format grocery item model to response schema"""
    return {
        "id": item.id,
        "grocery_list_id": item.grocery_list_id,
        "name": item.name,
        "quantity": item.quantity,
        "unit": item.unit,
        "category": item.category,
        "checked": item.checked,
    }
