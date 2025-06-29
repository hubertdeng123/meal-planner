from datetime import date


class TestCreateWeeklyMealPlan:
    """Test the create weekly meal plan endpoint."""

    def test_create_weekly_meal_plan_success(
        self, client, auth_headers, mock_meal_planning_agent
    ):
        """Test successful weekly meal plan creation."""
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
            "/api/meal-planning/weekly-plan/", json=request_data, headers=auth_headers
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

        for slot in data["meal_slots"]:
            assert slot["meal_type"] == "dinner"
            assert len(slot["recipe_suggestions"]) == 3
            assert slot["selected_recipe_index"] is None
            assert slot["selected_recipe"] is None

    def test_create_weekly_meal_plan_no_auth(self, client):
        """Test weekly meal plan creation without authentication."""
        request_data = {
            "start_date": date.today().isoformat(),
            "cooking_days": ["monday"],
            "meal_types": ["dinner"],
            "servings": 4,
        }

        response = client.post("/api/meal-planning/weekly-plan/", json=request_data)

        assert response.status_code == 401


class TestGetMealPlans:
    """Test the get meal plans endpoint."""

    def test_get_meal_plans_success(self, client, auth_headers, test_meal_plan):
        """Test successful retrieval of meal plans."""
        response = client.get("/api/meal-planning/meal-plans/", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 1
        assert data[0]["id"] == test_meal_plan.id
        assert data[0]["name"] == test_meal_plan.name

    def test_get_meal_plans_no_auth(self, client):
        """Test meal plans retrieval without authentication."""
        response = client.get("/api/meal-planning/meal-plans/")
        assert response.status_code == 401


class TestGetMealPlan:
    """Test the get specific meal plan endpoint."""

    def test_get_meal_plan_success(self, client, auth_headers, test_meal_plan):
        """Test successful retrieval of specific meal plan."""
        response = client.get(
            f"/api/meal-planning/meal-plans/{test_meal_plan.id}/", headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == test_meal_plan.id
        assert data["name"] == test_meal_plan.name
        assert data["user_id"] == test_meal_plan.user_id

    def test_get_meal_plan_not_found(self, client, auth_headers):
        """Test retrieval of non-existent meal plan."""
        response = client.get(
            "/api/meal-planning/meal-plans/999999/", headers=auth_headers
        )

        assert response.status_code == 404
        data = response.json()
        assert data["detail"] == "Meal plan not found"


class TestDeleteMealPlan:
    """Test the delete meal plan endpoint."""

    def test_delete_meal_plan_success(self, client, auth_headers, test_meal_plan):
        """Test successful meal plan deletion."""
        response = client.delete(
            f"/api/meal-planning/meal-plans/{test_meal_plan.id}/", headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["detail"] == "Meal plan deleted successfully"

        # Verify meal plan was deleted
        get_response = client.get(
            f"/api/meal-planning/meal-plans/{test_meal_plan.id}/", headers=auth_headers
        )
        assert get_response.status_code == 404

    def test_delete_meal_plan_not_found(self, client, auth_headers):
        """Test deletion of non-existent meal plan."""
        response = client.delete(
            "/api/meal-planning/meal-plans/999999/", headers=auth_headers
        )

        assert response.status_code == 404
        data = response.json()
        assert data["detail"] == "Meal plan not found"


class TestDataValidation:
    """Test data validation for meal planning endpoints."""

    def test_invalid_date_format(self, client, auth_headers):
        """Test weekly meal plan creation with invalid date format."""
        request_data = {
            "start_date": "invalid-date",
            "cooking_days": ["monday"],
            "meal_types": ["dinner"],
            "servings": 4,
        }

        response = client.post(
            "/api/meal-planning/weekly-plan/", json=request_data, headers=auth_headers
        )

        assert response.status_code == 422  # Validation error

    def test_empty_cooking_days(self, client, auth_headers):
        """Test with empty cooking days."""
        request_data = {
            "start_date": date.today().isoformat(),
            "cooking_days": [],
            "meal_types": ["dinner"],
            "servings": 4,
        }

        response = client.post(
            "/api/meal-planning/weekly-plan/", json=request_data, headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["meal_slots"]) == 0  # No cooking days = no meal slots
