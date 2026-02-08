import logging
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.core.rate_limit import limiter
from contextlib import asynccontextmanager
from app.core.config import settings
from app.api.endpoints import (
    auth,
    dashboard,
    recipes,
    grocery,
    notifications,
    users,
    meal_plans,
    pantry,
)
from app.services.scheduler_service import scheduler_service
from app.agents.pydantic_recipe_agent import provider_name, model_name
from braintrust import init_logger
from braintrust.otel import BraintrustSpanProcessor
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from pydantic_ai.agent import Agent

# Initialize Sentry for error tracking
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration


init_logger(project="Hungry Helper")

# Set up tracing for the agent to automatically log to Braintrust
provider = TracerProvider()
trace.set_tracer_provider(provider)

provider.add_span_processor(BraintrustSpanProcessor())

Agent.instrument_all()

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

ALLOWED_ORIGINS = [
    "http://localhost:3000",  # React dev server
    "http://localhost:5173",  # Vite dev server
    "http://localhost:5174",  # Vite alternative port
    "http://127.0.0.1:3000",  # React dev server (loopback IP)
    "http://127.0.0.1:5173",  # Vite dev server (loopback IP)
    "http://127.0.0.1:5174",  # Vite alternative port (loopback IP)
    settings.BASE_URL,  # Frontend URL from config
]


def rate_limit_exceeded_handler(request, exc):
    """Attach CORS headers for rate-limit responses so browsers can read 429 details."""
    response = _rate_limit_exceeded_handler(request, exc)
    origin = request.headers.get("origin")
    if origin and origin in ALLOWED_ORIGINS:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Vary"] = "Origin"
    return response


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("🚀 Starting Hungry Helper API...")
    logger.info("📧 Starting email notification scheduler...")
    scheduler_service.start()

    yield

    # Shutdown
    logger.info("🛑 Shutting down email notification scheduler...")
    scheduler_service.stop()
    logger.info("👋 Hungry Helper API shutdown complete")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    openapi_url=f"{settings.API_PREFIX}/openapi.json",
    lifespan=lifespan,
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=[
        "Authorization",
        "Content-Type",
        "Accept",
        "Origin",
        "X-Requested-With",
    ],
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
    notifications.router,
    prefix=f"{settings.API_PREFIX}/notifications",
    tags=["notifications"],
)

app.include_router(
    users.router,
    prefix=f"{settings.API_PREFIX}/users",
    tags=["users"],
)

app.include_router(
    meal_plans.router,
    prefix=f"{settings.API_PREFIX}/meal-plans",
    tags=["meal-plans"],
)

app.include_router(
    pantry.router,
    prefix=f"{settings.API_PREFIX}/pantry",
    tags=["pantry"],
)

app.include_router(
    dashboard.router,
    prefix=f"{settings.API_PREFIX}/dashboard",
    tags=["dashboard"],
)


@app.get("/")
def root():
    return {"message": "Hungry Helper API", "version": settings.APP_VERSION}


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "llm_provider": provider_name,
        "llm_model": model_name,
    }
