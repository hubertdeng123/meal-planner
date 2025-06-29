import pytest
import asyncio
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import pytest_asyncio

from app.db.database import Base, get_db
from app.core.security import create_access_token
from app.models.user import User
from app.models.recipe import Recipe
from app.models.meal_plan import MealPlan, MealPlanItem
from datetime import timedelta, date

# Use in-memory SQLite for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture
def db():
    """Create a fresh database for each test."""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client(db):
    """Create a test client with database dependency override."""

    def override_get_db():
        try:
            yield db
        finally:
            pass

    # Create a minimal test app without scheduler issues
    from fastapi import FastAPI
    from app.api.endpoints import meal_planning, auth, recipes, grocery, notifications

    test_app = FastAPI(title="Test Meal Planner API")
    test_app.include_router(
        meal_planning.router, prefix="/api/meal-planning", tags=["meal-planning"]
    )
    test_app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
    test_app.include_router(recipes.router, prefix="/api/recipes", tags=["recipes"])
    test_app.include_router(grocery.router, prefix="/api/grocery", tags=["grocery"])
    test_app.include_router(
        notifications.router, prefix="/api/notifications", tags=["notifications"]
    )

    test_app.dependency_overrides[get_db] = override_get_db

    with TestClient(test_app) as c:
        yield c
    test_app.dependency_overrides.clear()


@pytest.fixture
def test_user(db):
    """Create a test user."""
    from app.core.security import get_password_hash

    user = User(
        email="test@example.com",
        username="testuser",
        hashed_password=get_password_hash("testpassword"),
        is_active=True,
        dietary_restrictions=[],
        email_notifications_enabled=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def auth_headers(test_user):
    """Create authentication headers for test user."""
    access_token = create_access_token(
        data={"sub": str(test_user.id)}, expires_delta=timedelta(minutes=30)
    )
    return {"Authorization": f"Bearer {access_token}"}


@pytest.fixture
def test_recipe(db, test_user):
    """Create a test recipe."""
    recipe = Recipe(
        user_id=test_user.id,
        name="Test Recipe",
        description="A test recipe",
        instructions=["Step 1", "Step 2"],
        ingredients=[
            {"name": "ingredient1", "quantity": 1, "unit": "cup"},
            {"name": "ingredient2", "quantity": 2, "unit": "tbsp"},
        ],
        prep_time_minutes=15,
        cook_time_minutes=30,
        servings=4,
        tags=["easy", "healthy"],
        source="test",
        calories=300,
        protein_g=20,
        carbs_g=30,
        fat_g=10,
    )
    db.add(recipe)
    db.commit()
    db.refresh(recipe)
    return recipe


@pytest.fixture
def test_meal_plan(db, test_user):
    """Create a test meal plan."""
    meal_plan = MealPlan(
        user_id=test_user.id,
        name="Test Meal Plan",
        start_date=date.today(),
        end_date=date.today() + timedelta(days=6),
    )
    db.add(meal_plan)
    db.commit()
    db.refresh(meal_plan)
    return meal_plan


@pytest.fixture
def test_meal_plan_item(db, test_meal_plan, test_recipe):
    """Create a test meal plan item."""
    item = MealPlanItem(
        meal_plan_id=test_meal_plan.id,
        recipe_id=test_recipe.id,
        date=date.today(),
        meal_type="dinner",
        servings=4,
        recipe_data={"selected_recipe_index": 0},
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@pytest.fixture
def mock_meal_planning_agent(monkeypatch):
    """Mock the Anthropic client used by the meal planning agent."""
    from unittest.mock import MagicMock

    # Create mock response object
    mock_response = MagicMock()
    mock_content_block = MagicMock()
    mock_content_block.text = """[
        {
            "name": "Mock Recipe 1",
            "description": "A mock recipe",
            "cuisine": "Italian",
            "ingredients": [{"name": "pasta", "quantity": 1, "unit": "lb"}],
            "instructions": ["Cook pasta"],
            "prep_time": 10,
            "cook_time": 15,
            "servings": 4,
            "difficulty": "Easy",
            "nutrition": {"calories": 400}
        },
        {
            "name": "Mock Recipe 2",
            "description": "Another mock recipe",
            "cuisine": "Mexican",
            "ingredients": [{"name": "beans", "quantity": 1, "unit": "can"}],
            "instructions": ["Heat beans"],
            "prep_time": 5,
            "cook_time": 10,
            "servings": 4,
            "difficulty": "Easy",
            "nutrition": {"calories": 300}
        },
        {
            "name": "Mock Recipe 3",
            "description": "Third mock recipe",
            "cuisine": "Asian",
            "ingredients": [{"name": "rice", "quantity": 1, "unit": "cup"}],
            "instructions": ["Cook rice"],
            "prep_time": 5,
            "cook_time": 20,
            "servings": 4,
            "difficulty": "Easy",
            "nutrition": {"calories": 350}
        }
    ]"""
    mock_response.content = [mock_content_block]

    # Mock the Anthropic client
    mock_client = MagicMock()
    mock_client.messages.create.return_value = mock_response

    # Create a mock stream context manager for streaming tests
    mock_stream_context = MagicMock()
    mock_stream_context.__enter__ = MagicMock(return_value=mock_stream_context)
    mock_stream_context.__exit__ = MagicMock(return_value=None)

    # Mock stream chunks
    class MockChunk:
        def __init__(self, chunk_type, text=None, content_type=None):
            self.type = chunk_type
            if text:
                self.delta = MagicMock()
                self.delta.text = text
            if content_type:
                self.content_block = MagicMock()
                self.content_block.type = content_type

    # Mock the stream iterator
    mock_chunks = [
        MockChunk("content_block_start", content_type="text"),
        MockChunk(
            "content_block_delta",
            text='[{"name": "Mock Stream Recipe 1", "cuisine": "Italian"}]',
        ),
        MockChunk("content_block_stop"),
    ]
    mock_stream_context.__iter__ = lambda self: iter(mock_chunks)

    mock_client.messages.stream.return_value = mock_stream_context

    # Patch the Anthropic client in the agent
    def mock_client_property(self):
        return mock_client

    # Monkey patch the client property
    from app.agents.meal_planning_agent import MealPlanningAgent

    monkeypatch.setattr(MealPlanningAgent, "client", property(mock_client_property))

    return mock_client


# Set up asyncio for pytest
@pytest_asyncio.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    policy = asyncio.get_event_loop_policy()
    loop = policy.new_event_loop()
    yield loop
    loop.close()
