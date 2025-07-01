import logging
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.config import settings
from app.api.endpoints import auth, recipes, grocery, meal_planning, notifications
from app.services.scheduler_service import scheduler_service

# Initialize Sentry for error tracking
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

# Configure Sentry
SENTRY_DSN = os.getenv("SENTRY_DSN")
if SENTRY_DSN:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[
            FastApiIntegration(),
            SqlalchemyIntegration(),
        ],
        # Set traces_sample_rate to 1.0 to capture 100%
        # of transactions for performance monitoring.
        # We recommend adjusting this value in production.
        traces_sample_rate=0.1,
        # Set profiles_sample_rate to 1.0 to profile 100%
        # of sampled transactions.
        # We recommend adjusting this value in production.
        profiles_sample_rate=0.1,
        environment=os.getenv("ENVIRONMENT", "development"),
    )
    logging.info("Sentry initialized successfully")
else:
    logging.warning("Sentry DSN not provided, error tracking disabled")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(), logging.FileHandler("app.log")],
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("🚀 Starting Meal Assistant API...")
    logger.info("📧 Starting email notification scheduler...")
    scheduler_service.start()

    yield

    # Shutdown
    logger.info("🛑 Shutting down email notification scheduler...")
    scheduler_service.stop()
    logger.info("👋 Meal Assistant API shutdown complete")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    openapi_url=f"{settings.API_PREFIX}/openapi.json",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # React dev server
        "http://localhost:5173",  # Vite dev server
        "http://localhost:5174",  # Vite alternative port
        settings.BASE_URL,  # Frontend URL from config
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(
    auth.router, prefix=f"{settings.API_PREFIX}/auth", tags=["authentication"]
)

app.include_router(
    recipes.router, prefix=f"{settings.API_PREFIX}/recipes", tags=["recipes"]
)

app.include_router(
    grocery.router, prefix=f"{settings.API_PREFIX}/grocery", tags=["grocery"]
)

app.include_router(
    meal_planning.router,
    prefix=f"{settings.API_PREFIX}/meal-planning",
    tags=["meal-planning"],
)

app.include_router(
    notifications.router,
    prefix=f"{settings.API_PREFIX}/notifications",
    tags=["notifications"],
)


@app.get("/")
def root():
    return {"message": "Meal Assistant API", "version": settings.APP_VERSION}


@app.get("/health")
def health_check():
    return {"status": "healthy"}
