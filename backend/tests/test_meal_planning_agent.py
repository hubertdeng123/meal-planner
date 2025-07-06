import pytest
from unittest.mock import patch, MagicMock
from app.agents.meal_planning_agent import MealPlanningAgent
from app.schemas.meal_plan import RecipeSuggestion
import json


class TestMealPlanningAgent:
    """Test the MealPlanningAgent class."""

    def setup_method(self):
        """Set up test fixtures."""
        self.agent = MealPlanningAgent()

    @patch("app.agents.unified_culinary_agent.Anthropic")
    @pytest.mark.asyncio
    async def test_generate_meal_suggestions_success(self, mock_anthropic):
        """Test successful meal suggestion generation."""
        # Mock the Anthropic client response
        mock_response = MagicMock()
        mock_content_block = MagicMock()
        mock_content_block.text = """[
            {
                "name": "Spaghetti Carbonara",
                "description": "Classic Italian pasta dish",
                "cuisine": "Italian",
                "ingredients": [{"name": "spaghetti", "quantity": 1, "unit": "lb"}],
                "instructions": ["Boil pasta", "Make sauce"],
                "prep_time": 10,
                "cook_time": 15,
                "servings": 4,
                "difficulty": "Medium",
                "nutrition": {"calories": 450}
            },
            {
                "name": "Chicken Tacos",
                "description": "Mexican chicken tacos",
                "cuisine": "Mexican",
                "ingredients": [{"name": "chicken", "quantity": 1, "unit": "lb"}],
                "instructions": ["Cook chicken", "Assemble tacos"],
                "prep_time": 15,
                "cook_time": 20,
                "servings": 4,
                "difficulty": "Easy",
                "nutrition": {"calories": 380}
            },
            {
                "name": "Thai Green Curry",
                "description": "Spicy Thai curry",
                "cuisine": "Thai",
                "ingredients": [{"name": "curry paste", "quantity": 2, "unit": "tbsp"}],
                "instructions": ["Make curry base", "Add vegetables"],
                "prep_time": 20,
                "cook_time": 25,
                "servings": 4,
                "difficulty": "Medium",
                "nutrition": {"calories": 420}
            }
        ]"""
        mock_response.content = [mock_content_block]

        # Create a new instance with the mocked client
        mock_client = MagicMock()
        mock_client.messages.create.return_value = mock_response
        mock_anthropic.return_value = mock_client

        # Create a fresh agent instance to pick up the mock
        agent = MealPlanningAgent()

        # Test the method
        result = await agent.generate_meal_suggestions(
            meal_type="dinner",
            date_str="Monday, January 15",
            servings=4,
            preferred_cuisines=["Italian", "Mexican"],
            dietary_restrictions=[],
            search_online=False,
        )

        assert len(result) == 3
        assert result[0].name == "Spaghetti Carbonara"
        assert isinstance(result[0], RecipeSuggestion)
        assert result[1].cuisine == "Mexican"
        assert result[2].difficulty == "Medium"

    def test_parse_recipe_suggestions_valid_json(self):
        """Test parsing valid JSON recipe suggestions."""
        json_text = """[
            {
                "name": "Test Recipe",
                "description": "A test recipe",
                "cuisine": "Test",
                "ingredients": [{"name": "test", "quantity": 1, "unit": "cup"}],
                "instructions": ["Step 1"],
                "prep_time": 10,
                "cook_time": 15,
                "servings": 4,
                "difficulty": "Easy",
                "nutrition": {"calories": 300}
            }
        ]"""

        result = self.agent._parse_recipe_suggestions(json_text)

        assert len(result) == 1
        assert result[0].name == "Test Recipe"
        assert isinstance(result[0], RecipeSuggestion)

    def test_parse_recipe_suggestions_invalid_json(self):
        """Test parsing invalid JSON."""
        invalid_json = "this is not json"
        result = self.agent._parse_recipe_suggestions(invalid_json)
        assert result == []

    def test_parse_recipe_suggestions_missing_fields(self):
        """Test parsing recipes with missing fields."""
        json_with_missing_fields = """[
            {"name": "Recipe without ingredients"},
            {"ingredients": [], "instructions": []}
        ]"""
        result = self.agent._parse_recipe_suggestions(json_with_missing_fields)
        assert len(result) == 0

    def test_validate_recipe_valid(self):
        """Test recipe validation with valid recipe."""
        valid_recipe = {
            "name": "Test Recipe",
            "description": "A test recipe",
            "cuisine": "Test",
            "ingredients": [{"name": "test", "quantity": 1, "unit": "cup"}],
            "instructions": ["Step 1"],
            "prep_time": 10,
            "cook_time": 15,
            "servings": 4,
            "difficulty": "Easy",
        }

        assert self.agent._validate_recipe(valid_recipe) is True

    def test_validate_recipe_missing_required_fields(self):
        """Test recipe validation with missing required fields."""
        invalid_recipe = {
            "name": "Test Recipe",
            # Missing other required fields
        }

        assert self.agent._validate_recipe(invalid_recipe) is False

    def test_validate_recipe_invalid_ingredients(self):
        """Test recipe validation with invalid ingredients."""
        invalid_recipe = {
            "name": "Test Recipe",
            "description": "A test recipe",
            "cuisine": "Test",
            "ingredients": "not a list",  # Should be a list
            "instructions": ["Step 1"],
            "prep_time": 10,
            "cook_time": 15,
            "servings": 4,
            "difficulty": "Easy",
        }

        assert self.agent._validate_recipe(invalid_recipe) is False

    def test_get_fallback_recipe(self):
        """Test fallback recipe generation."""
        fallback = self.agent._get_fallback_recipe("dinner", 4)

        assert isinstance(fallback, RecipeSuggestion)
        assert fallback.name is not None
        assert fallback.servings == 4

    def test_fix_recipe_missing_fields(self):
        """Test recipe fixing for various missing fields."""
        recipe_missing_fields = {"description": "A test recipe"}
        fixed = self.agent._fix_recipe(recipe_missing_fields)
        assert fixed is not None
        assert fixed["name"] == "Untitled Recipe"
        assert "ingredients" in fixed
        assert "instructions" in fixed

    def test_fix_recipe_missing_nutrition(self):
        """Test recipe fixing for missing nutrition."""
        recipe_without_nutrition = {
            "name": "Test Recipe",
            "description": "A test recipe",
            "cuisine": "Test",
            "ingredients": [{"name": "test", "quantity": 1, "unit": "cup"}],
            "instructions": ["Step 1"],
            "prep_time": 10,
            "cook_time": 15,
            "servings": 4,
            "difficulty": "Easy",
        }

        fixed = self.agent._fix_recipe(recipe_without_nutrition)

        assert fixed is not None
        assert "nutrition" in fixed
        assert "calories" in fixed["nutrition"]

    def test_generate_meal_suggestions_stream_format(self):
        """Test that streaming generation returns proper format."""
        # This is a basic test since we can't easily test the full streaming
        stream_gen = self.agent.generate_meal_suggestions_stream(
            meal_type="dinner",
            date_str="Monday, January 15",
            servings=4,
            search_online=False,
        )

        # Test that it's a generator
        assert hasattr(stream_gen, "__iter__")
        assert hasattr(stream_gen, "__next__")

    @patch("app.agents.unified_culinary_agent.Anthropic")
    @pytest.mark.asyncio
    async def test_generate_weekly_meal_plan_success(self, mock_anthropic):
        """Test successful weekly meal plan generation."""
        # Mock response for weekly plan
        mock_response = MagicMock()
        mock_content_block = MagicMock()
        mock_content_block.text = """{}"""  # Empty dict to test fallback
        mock_response.content = [mock_content_block]

        # Create a new instance with the mocked client
        mock_client = MagicMock()
        mock_client.messages.create.return_value = mock_response
        mock_anthropic.return_value = mock_client

        # Create a fresh agent instance to pick up the mock
        agent = MealPlanningAgent()

        result = await agent.generate_weekly_meal_plan(
            cooking_days=["monday", "tuesday"],
            meal_types=["dinner"],
            start_date="January 15, 2024",
            servings=4,
            search_online=False,
        )

        # Should return empty dict which triggers fallback in endpoint
        assert isinstance(result, dict)

    def test_extract_json_from_text_valid(self):
        """Test JSON extraction from text."""
        text_with_json = """
        Some text before
        ```json
        [{"key": "value", "array": [1, 2, 3]}]
        ```
        Some text after
        """

        result = self.agent._extract_json_from_text(text_with_json)

        assert result is not None
        # The result is a JSON string of a list
        data = json.loads(result)
        assert isinstance(data, list)
        assert data[0]["key"] == "value"

    def test_extract_json_from_text_no_json(self):
        """Test text with no JSON."""
        text_without_json = "This is just plain text."
        result = self.agent._extract_json_from_text(text_without_json)
        assert result is None
