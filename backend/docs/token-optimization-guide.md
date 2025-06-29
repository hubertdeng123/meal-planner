# 🎯 Token Optimization Guide for Meal Planner

## Overview
This guide provides strategies to reduce Claude API token usage by up to 80% while maintaining high-quality meal planning and recipe generation.

## 📊 Current Token Usage Analysis

### High Token Consumers:
1. **Weekly Meal Plan Generation**: ~15,000-25,000 tokens per plan
2. **Individual Recipe Generation**: ~3,000-5,000 tokens per recipe
3. **Streaming Responses**: Additional overhead from thinking process

## 💰 Cost Reduction Strategies

### 1. **Implement Smart Caching** (40-50% reduction)

```python
# Example: Cache common meal suggestions
from app.core.cache import api_cache, CachedMealPlanningAgent

async def generate_meal_suggestions_with_cache(params):
    # Check cache first
    cache_params = CachedMealPlanningAgent.get_cache_params(**params)
    cached_result = api_cache.get('meal_suggestions', cache_params)

    if cached_result:
        logger.info("Cache hit - saving tokens!")
        return cached_result

    # Generate new if not cached
    result = await meal_planning_agent.generate_meal_suggestions(**params)

    # Cache for common queries
    if CachedMealPlanningAgent.should_use_cache(cache_params):
        api_cache.set('meal_suggestions', cache_params, result, ttl_hours=48)

    return result
```

### 2. **Optimize Prompts** (20-30% reduction)

#### Before (Verbose):
```python
prompt = """
You are an expert chef and nutritionist. Please generate 3 unique, creative, and
delicious recipes for dinner. Each recipe should be different from the others and
include detailed nutritional information. Make sure to include prep time, cook time,
servings, and all ingredients with exact measurements. The recipes should be suitable
for home cooking and use commonly available ingredients...
"""
```

#### After (Concise):
```python
prompt = """
Generate 3 unique dinner recipes. Include:
- name, description (50 words max)
- ingredients with quantities
- instructions (numbered steps)
- prep/cook time, servings
- basic nutrition (calories, protein, carbs, fat)

Format as JSON array.
"""
```

### 3. **Use Smaller Models for Simple Tasks** (30-40% reduction)

```python
class SmartModelSelector:
    @staticmethod
    def select_model(task_complexity: str) -> str:
        """Select appropriate model based on task"""
        if task_complexity == "simple":
            return "claude-3-haiku"  # Faster, cheaper
        elif task_complexity == "moderate":
            return "claude-3-sonnet"  # Balanced
        else:
            return "claude-3-opus"    # Most capable

    @staticmethod
    def determine_complexity(params: dict) -> str:
        """Determine task complexity"""
        if params.get('dietary_restrictions') or params.get('must_include_ingredients'):
            return "complex"
        elif params.get('preferred_cuisines'):
            return "moderate"
        else:
            return "simple"
```

### 4. **Batch Operations** (25-35% reduction)

```python
# Instead of 7 separate API calls for weekly meal plan:
async def generate_weekly_meal_plan_optimized(params):
    """Generate entire week in one API call"""
    prompt = f"""
    Generate meal plan for 7 days with these requirements:
    - Meals: {params['meal_types']}
    - Days: {params['cooking_days']}
    - Servings: {params['servings']}

    Return JSON with structure:
    {{
        "monday_dinner": [3 recipes],
        "tuesday_dinner": [3 recipes],
        ...
    }}

    Keep descriptions concise (30-50 words).
    """

    # One API call instead of 7-21 calls
    return await agent.generate(prompt)
```

### 5. **Local Recipe Database** (50-60% reduction)

```python
# Pre-populate database with common recipes
class LocalRecipeService:
    @staticmethod
    async def search_local_first(criteria: dict) -> Optional[List[Recipe]]:
        """Search local database before calling API"""
        query = db.query(Recipe).filter(
            Recipe.meal_type == criteria['meal_type'],
            Recipe.servings.between(
                criteria['servings'] - 2,
                criteria['servings'] + 2
            )
        )

        if criteria.get('cuisines'):
            query = query.filter(
                Recipe.tags.contains(criteria['cuisines'])
            )

        results = query.limit(10).all()

        if len(results) >= 3:
            # We have enough local recipes
            return random.sample(results, 3)

        return None  # Need to call API
```

### 6. **Response Streaming Optimization** (15-20% reduction)

```python
# Disable thinking process in production
async def generate_meal_suggestions_stream(self, **kwargs):
    if settings.ENVIRONMENT == "production":
        # Skip thinking tokens in production
        messages = [{
            "role": "user",
            "content": self._build_prompt(**kwargs)
        }]
    else:
        # Include thinking for development/debugging
        messages = self._get_messages_with_thinking(**kwargs)

    # Stream only the final response
    async for chunk in self._stream_response(messages):
        yield chunk
```

