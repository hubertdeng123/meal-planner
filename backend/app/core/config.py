from typing import Literal

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
    JWT_EXPIRATION_HOURS: int = 720  # 30 days

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

    # Deployment environment; production disables the offline demo LLM fallback.
    ENVIRONMENT: str = "development"

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.strip().lower() in {"production", "prod"}

    # LLM provider. "auto" prefers Grok, then Together, then (outside production) "demo",
    # an offline scripted model for local development and tests.
    LLM_PROVIDER: Literal["auto", "grok", "together", "demo"] = "auto"

    # Together AI LLM configuration
    TOGETHER_API_KEY: str = ""
    TOGETHER_MODEL: str = "moonshotai/Kimi-K2.5"
    TOGETHER_BASE_URL: str = "https://api.together.xyz/v1"

    # xAI Grok LLM configuration (preferred when GROK_API_KEY is set)
    GROK_API_KEY: str = ""
    GROK_MODEL: str = "grok-4-1-fast-reasoning"
    GROK_BASE_URL: str = "https://api.x.ai/v1"

    RECIPE_MAX_TOKENS: int = 8192
    RECIPE_TEMPERATURE: float = 0.2
    RECIPE_STREAM_MAX_ATTEMPTS: int = 1
    RECIPE_GENERATION_TIMEOUT_SECONDS: float = 120.0
    RECIPE_STREAM_PING_SECONDS: float = 15.0
    RECIPE_STREAM_DRAFT_INTERVAL_SECONDS: float = 0.1
    # Multiplier for the demo model's artificial delays (0 makes it instant).
    DEMO_LLM_DELAY_SCALE: float = 1.0

    # Email settings
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_USE_TLS: bool = True
    FROM_EMAIL: str = "noreply@hungry-helper.com"
    FROM_NAME: str = "Hungry Helper"

    # App settings
    APP_NAME: str = "Hungry Helper"
    APP_VERSION: str = "1.0.0"
    API_PREFIX: str = "/api/v1"
    BASE_URL: str = "http://localhost:3000"  # Frontend URL for email links


settings = Settings()
