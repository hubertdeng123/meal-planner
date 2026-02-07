from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel


class DashboardActionCTA(BaseModel):
    label: str
    href: str


class DashboardActionItem(BaseModel):
    id: str
    title: str
    rationale: str
    impact: Literal["high", "medium", "low"]
    cta: DashboardActionCTA


class DashboardTodayBrief(BaseModel):
    headline: str
    subline: str
    primary_action: DashboardActionCTA


class DashboardMealSlot(BaseModel):
    date: date
    meal_type: str
    has_recipe: bool
    href: str


class DashboardPlanContinuity(BaseModel):
    active_plan_id: int | None
    completion_percent: int
    open_slots: int
    next_slots: list[DashboardMealSlot]


class DashboardPantryRiskItem(BaseModel):
    name: str
    expires_at: datetime


class DashboardPantryRisk(BaseModel):
    expiring_3d_count: int
    top_items: list[DashboardPantryRiskItem]
    cta: DashboardActionCTA


class DashboardRecentRecipe(BaseModel):
    id: int
    name: str
    total_minutes: int
    tags: list[str]


class DashboardRecentGroceryList(BaseModel):
    id: int
    unchecked_count: int
    href: str


class DashboardRecentContext(BaseModel):
    recent_recipes: list[DashboardRecentRecipe]
    recent_grocery_list: DashboardRecentGroceryList | None = None


class DashboardSummary(BaseModel):
    today_brief: DashboardTodayBrief
    action_queue: list[DashboardActionItem]
    plan_continuity: DashboardPlanContinuity
    pantry_risk: DashboardPantryRisk
    recent_context: DashboardRecentContext
