from datetime import date, timedelta

import pytest

from app.models.meal_plan import MealPlan, MealPlanItem
from app.models.recipe import Recipe


def _build_recipe(user_id: int, name: str, ingredients: list[dict]) -> Recipe:
    return Recipe(
        user_id=user_id,
        name=name,
        description=f"{name} description",
        instructions=["Step 1"],
        ingredients=ingredients,
        servings=2,
        tags=["test"],
        source="test",
    )


def test_create_grocery_list_from_meal_plan_dedupes_and_orders_items(
    client, db, test_user, auth_headers
):
    meal_plan = MealPlan(
        user_id=test_user.id,
        name="Planner",
        start_date=date.today(),
        end_date=date.today() + timedelta(days=6),
    )
    db.add(meal_plan)

    recipe_one = _build_recipe(
        test_user.id,
        "Recipe One",
        [
            {"name": "Tomatoes", "quantity": 2, "unit": "count"},
            {"name": "Milk", "quantity": 1, "unit": "cup"},
            {"name": "Salt", "quantity": 1, "unit": "tsp"},
        ],
    )
    recipe_two = _build_recipe(
        test_user.id,
        "Recipe Two",
        [
            {"name": " tomato ", "quantity": 3, "unit": "count"},
            {"name": "Chicken breasts", "quantity": 1, "unit": "lb"},
            {"name": "Olive oils", "quantity": 2, "unit": "tbsp"},
        ],
    )
    db.add_all([recipe_one, recipe_two])
    db.commit()
    db.refresh(meal_plan)
    db.refresh(recipe_one)
    db.refresh(recipe_two)

    db.add_all(
        [
            MealPlanItem(
                meal_plan_id=meal_plan.id,
                recipe_id=recipe_one.id,
                date=meal_plan.start_date,
                meal_type="dinner",
                servings=2,
            ),
            MealPlanItem(
                meal_plan_id=meal_plan.id,
                recipe_id=recipe_two.id,
                date=meal_plan.start_date + timedelta(days=1),
                meal_type="lunch",
                servings=2,
            ),
        ]
    )
    db.commit()

    response = client.post(
        f"/api/v1/meal-plans/{meal_plan.id}/grocery-list", headers=auth_headers
    )
    assert response.status_code == 200
    payload = response.json()

    items = payload["items"]
    names = [item["name"] for item in items]
    categories = [item["category"] for item in items]

    assert names == ["tomato", "chicken breast", "milk", "olive oil", "salt"]
    assert categories == ["Produce", "Meat & Seafood", "Dairy", "Pantry", "Pantry"]

    tomato_item = next(item for item in items if item["name"] == "tomato")
    assert tomato_item["quantity"] == pytest.approx(5.0)
