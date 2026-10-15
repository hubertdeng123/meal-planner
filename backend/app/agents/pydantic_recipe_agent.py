import logging
from functools import lru_cache
from typing import Literal, TypedDict

from pydantic_ai import Agent, ToolOutput
from pydantic_ai.models import Model
from pydantic_ai.models.openai import OpenAIChatModel
from pydantic_ai.providers.openai import OpenAIProvider
from app.core.config import settings
from app.schemas.llm_response import RecipeLLM
from app.agents.demo_model import DEMO_MODEL_NAME, build_demo_model
from app.agents.recipe_deps import RecipeAgentDeps

logger = logging.getLogger(__name__)

OUTPUT_TOOL_NAME = "final_recipe"

SYSTEM_PROMPT = """You are a professional chef and nutritionist. Generate detailed, delicious recipes.

The user's preferences, history, and dietary needs are included in the request. Use this information to create personalized recipes.

UNIQUENESS (CRITICAL):
- NEVER repeat a recipe the user already has - check the "AVOID these existing recipes" list carefully
- Create completely different dishes, not variations of existing ones
- If the user has "Chicken Stir Fry", do NOT create "Beef Stir Fry" or "Vegetable Stir Fry" - pick a totally different dish type

CUISINE AUTHENTICITY:
- If a cuisine is specified, create ONLY dishes from that cuisine
- Use authentic ingredients, techniques, and flavor profiles

QUALITY:
- Write clear, detailed, step-by-step instructions
- Provide accurate nutritional estimates per serving
- Choose recipes appropriate for the requested difficulty level
- Create unique, creative recipes with interesting flavor combinations

OUTPUT FORMAT (CRITICAL):
- Call the final_recipe tool exactly once with the complete recipe
- Fill the fields in schema order: name, description, cuisine, ingredients, instructions, then the rest
- The `name` field must contain only the dish title
- Do not prepend labels like "Recipe:", "Recipe Name:", or leading punctuation
"""

ProviderName = Literal["grok", "together", "demo"]


class RecipeAgentConfig(TypedDict):
    provider: ProviderName
    model: str
    base_url: str
    api_key: str


class RecipeAgentStatus(TypedDict):
    configured: bool
    provider: str
    model: str
    reason: str | None


def _grok_config() -> RecipeAgentConfig:
    return {
        "provider": "grok",
        "model": settings.GROK_MODEL,
        "base_url": settings.GROK_BASE_URL,
        "api_key": settings.GROK_API_KEY,
    }


def _together_config() -> RecipeAgentConfig:
    return {
        "provider": "together",
        "model": settings.TOGETHER_MODEL,
        "base_url": settings.TOGETHER_BASE_URL,
        "api_key": settings.TOGETHER_API_KEY,
    }


def _demo_config() -> RecipeAgentConfig:
    return {"provider": "demo", "model": DEMO_MODEL_NAME, "base_url": "", "api_key": ""}


def _has_key(value: str | None) -> bool:
    """True for a real-looking key; env.example placeholders count as missing."""
    key = (value or "").strip()
    return bool(key) and not (key.startswith("your-") and key.endswith("-here"))


def _resolve_model_config() -> tuple[RecipeAgentConfig | None, str | None]:
    provider = settings.LLM_PROVIDER
    has_grok = _has_key(settings.GROK_API_KEY)
    has_together = _has_key(settings.TOGETHER_API_KEY)
    is_production = settings.is_production

    if provider == "demo":
        if is_production:
            return None, "LLM_PROVIDER 'demo' is not allowed in production."
        return _demo_config(), None

    if provider == "grok":
        if not has_grok:
            return None, "LLM_PROVIDER is set to 'grok' but GROK_API_KEY is missing."
        return _grok_config(), None

    if provider == "together":
        if not has_together:
            return (
                None,
                "LLM_PROVIDER is set to 'together' but TOGETHER_API_KEY is missing.",
            )
        return _together_config(), None

    # auto: prefer Grok, then Together, then the offline demo model outside production.
    if has_grok:
        return _grok_config(), None
    if has_together:
        return _together_config(), None
    if not is_production:
        return _demo_config(), None

    return None, "No LLM API key configured. Set GROK_API_KEY or TOGETHER_API_KEY."


def get_recipe_agent_status() -> RecipeAgentStatus:
    config, reason = _resolve_model_config()
    if config is None:
        return {
            "configured": False,
            "provider": "unconfigured",
            "model": "unconfigured",
            "reason": reason,
        }
    return {
        "configured": True,
        "provider": config["provider"],
        "model": config["model"],
        "reason": None,
    }


def _build_model(config: RecipeAgentConfig) -> Model:
    if config["provider"] == "demo":
        return build_demo_model(delay_scale=settings.DEMO_LLM_DELAY_SCALE)
    return OpenAIChatModel(
        config["model"],
        provider=OpenAIProvider(
            base_url=config["base_url"],
            api_key=config["api_key"],
        ),
    )


def build_recipe_agent(model: Model) -> Agent[RecipeAgentDeps, RecipeLLM]:
    """Create the recipe agent around ``model`` (also used by tests)."""
    return Agent(
        model=model,
        deps_type=RecipeAgentDeps,
        model_settings={"max_tokens": settings.RECIPE_MAX_TOKENS},
        retries=2,
        output_retries=4,
        output_type=ToolOutput(
            RecipeLLM,
            name=OUTPUT_TOOL_NAME,
            strict=True,
        ),
        system_prompt=SYSTEM_PROMPT,
    )


@lru_cache(maxsize=1)
def get_recipe_agent() -> Agent[RecipeAgentDeps, RecipeLLM]:
    config, reason = _resolve_model_config()
    if config is None:
        raise RuntimeError(reason or "Recipe generation is not configured.")

    logger.info(
        "Recipe agent provider=%s model=%s base_url=%s",
        config["provider"],
        config["model"],
        config["base_url"] or "-",
    )
    return build_recipe_agent(_build_model(config))
