from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=["../.env"],  # Look for .env file in project root
        env_file_encoding="utf-8",
        extra="ignore",  # Ignore extra environment variables
    )

    # Database
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/meal_planner"

    # JWT
    JWT_SECRET_KEY: str = "your-secret-key-here"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 24

    # Anthropic Claude
    ANTHROPIC_API_KEY: str = ""

    # Email settings
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_USE_TLS: bool = True
    FROM_EMAIL: str = "noreply@mealassistant.com"
    FROM_NAME: str = "Hungry Helper"

    # App settings
    APP_NAME: str = "Hungry Helper"
    APP_VERSION: str = "1.0.0"
    API_PREFIX: str = "/api/v1"
    BASE_URL: str = "http://localhost:3000"  # Frontend URL for email links


settings = Settings()

# Recipe web search configuration
RECIPE_WEB_SEARCH_ALLOWED_DOMAINS = [
    "foodnetwork.com",
    "food.com",
    "tasteofhome.com",
    "delish.com",
    "cookinglight.com",
    "budgetbytes.com",
    "americastestkitchen.com",
    "thewoksoflife.com",
    "maangchi.com",
]
