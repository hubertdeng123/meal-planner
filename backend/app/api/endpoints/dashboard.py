from datetime import date, datetime, timedelta, timezone
from typing import Sequence
from urllib.parse import quote

from fastapi import APIRouter, Depends
from sqlalchemy import case, func
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_active_user
from app.db.database import get_db
from app.models import (
    GroceryItem as GroceryItemModel,
    GroceryList as GroceryListModel,
    MealPlan,
    PantryItem as PantryItemModel,
    Recipe as RecipeModel,
    User,
)
from app.schemas.dashboard import (
    DashboardActionCTA,
    DashboardActionItem,
    DashboardMealSlot,
    DashboardPantryRisk,
    DashboardPantryRiskItem,
    DashboardPlanContinuity,
    DashboardRecentContext,
    DashboardRecentGroceryList,
    DashboardRecentRecipe,
    DashboardSummary,
    DashboardTodayBrief,
)

router = APIRouter()

CORE_MEAL_TYPES = ("breakfast", "lunch", "dinner")


def _select_reference_plan(
    meal_plans: Sequence[MealPlan], today: date
) -> MealPlan | None:
    current = [plan for plan in meal_plans if plan.start_date <= today <= plan.end_date]
    if current:
        return sorted(current, key=lambda plan: plan.end_date)[0]

    upcoming = [plan for plan in meal_plans if plan.start_date >= today]
    if upcoming:
        return sorted(upcoming, key=lambda plan: plan.start_date)[0]

    if meal_plans:
        return sorted(meal_plans, key=lambda plan: plan.end_date, reverse=True)[0]

    return None


def _build_plan_continuity(
    plan: MealPlan | None, today: date
) -> DashboardPlanContinuity:
    if not plan:
        return DashboardPlanContinuity(
            active_plan_id=None,
            completion_percent=0,
            open_slots=0,
            next_slots=[],
        )

    slot_dates: list[date] = []
    cursor = plan.start_date
    while cursor <= plan.end_date:
        slot_dates.append(cursor)
        cursor += timedelta(days=1)

    planned_slots = {
        (item.date, (item.meal_type or "").lower())
        for item in plan.items
        if (item.meal_type or "").lower() in CORE_MEAL_TYPES
    }
    total_slots = len(slot_dates) * len(CORE_MEAL_TYPES)
    filled_slots = len(planned_slots)
    open_slots = max(total_slots - filled_slots, 0)
    completion_percent = round((filled_slots / total_slots) * 100) if total_slots else 0

    next_slots: list[DashboardMealSlot] = []
    start_cursor = max(today, plan.start_date)
    cursor = start_cursor
    while cursor <= plan.end_date and len(next_slots) < 3:
        for meal_type in CORE_MEAL_TYPES:
            slot_key = (cursor, meal_type)
            next_slots.append(
                DashboardMealSlot(
                    date=cursor,
                    meal_type=meal_type,
                    has_recipe=slot_key in planned_slots,
                    href=f"/meal-plans/{plan.id}",
                )
            )
            if len(next_slots) == 3:
                break
        cursor += timedelta(days=1)

    return DashboardPlanContinuity(
        active_plan_id=plan.id,
        completion_percent=completion_percent,
        open_slots=open_slots,
        next_slots=next_slots,
    )


