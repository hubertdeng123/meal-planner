from datetime import datetime

from pydantic import BaseModel, Field


class PantryItemBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    quantity: float | None = None
    unit: str | None = None
    category: str | None = None
    expires_at: datetime | None = None


class PantryItemCreate(PantryItemBase):
    pass


class PantryItemUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    quantity: float | None = None
    unit: str | None = None
    category: str | None = None
    expires_at: datetime | None = None


class PantryItem(PantryItemBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PaginatedPantryItems(BaseModel):
    items: list[PantryItem]
    page: int
    page_size: int
    total: int
    total_pages: int
