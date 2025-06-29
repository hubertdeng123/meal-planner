import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.config import settings
from app.api.endpoints import auth, recipes, grocery, meal_planning, notifications
from app.services.scheduler_service import scheduler_service

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
