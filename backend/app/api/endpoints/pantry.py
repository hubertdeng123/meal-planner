from math import ceil
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import asc, desc
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user
from app.db.database import get_db
from app.models import PantryItem as PantryItemModel
from app.models import User
from app.schemas.pantry import (
    PaginatedPantryItems,
    PantryItem,
    PantryItemCreate,
    PantryItemUpdate,
)

router = APIRouter()


@router.get("/", response_model=PaginatedPantryItems)
async def get_pantry_items(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    q: str | None = Query(default=None, min_length=1),
    sort: Literal["updated_at", "name", "expires_at"] = Query(default="updated_at"),
    order: Literal["asc", "desc"] = Query(default="desc"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    query = db.query(PantryItemModel).filter(PantryItemModel.user_id == current_user.id)

    if q:
        query = query.filter(PantryItemModel.name.ilike(f"%{q.strip()}%"))

    sort_columns = {
        "updated_at": PantryItemModel.updated_at,
        "name": PantryItemModel.name,
        "expires_at": PantryItemModel.expires_at,
    }
    sort_column = sort_columns[sort]
    if sort == "expires_at":
        sort_expr = desc(sort_column) if order == "desc" else asc(sort_column)
        query = query.order_by(sort_expr.nulls_last(), desc(PantryItemModel.updated_at))
    else:
        query = query.order_by(
            desc(sort_column) if order == "desc" else asc(sort_column)
        )

    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()

    return {
        "items": items,
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": ceil(total / page_size) if total else 0,
    }


@router.post("/items", response_model=PantryItem, status_code=status.HTTP_201_CREATED)
async def create_pantry_item(
    item_data: PantryItemCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    item = PantryItemModel(user_id=current_user.id, **item_data.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/items/{item_id}", response_model=PantryItem)
async def update_pantry_item(
    item_id: int,
    item_data: PantryItemUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    item = (
        db.query(PantryItemModel)
        .filter(
            PantryItemModel.id == item_id, PantryItemModel.user_id == current_user.id
        )
        .first()
    )
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pantry item not found",
        )

    for field, value in item_data.model_dump(exclude_unset=True).items():
        setattr(item, field, value)

    db.commit()
    db.refresh(item)
    return item


@router.delete("/items/{item_id}")
async def delete_pantry_item(
    item_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    item = (
        db.query(PantryItemModel)
        .filter(
            PantryItemModel.id == item_id, PantryItemModel.user_id == current_user.id
        )
        .first()
    )
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pantry item not found",
        )

    db.delete(item)
    db.commit()
    return {"detail": "Pantry item deleted successfully"}
