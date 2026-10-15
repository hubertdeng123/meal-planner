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


def _add_recipe(db, user, name, **fields):
    defaults = {
        "instructions": ["Step 1"],
        "ingredients": [{"name": "salt", "quantity": 1, "unit": "tsp"}],
        "servings": 2,
        "tags": [],
        "source": "test",
    }
    recipe = Recipe(user_id=user.id, name=name, **(defaults | fields))
    db.add(recipe)
    db.commit()
    db.refresh(recipe)
    return recipe


def test_recipe_response_includes_cuisine_difficulty_and_feedback(
    client, auth_headers, db, test_user
):
    recipe = _add_recipe(
        db,
        test_user,
        "Pho",
        cuisine="Vietnamese",
        difficulty="medium",
        prep_time_minutes=20,
        cook_time_minutes=None,
    )

    payload = client.get(f"/api/v1/recipes/{recipe.id}", headers=auth_headers).json()
    assert payload["cuisine"] == "Vietnamese"
    assert payload["difficulty"] == "medium"
    assert payload["total_minutes"] == 20
    assert payload["feedback"] is None

    client.post(
        f"/api/v1/recipes/{recipe.id}/feedback",
        headers=auth_headers,
        json={"liked": True, "rating": 5, "notes": "Rich broth"},
    )

    payload = client.get(f"/api/v1/recipes/{recipe.id}", headers=auth_headers).json()
    assert payload["feedback"]["rating"] == 5
    assert payload["feedback"]["notes"] == "Rich broth"

    listed = client.get("/api/v1/recipes/list", headers=auth_headers).json()
    assert listed["items"][0]["feedback"]["liked"] is True


def test_get_and_delete_feedback(client, auth_headers, test_recipe):
    url = f"/api/v1/recipes/{test_recipe.id}/feedback"

    empty = client.get(url, headers=auth_headers)
    assert empty.status_code == 200
    assert empty.json() is None

    client.post(url, headers=auth_headers, json={"liked": False, "rating": 2})
    stored = client.get(url, headers=auth_headers).json()
    assert stored["rating"] == 2
    assert stored["liked"] is False

    deleted = client.delete(url, headers=auth_headers)
    assert deleted.status_code == 204
    assert client.get(url, headers=auth_headers).json() is None
    assert client.delete(url, headers=auth_headers).status_code == 204


def test_feedback_read_is_user_scoped(client, auth_headers):
    assert (
        client.get("/api/v1/recipes/999/feedback", headers=auth_headers).status_code
        == 404
    )
    assert (
        client.delete("/api/v1/recipes/999/feedback", headers=auth_headers).status_code
        == 404
    )


def test_list_filters_by_cuisine_and_favorites(client, auth_headers, db, test_user):
    thai = _add_recipe(db, test_user, "Larb", cuisine="Thai")
    liked = _add_recipe(db, test_user, "Margherita", cuisine="Italian")
    rated = _add_recipe(db, test_user, "Cacio e Pepe", cuisine="italian")
    _add_recipe(db, test_user, "Risotto", cuisine="Italian")
    client.post(
        f"/api/v1/recipes/{liked.id}/feedback",
        headers=auth_headers,
        json={"liked": True},
    )
    client.post(
        f"/api/v1/recipes/{rated.id}/feedback",
        headers=auth_headers,
        json={"liked": False, "rating": 4},
    )
    client.post(
        f"/api/v1/recipes/{thai.id}/feedback",
        headers=auth_headers,
        json={"liked": False, "rating": 1},
    )

    italian = client.get(
        "/api/v1/recipes/list?cuisine=ITALIAN", headers=auth_headers
    ).json()
    assert italian["total"] == 3

    favorites = client.get(
        "/api/v1/recipes/list?favorites=true&sort=name&order=asc", headers=auth_headers
    ).json()
    assert [r["name"] for r in favorites["items"]] == ["Cacio e Pepe", "Margherita"]
    assert favorites["total_pages"] == 1


def test_list_sorts_by_total_minutes(client, auth_headers, db, test_user):
    _add_recipe(db, test_user, "Slow", prep_time_minutes=30, cook_time_minutes=90)
    _add_recipe(db, test_user, "Fast", prep_time_minutes=5, cook_time_minutes=5)
    _add_recipe(db, test_user, "Medium", cook_time_minutes=40)

    payload = client.get(
        "/api/v1/recipes/list?sort=total_minutes&order=asc", headers=auth_headers
    ).json()

    assert [r["name"] for r in payload["items"]] == ["Fast", "Medium", "Slow"]
    assert [r["total_minutes"] for r in payload["items"]] == [10, 40, 120]


def test_recipe_facets(client, auth_headers, db, test_user):
    _add_recipe(db, test_user, "A", cuisine="Thai", tags=["quick", "vegan"])
    _add_recipe(db, test_user, "B", cuisine="thai", tags=["quick"])
    _add_recipe(db, test_user, "C", cuisine="Italian", tags=["Quick", "dinner"])
    _add_recipe(db, test_user, "D", cuisine=None, tags=[])

    payload = client.get("/api/v1/recipes/facets", headers=auth_headers).json()

    assert payload["total"] == 4
    assert payload["cuisines"] == [
        {"value": "Thai", "count": 2},
        {"value": "Italian", "count": 1},
    ]
    assert payload["tags"][0] == {"value": "quick", "count": 3}
    assert {t["value"] for t in payload["tags"]} == {"quick", "vegan", "dinner"}


def test_delete_recipe_with_feedback(client, auth_headers, test_recipe):
    client.post(
        f"/api/v1/recipes/{test_recipe.id}/feedback",
        headers=auth_headers,
        json={"liked": True},
    )

    response = client.delete(f"/api/v1/recipes/{test_recipe.id}", headers=auth_headers)

    assert response.status_code == 200
    assert (
        client.get(
            f"/api/v1/recipes/{test_recipe.id}", headers=auth_headers
        ).status_code
        == 404
    )