@router.get("/summary", response_model=DashboardSummary)
def get_dashboard_summary(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    today = date.today()
    now = datetime.now(timezone.utc)
    soon_cutoff = now + timedelta(days=3)

    recipes = (
        db.query(RecipeModel)
        .filter(RecipeModel.user_id == current_user.id)
        .order_by(RecipeModel.created_at.desc())
        .limit(30)
        .all()
    )

    meal_plans = (
        db.query(MealPlan)
        .options(joinedload(MealPlan.items))
        .filter(MealPlan.user_id == current_user.id)
        .order_by(MealPlan.start_date.desc())
        .limit(20)
        .all()
    )

    reference_plan = _select_reference_plan(meal_plans, today)
    plan_continuity = _build_plan_continuity(reference_plan, today)

    expiring_query = db.query(PantryItemModel).filter(
        PantryItemModel.user_id == current_user.id,
        PantryItemModel.expires_at.is_not(None),
        PantryItemModel.expires_at <= soon_cutoff,
    )
    expiring_soon_count = expiring_query.count()
    top_expiring_items = (
        expiring_query.order_by(PantryItemModel.expires_at.asc()).limit(3).all()
    )

    expiring_names = [item.name for item in top_expiring_items]
    pantry_cta = DashboardActionCTA(
        label=(
            "Generate with expiring items"
            if expiring_soon_count > 0
            else "Review pantry freshness"
        ),
        href=(
            f"/generate?use={quote(','.join(expiring_names))}"
            if expiring_names
            else "/pantry"
        ),
    )
    pantry_risk = DashboardPantryRisk(
        expiring_3d_count=expiring_soon_count,
        top_items=[
            DashboardPantryRiskItem(name=item.name, expires_at=item.expires_at)
            for item in top_expiring_items
            if item.expires_at is not None
        ],
        cta=pantry_cta,
    )

    grocery_counts = (
        db.query(
            func.count(GroceryItemModel.id).label("total"),
            func.sum(case((GroceryItemModel.checked.is_(False), 1), else_=0)).label(
                "unchecked"
            ),
        )
        .join(
            GroceryListModel,
            GroceryListModel.id == GroceryItemModel.grocery_list_id,
        )
        .filter(GroceryListModel.user_id == current_user.id)
        .one()
    )
    total_grocery_items = int(grocery_counts.total or 0)
    unchecked_grocery_items = int(grocery_counts.unchecked or 0)

    recent_grocery_list = (
        db.query(GroceryListModel)
        .options(joinedload(GroceryListModel.items))
        .filter(GroceryListModel.user_id == current_user.id)
        .order_by(GroceryListModel.updated_at.desc())
        .first()
    )
    recent_grocery_context = None
    if recent_grocery_list:
        unchecked_count = sum(
            1 for item in recent_grocery_list.items if not item.checked
        )
        recent_grocery_context = DashboardRecentGroceryList(
            id=recent_grocery_list.id,
            unchecked_count=unchecked_count,
            href=f"/grocery/{recent_grocery_list.id}",
        )

    action_queue: list[DashboardActionItem] = []
    if expiring_soon_count > 0:
        action_queue.append(
            DashboardActionItem(
                id="pantry_risk",
                title="Use ingredients before they expire",
                rationale=f"{expiring_soon_count} pantry item(s) expire within 3 days.",
                impact="high",
                cta=pantry_cta,
            )
        )

    if plan_continuity.active_plan_id and plan_continuity.open_slots > 0:
        action_queue.append(
            DashboardActionItem(
                id="plan_gap",
                title="Fill remaining meal plan slots",
                rationale=(
                    f"{plan_continuity.open_slots} open breakfast/lunch/dinner slots "
                    "are still unassigned."
                ),
                impact="high",
                cta=DashboardActionCTA(
                    label="Complete meal plan",
                    href=f"/meal-plans/{plan_continuity.active_plan_id}",
                ),
            )
        )

    if unchecked_grocery_items > 0:
        action_queue.append(
            DashboardActionItem(
                id="grocery_progress",
                title="Finish your current shopping list",
                rationale=(
                    f"{unchecked_grocery_items} of {total_grocery_items} grocery "
                    "item(s) are still unchecked."
                ),
                impact="medium",
                cta=DashboardActionCTA(
                    label="Resume shopping",
                    href=(
                        recent_grocery_context.href
                        if recent_grocery_context
                        else "/grocery"
                    ),
                ),
            )
        )

    if not recipes:
        action_queue.append(
            DashboardActionItem(
                id="first_recipe",
                title="Create your first reusable recipe",
                rationale=(
                    "Saved recipes unlock faster planning and grocery list generation."
                ),
                impact="medium",
                cta=DashboardActionCTA(
                    label="Generate first recipe",
                    href="/generate",
                ),
            )
        )

    if not action_queue:
        action_queue.append(
            DashboardActionItem(
                id="next_recipe",
                title="Generate a meal for tonight",
                rationale="You are caught up. Create something fresh in one flow.",
                impact="low",
                cta=DashboardActionCTA(
                    label="Generate recipe",
                    href="/generate",
                ),
            )
        )

    action_queue = action_queue[:3]
    first_action = action_queue[0]
    today_brief = DashboardTodayBrief(
        headline=first_action.title,
        subline=first_action.rationale,
        primary_action=first_action.cta,
    )

    return DashboardSummary(
        today_brief=today_brief,
        action_queue=action_queue,
        plan_continuity=plan_continuity,
        pantry_risk=pantry_risk,
        recent_context=DashboardRecentContext(
            recent_recipes=[
                DashboardRecentRecipe(
                    id=recipe.id,
                    name=recipe.name,
                    total_minutes=(recipe.prep_time_minutes or 0)
                    + (recipe.cook_time_minutes or 0),
                    tags=(recipe.tags or [])[:3],
                )
                for recipe in recipes[:3]
            ],
            recent_grocery_list=recent_grocery_context,
        ),
    )
