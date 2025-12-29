from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=["../.env"],  # Look for .env file in project root
        env_file_encoding="utf-8",
        extra="ignore",  # Ignore extra environment variables
    )

    # Database
    DATABASE_URL: str

    # JWT
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 24

    @field_validator("DATABASE_URL", "JWT_SECRET_KEY")
    @classmethod
    def validate_required_secrets(cls, v: str, info) -> str:
        """Ensure critical secrets are set from environment variables"""
        if not v or v.strip() == "":
            raise ValueError(
                f"{info.field_name} must be set in environment variables. "
                f"Please add it to your .env file."
            )
        # Warn if using obvious placeholder values
        if v in ["your-secret-key-here", "changeme", "secret", "password"]:
            raise ValueError(
                f"{info.field_name} appears to use a placeholder value. "
                f"Please set a secure value in your .env file."
            )
        return v

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
