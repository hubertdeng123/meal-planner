from pydantic_ai import Agent, NativeOutput
from pydantic_ai.models.openai import OpenAIChatModel
from pydantic_ai.providers.openai import OpenAIProvider
from app.core.config import settings
from app.schemas.llm_response import RecipeLLM
from app.agents.recipe_deps import RecipeAgentDeps

# Create Together AI model with DeepSeek R1-0528 (reasoning model)
# DeepSeek R1 streams <think>...</think> reasoning tokens before structured output
model = OpenAIChatModel(
    "deepseek-ai/DeepSeek-R1-0528",
    provider=OpenAIProvider(
        base_url="https://api.together.xyz/v1",
        api_key=settings.TOGETHER_API_KEY,
    ),
)

# Create agent with type-safe dependencies
recipe_agent = Agent(
    model=model,
    deps_type=RecipeAgentDeps,
    output_type=NativeOutput(
        RecipeLLM
    ),  # Use JSON schema response_format instead of tool calling
    system_prompt="""You are a professional chef and nutritionist. Generate detailed, delicious recipes.

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
""",
)

# Note: Tools are disabled - user context is prefetched and included in the prompt
# This avoids LLM tool-calling latency and duplicate calls