### 7. **Smart Fallbacks** (30-40% reduction)

```python
# Enhance fallback recipes to reduce API calls
class EnhancedFallbackRecipes:
    # Pre-computed recipe database
    FALLBACK_RECIPES = {
        "breakfast": [
            # 20+ breakfast recipes
        ],
        "lunch": [
            # 20+ lunch recipes
        ],
        "dinner": [
            # 20+ dinner recipes
        ]
    }

    @staticmethod
    def get_smart_fallback(meal_type: str, preferences: dict) -> dict:
        """Get intelligent fallback without API call"""
        candidates = EnhancedFallbackRecipes.FALLBACK_RECIPES[meal_type]

        # Filter by preferences
        if preferences.get('dietary_restrictions'):
            candidates = [r for r in candidates
                         if EnhancedFallbackRecipes._matches_diet(r, preferences)]

        # Score and select best matches
        scored = [(EnhancedFallbackRecipes._score_recipe(r, preferences), r)
                  for r in candidates]
        scored.sort(reverse=True, key=lambda x: x[0])

        return scored[0][1] if scored else None
```

## 5. Vector Databases & Semantic Search (NEW)

Vector databases are a game-changer for reducing token usage. By storing and searching recipes semantically, you can avoid many API calls entirely.

### Implementation Strategy

We've implemented a comprehensive pgvector + PostgreSQL solution in `backend/app/core/vector_store.py`:

#### 5.1 Recipe Vector Store
```python
from app.core.vector_store import RecipeVectorStore

# Initialize vector store
vector_store = RecipeVectorStore()

# Add recipes to vector database
recipe_id = f"breakfast_{timestamp}"
vector_store.add_recipe(recipe_data, recipe_id)

# Search for similar recipes
similar_recipes = vector_store.search_similar_recipes(
    query="healthy vegetarian breakfast with eggs",
    meal_type="breakfast",
    n_results=10,
    min_similarity=0.75
)
```

**Benefits:**
- **Zero API calls** for existing recipes
- Semantic search finds recipes even with different wording
- Learns from user interactions
- Improves over time

#### 5.2 Historical Data Summarization
```python
from app.core.vector_store import HistoricalDataSummarizer

summarizer = HistoricalDataSummarizer()

# Get user history summary
user_summary = await summarizer.summarize_user_history(user_id, db)

# Create concise context for API calls
context = summarizer.create_preference_context(user_summary)
# Returns: "User frequently chooses dinner. Prefers Italian, Mexican cuisines. Dietary pattern: vegetarian"
```

**Token Savings:**
- Instead of sending full history: ~2000 tokens
- With summarized context: ~50 tokens
- **95% reduction** in context tokens

#### 5.3 User Preference Learning
The system tracks and learns from user interactions:

```python
# Track recipe selection
vector_store.update_user_preferences(
    user_id,
    {
        'type': 'recipe_selected',
        'recipe': recipe_data,
        'timestamp': datetime.utcnow().isoformat()
    }
)
```

### Complete Integration Example

Here's how the optimized agent combines all strategies:

```python
class OptimizedMealPlanningAgent:
    async def generate_recipes(self, meal_type, servings, preferences, user_id, db):
        # 1. Get user history (no API call)
        user_summary = await self.summarizer.summarize_user_history(user_id, db)

        # 2. Search vector database first (no API call)
        similar_recipes = self.vector_store.search_similar_recipes(
            query=self._build_search_query(meal_type, preferences, user_summary),
            meal_type=meal_type,
            n_results=20,
            min_similarity=0.75
        )

        # 3. Rank by user preferences (no API call)
        ranked_recipes = self._rank_recipes_by_preference(
            similar_recipes, user_summary, preferences
        )

        # 4. Return if we have good matches (no API call!)
        if len(ranked_recipes) >= 3:
            return ranked_recipes[:3]

        # 5. Only call API if necessary (with optimized context)
        context = self.summarizer.create_preference_context(user_summary)
        # API call with minimal tokens...
```

### Expected Token Reduction

With vector databases and historical summarization:

| Scenario | Before | After | Reduction |
|----------|--------|-------|-----------|
| Repeat user request | 3,000 tokens | 0 tokens | 100% |
| Similar request | 3,000 tokens | 0 tokens | 100% |
| New request (with history) | 5,000 tokens | 1,500 tokens | 70% |
| Cold start (no history) | 3,000 tokens | 3,000 tokens | 0% |

**Average reduction: 60-80%** after initial usage period.

### Setup Instructions

1. Install dependencies:
```bash
cd backend
uv add pgvector sentence-transformers numpy
```

