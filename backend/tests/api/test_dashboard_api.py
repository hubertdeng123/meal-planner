from datetime import date, datetime, timedelta, timezone


def test_dashboard_summary_returns_ranked_actions(client, auth_headers, test_recipe):
    today = date.today()

    meal_plan_response = client.post(
        "/api/v1/meal-plans/",
        headers=auth_headers,
        json={
            "name": "This Week",
            "start_date": str(today),
            "end_date": str(today + timedelta(days=2)),
        },
    )
    assert meal_plan_response.status_code == 201
    meal_plan_id = meal_plan_response.json()["id"]

    add_item_response = client.post(
        f"/api/v1/meal-plans/{meal_plan_id}/items",
        headers=auth_headers,
        json={
            "date": str(today),
            "meal_type": "dinner",
            "servings": 2,
            "recipe_id": test_recipe.id,
        },
    )
    assert add_item_response.status_code == 201

    pantry_response = client.post(
        "/api/v1/pantry/items",
        headers=auth_headers,
        json={
            "name": "Spinach",
            "quantity": 1,
            "unit": "bag",
            "category": "Produce",
            "expires_at": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
        },
    )
    assert pantry_response.status_code == 201

    grocery_response = client.post("/api/v1/grocery/", headers=auth_headers, json={})
    assert grocery_response.status_code == 200
    grocery_id = grocery_response.json()["id"]

    add_grocery_item = client.post(
        f"/api/v1/grocery/{grocery_id}/items",
        headers=auth_headers,
        json={"name": "Milk", "quantity": 1, "unit": "carton", "category": "Dairy"},
    )
    assert add_grocery_item.status_code == 200

    summary_response = client.get("/api/v1/dashboard/summary", headers=auth_headers)
    assert summary_response.status_code == 200
    payload = summary_response.json()

    assert payload["today_brief"]["headline"]
    assert payload["today_brief"]["primary_action"]["href"].startswith("/")
    assert len(payload["action_queue"]) <= 3
    assert payload["action_queue"][0]["id"] == "pantry_risk"
    assert payload["plan_continuity"]["active_plan_id"] == meal_plan_id
    assert payload["plan_continuity"]["open_slots"] > 0
    assert payload["pantry_risk"]["expiring_3d_count"] >= 1
    assert payload["recent_context"]["recent_recipes"][0]["id"] == test_recipe.id


def test_dashboard_summary_empty_state_has_useful_default(client, auth_headers):
    summary_response = client.get("/api/v1/dashboard/summary", headers=auth_headers)
    assert summary_response.status_code == 200
    payload = summary_response.json()

    assert payload["action_queue"][0]["id"] == "first_recipe"
    assert payload["action_queue"][0]["cta"]["href"] == "/generate"
    assert payload["pantry_risk"]["expiring_3d_count"] == 0
    assert payload["plan_continuity"]["active_plan_id"] is None
