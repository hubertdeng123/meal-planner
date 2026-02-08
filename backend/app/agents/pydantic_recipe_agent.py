import logging

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


def _resolve_model_config() -> tuple[str, str, str, str]:
    provider = settings.LLM_PROVIDER
    has_grok = bool(settings.GROK_API_KEY and settings.GROK_API_KEY.strip())
    has_together = bool(settings.TOGETHER_API_KEY and settings.TOGETHER_API_KEY.strip())

    if provider == "grok":
        if not has_grok:
            raise RuntimeError(
                "LLM_PROVIDER is set to 'grok' but GROK_API_KEY is missing."
            )
        return (
            "grok",
            settings.GROK_MODEL,
            settings.GROK_BASE_URL,
            settings.GROK_API_KEY,
        )

    if provider == "together":
        if not has_together:
            raise RuntimeError(
                "LLM_PROVIDER is set to 'together' but TOGETHER_API_KEY is missing."
            )
        return (
            "together",
            settings.TOGETHER_MODEL,
            settings.TOGETHER_BASE_URL,
            settings.TOGETHER_API_KEY,
        )

    # auto: prefer Grok if configured, else Together.
    if has_grok:
        return (
            "grok",
            settings.GROK_MODEL,
            settings.GROK_BASE_URL,
            settings.GROK_API_KEY,
        )
    if has_together:
        logger.warning(
            "GROK_API_KEY not set; falling back to Together (model=%s).",
            settings.TOGETHER_MODEL,
        )
        return (
            "together",
            settings.TOGETHER_MODEL,
            settings.TOGETHER_BASE_URL,
            settings.TOGETHER_API_KEY,
        )
    raise RuntimeError(
        "No LLM API key configured. Set GROK_API_KEY or TOGETHER_API_KEY."
    )


provider_name, model_name, base_url, api_key = _resolve_model_config()
logger.info(
    "Recipe agent provider=%s model=%s base_url=%s", provider_name, model_name, base_url
)

model = OpenAIChatModel(
    model_name,
    provider=OpenAIProvider(
        base_url=base_url,
        api_key=api_key,
    ),
)

# Create agent with type-safe dependencies
recipe_agent = Agent(
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

# Note: Tools are disabled - user context is prefetched and included in the prompt
# This avoids LLM tool-calling latency and duplicate calls