2. Set up PostgreSQL with pgvector:
```bash
# Using Docker (recommended)
docker run --name postgres-pgvector \
    -e POSTGRES_DB=meal_planner \
    -e POSTGRES_USER=postgres \
    -e POSTGRES_PASSWORD=password \
    -p 5432:5432 \
    -d pgvector/pgvector:pg16
```

3. Run migrations:
```bash
cd backend
uv run alembic upgrade head
```

4. Use optimized agent in endpoints:
```python
# In meal_planning.py
from app.core.vector_store import OptimizedMealPlanningService

service = OptimizedMealPlanningService(db)
recipes = await service.generate_meal_suggestions(
    user_id=current_user.id,
    meal_type=request.meal_type,
    preferences=request.preferences,
    n_suggestions=3
)
```

### Data Persistence

pgvector stores embeddings directly in PostgreSQL:

```python
# Recipe embeddings are stored in the database
recipe.embedding = Vector(384)  # 384-dimensional vector

# Automatic persistence with your existing database
# No separate vector database to manage
```

### Monitoring & Analytics

Track your token savings:

```python
# Log when using vector search
logger.info(f"Vector search hit: saved ~3000 tokens")

# Log when falling back to API
logger.info(f"API fallback: spent {token_count} tokens")

# Weekly report
total_requests = 1000
vector_hits = 750
api_calls = 250
tokens_saved = vector_hits * 3000
cost_saved = (tokens_saved / 1_000_000) * 3.00  # $3/million tokens
print(f"Weekly savings: ${cost_saved:.2f}")
```

## 6. Combined Strategy Results

## 🛠️ Implementation Priority

### Phase 1: Quick Wins (1-2 days)
1. ✅ Implement basic caching
2. ✅ Optimize prompt templates
3. ✅ Reduce streaming overhead

**Expected Savings: 30-40%**

### Phase 2: Database Enhancement (3-5 days)
1. ✅ Build local recipe database
2. ✅ Implement smart search
3. ✅ Enhanced fallback system

**Expected Savings: Additional 20-30%**

### Phase 3: Advanced Optimization (1 week)
1. ✅ Multi-model strategy
2. ✅ Batch operations
3. ✅ User preference learning

**Expected Savings: Additional 15-20%**

## 📈 Monitoring & Metrics

```python
class TokenUsageMonitor:
    @staticmethod
    async def track_usage(endpoint: str, tokens_used: int):
        """Track token usage by endpoint"""
        await db.execute(
            """
            INSERT INTO token_usage (endpoint, tokens, timestamp)
            VALUES (:endpoint, :tokens, :timestamp)
            """,
            {
                "endpoint": endpoint,
                "tokens": tokens_used,
                "timestamp": datetime.utcnow()
            }
        )

    @staticmethod
    async def get_usage_report(days: int = 7) -> dict:
        """Get token usage report"""
        results = await db.fetch_all(
            """
            SELECT
                endpoint,
                SUM(tokens) as total_tokens,
                COUNT(*) as api_calls,
                AVG(tokens) as avg_tokens_per_call
            FROM token_usage
            WHERE timestamp > :cutoff
            GROUP BY endpoint
            ORDER BY total_tokens DESC
            """,
            {"cutoff": datetime.utcnow() - timedelta(days=days)}
        )

        return {
            "total_tokens": sum(r['total_tokens'] for r in results),
            "endpoints": [dict(r) for r in results],
            "estimated_cost": sum(r['total_tokens'] for r in results) * 0.00002
        }
```

## 🎯 Expected Results

### Before Optimization:
- Average tokens per meal plan: 20,000
- Monthly token usage (100 users): 2,000,000
- Monthly cost: ~$40

### After Optimization:
- Average tokens per meal plan: 5,000 (75% reduction)
- Monthly token usage (100 users): 500,000
- Monthly cost: ~$10

## 🔧 Configuration

Add to `.env`:
```bash
# Token Optimization Settings
ENABLE_RESPONSE_CACHE=true
CACHE_TTL_HOURS=48
USE_SMART_MODEL_SELECTION=true
ENABLE_LOCAL_RECIPE_SEARCH=true
MAX_TOKENS_PER_RESPONSE=1000
DISABLE_THINKING_IN_PRODUCTION=true

# Redis for caching (optional)
REDIS_URL=redis://localhost:6379/0
```

## 📚 Best Practices

1. **Cache Aggressively**: Cache everything that doesn't need real-time generation
2. **Fail Gracefully**: Always have local fallbacks
3. **Monitor Usage**: Track token usage by feature
4. **Optimize Iteratively**: Start with biggest wins
5. **User Experience First**: Don't sacrifice quality for cost

## 🚀 Next Steps

1. Implement Phase 1 optimizations
2. Set up monitoring dashboard
3. A/B test optimizations
4. Gradually roll out to production
5. Monitor quality metrics alongside cost savings
