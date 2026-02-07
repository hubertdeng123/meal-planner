from datetime import date, timedelta

from app.models.recipe import Recipe
from app.models.user import User


def test_add_feedback_without_rating(client, auth_headers, test_recipe):
    response = client.post(
        f"/api/v1/recipes/{test_recipe.id}/feedback",
        headers=auth_headers,
        json={"liked": True, "notes": "Great texture"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["recipe_id"] == test_recipe.id
    assert payload["liked"] is True
    assert payload["rating"] is None
    assert payload["notes"] == "Great texture"


def test_add_feedback_is_user_scoped(client, auth_headers, db, test_user):
    from app.core.security import get_password_hash

    other_user = User(
        email="other@example.com",
        username="other",
        hashed_password=get_password_hash("testpassword"),
    )
    db.add(other_user)
    db.commit()
    db.refresh(other_user)

    other_recipe = Recipe(
        user_id=other_user.id,
        name="Private Recipe",
        instructions=["Step 1"],
        ingredients=[{"name": "salt", "quantity": 1, "unit": "tsp"}],
        servings=2,
        tags=[],
        source="test",
    )
    db.add(other_recipe)
    db.commit()
    db.refresh(other_recipe)

    response = client.post(
        f"/api/v1/recipes/{other_recipe.id}/feedback",
        headers=auth_headers,
        json={"liked": False, "rating": 2},
    )
    assert response.status_code == 404


def test_upsert_feedback_updates_existing(client, auth_headers, test_recipe):
    first = client.post(
        f"/api/v1/recipes/{test_recipe.id}/feedback",
        headers=auth_headers,
        json={"liked": True, "rating": 5, "notes": "Initial"},
    )
    assert first.status_code == 200

    second = client.post(
        f"/api/v1/recipes/{test_recipe.id}/feedback",
        headers=auth_headers,
        json={"liked": False, "rating": 3, "notes": "Updated"},
    )
    assert second.status_code == 200
    payload = second.json()
    assert payload["liked"] is False
    assert payload["rating"] == 3
    assert payload["notes"] == "Updated"


def test_paginated_recipe_list_endpoint(client, auth_headers, db, test_user):
    for idx in range(15):
        db.add(
            Recipe(
                user_id=test_user.id,
                name=f"Recipe {idx}",
                instructions=["Step 1"],
                ingredients=[{"name": "salt", "quantity": 1, "unit": "tsp"}],
                servings=2,
                tags=["quick"] if idx % 2 == 0 else ["dinner"],
                source="test",
            )
        )
    db.commit()

    response = client.get(
        "/api/v1/recipes/list?page=1&page_size=10&q=Recipe&tags=quick",
        headers=auth_headers,
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["page"] == 1
    assert payload["page_size"] == 10
    assert payload["total"] == 8
    assert len(payload["items"]) == 8
    assert isinstance(payload["items"], list)
    assert all("quick" in recipe["tags"] for recipe in payload["items"])


def test_paginated_recipe_list_filters_multiple_tags(
    client, auth_headers, db, test_user
):
    recipes = [
        ("Quick Vegan Bowl", ["quick", "vegan"]),
        ("Quick Vegan Curry", ["quick", "vegan", "dinner"]),
        ("Quick Pasta", ["quick", "dinner"]),
        ("Vegan Soup", ["vegan", "lunch"]),
    ]
    for name, tags in recipes:
        db.add(
            Recipe(
                user_id=test_user.id,
                name=name,
                instructions=["Step 1"],
                ingredients=[{"name": "salt", "quantity": 1, "unit": "tsp"}],
                servings=2,
                tags=tags,
                source="test",
            )
        )
    db.commit()

    response = client.get(
        "/api/v1/recipes/list?page=1&page_size=10&tags=quick&tags=vegan",
        headers=auth_headers,
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["total"] == 2
    assert len(payload["items"]) == 2
    assert all(
        "quick" in recipe["tags"] and "vegan" in recipe["tags"]
        for recipe in payload["items"]
    )


def test_meal_plan_autofill_and_grocery_generation(
    client, auth_headers, db, test_user, test_recipe
):
    response = client.post(
        "/api/v1/meal-plans/",
        headers=auth_headers,
        json={
            "name": "Week Plan",
            "start_date": str(date.today()),
            "end_date": str(date.today() + timedelta(days=6)),
        },
    )
    assert response.status_code == 201
    meal_plan_id = response.json()["id"]

    autofill = client.post(
        f"/api/v1/meal-plans/{meal_plan_id}/autofill",
        headers=auth_headers,
    )
    assert autofill.status_code == 200
    autofill_data = autofill.json()
    assert autofill_data["created_count"] > 0

    grocery = client.post(
        f"/api/v1/meal-plans/{meal_plan_id}/grocery-list",
        headers=auth_headers,
    )
    assert grocery.status_code == 200
    grocery_data = grocery.json()
    assert grocery_data["meal_plan_id"] == meal_plan_id
    assert isinstance(grocery_data["items"], list)
