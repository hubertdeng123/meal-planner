from pydantic_ai import Agent
from pydantic_ai.models.openai import OpenAIChatModel
from pydantic_ai.providers.openai import OpenAIProvider
from app.core.config import settings
from app.schemas.llm_response import RecipeLLM
from app.agents.recipe_deps import RecipeAgentDeps

# Create Together AI model (using OpenAI-compatible API)
model = OpenAIChatModel(
    "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
    provider=OpenAIProvider(
        base_url="https://api.together.xyz/v1",
        api_key=settings.TOGETHER_API_KEY,
    ),
)

# Create agent with type-safe dependencies
recipe_agent = Agent(
    model=model,
    deps_type=RecipeAgentDeps,
    output_type=RecipeLLM,  # Type-safe structured output
    system_prompt="""You are a professional chef and nutritionist. Generate detailed, delicious recipes.

The user's preferences, history, and dietary needs are included in the request. Use this information to create personalized recipes.

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
