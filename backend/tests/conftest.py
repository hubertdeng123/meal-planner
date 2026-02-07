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

    # Create test app with same configuration as main app but without lifecycle events
    from fastapi import FastAPI
    from fastapi.middleware.cors import CORSMiddleware
    from app.core.config import settings
    from app.api.endpoints import (
        auth,
        dashboard,
        recipes,
        grocery,
        notifications,
        meal_plans,
        pantry,
    )

    test_app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        openapi_url=f"{settings.API_PREFIX}/openapi.json",
        # No lifespan to avoid scheduler issues in tests
    )

    # Add CORS middleware (same as main app)
    test_app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:3000",
            "http://localhost:5173",
            "http://localhost:5174",
            settings.BASE_URL,
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Include routers with exact same configuration as main app
    test_app.include_router(
        auth.router, prefix=f"{settings.API_PREFIX}/auth", tags=["authentication"]
    )
    test_app.include_router(
        recipes.router, prefix=f"{settings.API_PREFIX}/recipes", tags=["recipes"]
    )
    test_app.include_router(
        grocery.router, prefix=f"{settings.API_PREFIX}/grocery", tags=["grocery"]
    )
    test_app.include_router(
        notifications.router,
        prefix=f"{settings.API_PREFIX}/notifications",
        tags=["notifications"],
    )
    test_app.include_router(
        meal_plans.router,
        prefix=f"{settings.API_PREFIX}/meal-plans",
        tags=["meal-plans"],
    )
    test_app.include_router(
        pantry.router,
        prefix=f"{settings.API_PREFIX}/pantry",
        tags=["pantry"],
    )
    test_app.include_router(
        dashboard.router,
        prefix=f"{settings.API_PREFIX}/dashboard",
        tags=["dashboard"],
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


# Set up asyncio for pytest
@pytest_asyncio.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    policy = asyncio.get_event_loop_policy()
    loop = policy.new_event_loop()
    yield loop
    loop.close()
