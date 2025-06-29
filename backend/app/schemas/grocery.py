from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class GroceryItemBase(BaseModel):
    name: str
    quantity: Optional[float] = None
    unit: Optional[str] = None
    category: Optional[str] = None
    checked: bool = False


class GroceryItemCreate(GroceryItemBase):
    pass


class GroceryItemUpdate(BaseModel):
    name: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    category: Optional[str] = None
    checked: Optional[bool] = None


class GroceryItem(GroceryItemBase):
    id: int
    grocery_list_id: int

    model_config = {"from_attributes": True}


class GroceryListBase(BaseModel):
    meal_plan_id: Optional[int] = None


class GroceryListCreate(GroceryListBase):
    pass


class GroceryListUpdate(BaseModel):
    meal_plan_id: Optional[int] = None


class GroceryList(GroceryListBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
    items: List[GroceryItem] = []

    model_config = {"from_attributes": True}
