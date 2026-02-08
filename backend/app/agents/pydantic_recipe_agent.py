import logging
from functools import lru_cache
from typing import Literal, TypedDict

from pydantic_ai import Agent, ToolOutput
from pydantic_ai.models.openai import OpenAIChatModel
from pydantic_ai.providers.openai import OpenAIProvider
from app.core.config import settings
from app.schemas.llm_response import RecipeLLM
from app.agents.recipe_deps import RecipeAgentDeps

logger = logging.getLogger(__name__)

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
- The `name` field must contain only the dish title
- Do not prepend labels like "Recipe:", "Recipe Name:", or leading punctuation
"""


class RecipeAgentConfig(TypedDict):
    provider: Literal["grok", "together"]
    model: str
    base_url: str
    api_key: str


class RecipeAgentStatus(TypedDict):
    configured: bool
    provider: str
    model: str
    reason: str | None


def _resolve_model_config() -> tuple[RecipeAgentConfig | None, str | None]:
    provider = settings.LLM_PROVIDER
    has_grok = bool(settings.GROK_API_KEY and settings.GROK_API_KEY.strip())
    has_together = bool(settings.TOGETHER_API_KEY and settings.TOGETHER_API_KEY.strip())

    if provider == "grok":
        if not has_grok:
            return (
                None,
                "LLM_PROVIDER is set to 'grok' but GROK_API_KEY is missing.",
            )
        return (
            {
                "provider": "grok",
                "model": settings.GROK_MODEL,
                "base_url": settings.GROK_BASE_URL,
                "api_key": settings.GROK_API_KEY,
            },
            None,
        )

    if provider == "together":
        if not has_together:
            return (
                None,
                "LLM_PROVIDER is set to 'together' but TOGETHER_API_KEY is missing.",
            )
        return (
            {
                "provider": "together",
                "model": settings.TOGETHER_MODEL,
                "base_url": settings.TOGETHER_BASE_URL,
                "api_key": settings.TOGETHER_API_KEY,
            },
            None,
        )

    # auto: prefer Grok if configured, else Together.
    if has_grok:
        return (
            {
                "provider": "grok",
                "model": settings.GROK_MODEL,
                "base_url": settings.GROK_BASE_URL,
                "api_key": settings.GROK_API_KEY,
            },
            None,
        )
    if has_together:
        return (
            {
                "provider": "together",
                "model": settings.TOGETHER_MODEL,
                "base_url": settings.TOGETHER_BASE_URL,
                "api_key": settings.TOGETHER_API_KEY,
            },
            None,
        )

    return (
        None,
        "No LLM API key configured. Set GROK_API_KEY or TOGETHER_API_KEY.",
    )


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


def _build_recipe_agent(config: RecipeAgentConfig) -> Agent:
    model = OpenAIChatModel(
        config["model"],
        provider=OpenAIProvider(
            base_url=config["base_url"],
            api_key=config["api_key"],
        ),
    )
    return Agent(
        model=model,
        deps_type=RecipeAgentDeps,
        model_settings={"max_tokens": settings.RECIPE_MAX_TOKENS},
        retries=2,
        output_retries=4,
        output_type=ToolOutput(
            RecipeLLM,
            name="final_recipe",
            strict=True,
        ),
        system_prompt=SYSTEM_PROMPT,
    )


@lru_cache(maxsize=1)
def get_recipe_agent() -> Agent:
    config, reason = _resolve_model_config()
    if config is None:
        raise RuntimeError(reason or "Recipe generation is not configured.")

    logger.info(
        "Recipe agent provider=%s model=%s base_url=%s",
        config["provider"],
        config["model"],
        config["base_url"],
    )
    return _build_recipe_agent(config)


# Note: Tools are disabled - user context is prefetched and included in the prompt
# This avoids LLM tool-calling latency and duplicate calls
