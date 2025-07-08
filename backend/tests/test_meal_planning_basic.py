from datetime import date
import pytest
from app.schemas.meal_plan import RecipeSuggestion


@pytest.fixture(autouse=True)
def clear_meal_planning_cache():
    """Clear the meal planning duplicate request cache before each test to ensure test isolation."""
    from app.api.endpoints.meal_planning import _recent_meal_plan_requests
    _recent_meal_plan_requests.clear()
    yield
    # Optionally clear after test too
    _recent_meal_plan_requests.clear()


def test_create_weekly_meal_plan_success(
    client, auth_headers, mock_meal_planning_agent
):
    """Test successful weekly meal plan creation."""
    # Mock the agent's response
    mock_suggestions = [
        RecipeSuggestion(
            name="Spaghetti Carbonara",
            description="Classic Italian pasta dish",
            cuisine="Italian",
            ingredients=[{"name": "spaghetti", "quantity": 1, "unit": "lb"}],
            instructions=["Boil pasta", "Make sauce"],
            prep_time=10,
            cook_time=15,
            servings=4,
            difficulty="Medium",
            nutrition={"calories": 450},
        )
    ] * 3
    mock_meal_planning_agent.generate_weekly_meal_plan.return_value = {
        "monday_dinner": mock_suggestions,
        "wednesday_dinner": mock_suggestions,
        "friday_dinner": mock_suggestions,
    }

    request_data = {
        "start_date": date.today().isoformat(),
        "cooking_days": ["monday", "wednesday", "friday"],
        "meal_types": ["dinner"],
        "servings": 4,
        "dietary_restrictions": [],
        "preferred_cuisines": ["Italian", "Mexican"],
        "must_include_ingredients": [],
        "must_avoid_ingredients": [],
    }

    response = client.post(
        "/api/v1/meal-planning/weekly-plan/", json=request_data, headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()

    # Verify response structure
    assert "id" in data
    assert "user_id" in data
    assert "name" in data
    assert "start_date" in data
    assert "end_date" in data
    assert "meal_slots" in data

    # Verify meal slots were created
    assert len(data["meal_slots"]) == 3  # 3 cooking days * 1 meal type


def test_get_meal_plans_success(client, auth_headers, test_meal_plan):
    """Test successful retrieval of meal plans."""
    response = client.get("/api/v1/meal-planning/meal-plans/", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 1
    assert data[0]["id"] == test_meal_plan.id


# def test_delete_meal_plan_success(client, auth_headers, test_meal_plan):
#     """Test successful meal plan deletion."""
#     response = client.delete(
#         f"/api/v1/meal-planning/meal-plans/{test_meal_plan.id}/", headers=auth_headers
#     )

#     assert response.status_code == 200
#     data = response.json()
#     assert data["detail"] == "Meal plan deleted successfully"
