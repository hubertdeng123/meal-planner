# 🔍 Vector Database Verification Guide

This guide explains how to verify that your pgvector implementation is working correctly at different stages of deployment.

## 📋 Overview

The vector database verification consists of multiple layers:

1. **Component Testing** - Individual components work correctly
2. **Integration Testing** - Components work together
3. **Performance Testing** - Acceptable response times
4. **Production Monitoring** - Ongoing health checks
5. **User Experience Validation** - Actual improvement in recommendations

## 🧪 Component Testing

### 1. Run Unit Tests
```bash
cd backend
uv run pytest tests/test_vector_store.py -v
```

**What it tests:**
- ✅ Embedding text generation
- ✅ Search query building
- ✅ Fallback search functionality
- ✅ User preference summarization
- ✅ Recipe tag/URL helper methods
- ✅ Performance characteristics

**Expected Result:** All 14 tests should pass

### 2. Run Simple Verification Script
```bash
cd backend
uv run python scripts/simple_vector_verify.py
```

**What it tests:**
- 🏗️ Database type detection
- 🤖 Sentence transformer loading
- 🧠 Embedding text generation
- 🔍 Search query building
- 👤 Preference context generation

**Expected Result:** 5/5 tests pass, status "✅ HEALTHY"

## 🔄 Integration Testing

### 1. Run Full Verification (PostgreSQL + Migration)
```bash
cd backend
uv run python scripts/verify_vector_db.py --output-json verification_report.json
```

**What it tests:**
- 📊 Database setup and table counts
- 🧠 Embedding generation with real data
- 🔍 Search functionality with filters
- ⚡ Complete optimized service flow

### 2. Manual API Testing

Test the meal planning endpoints directly:

```python
# Test basic meal planning (should use fallbacks initially)
curl -X POST "http://localhost:8000/api/meal-planning/weekly" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "preferences": {
      "cuisines": ["Italian"],
      "dietary_restrictions": ["vegetarian"],
      "max_prep_time": 45
    },
    "cooking_days": ["monday", "wednesday", "friday"],
    "servings": 4
  }'
```

**Expected behavior:**
- ✅ Returns meal suggestions quickly (< 2 seconds)
- ✅ Suggestions match your preferences
- ✅ No errors in logs

## 📈 Performance Testing

### 1. Search Performance
```python
import time
from app.core.vector_store import RecipeVectorStore
from app.db.database import get_db

db = next(get_db())
vector_store = RecipeVectorStore(db)

# Test search performance
start_time = time.time()
results = vector_store.search_similar_recipes("pasta italian dinner", n_results=10)
search_time = (time.time() - start_time) * 1000

print(f"Search completed in {search_time:.2f}ms")
# Should be < 1000ms for good performance
```

### 2. Embedding Generation Performance
```python
import time
from app.core.vector_store import RecipeVectorStore

vector_store = RecipeVectorStore()

test_recipe = {
    'name': 'Test Recipe',
    'description': 'Test description',
    'ingredients': [{'name': 'test', 'quantity': 1, 'unit': 'cup'}]
}

start_time = time.time()
embedding_text = vector_store.create_recipe_embedding_text(test_recipe)
generation_time = (time.time() - start_time) * 1000

print(f"Embedding text generated in {generation_time:.2f}ms")
# Should be < 100ms for good performance
```

## 🚀 Production Monitoring

### 1. Database Health Checks

**Check embedding coverage:**
```sql
-- PostgreSQL only
SELECT
    COUNT(*) as total_recipes,
    COUNT(embedding) as recipes_with_embeddings,
    ROUND(100.0 * COUNT(embedding) / COUNT(*), 2) as coverage_percent
FROM recipes;
```

**Check user engagement:**
```sql
SELECT
    COUNT(DISTINCT user_id) as users_with_feedback,
    AVG(rating) as avg_rating,
    COUNT(*) as total_feedback
FROM recipe_feedbacks
WHERE created_at > NOW() - INTERVAL '30 days';
```

### 2. Application Metrics

Monitor these key metrics:

```python
# Track vector search vs API fallback usage
vector_search_hits = 0
api_fallbacks = 0
token_usage = 0

# Log in your meal planning service
logger.info(f"Vector hit rate: {vector_search_hits/(vector_search_hits + api_fallbacks)*100:.1f}%")
logger.info(f"Tokens saved: {tokens_saved}")
logger.info(f"API cost: ${token_usage * 0.000003:.4f}")
```

### 3. Performance Monitoring

```python
# Add to middleware or service layer
@app.middleware("http")
async def track_response_times(request: Request, call_next):
    if "/meal-planning" in str(request.url):
        start_time = time.time()
        response = await call_next(request)
        duration = time.time() - start_time

        # Log slow requests
        if duration > 2.0:
            logger.warning(f"Slow meal planning request: {duration:.2f}s")

        return response
```

## 🎯 User Experience Validation

### 1. A/B Testing Setup

Compare vector-enhanced vs traditional approaches:

```python
# Flag-based testing
if user.enable_vector_search:
    # Use OptimizedMealPlanningService
    suggestions = await optimized_service.generate_meal_suggestions(...)
else:
    # Use traditional approach
    suggestions = await traditional_service.generate_meal_suggestions(...)

# Track metrics
track_user_satisfaction(user.id, suggestions, approach="vector" if user.enable_vector_search else "traditional")
```

### 2. Quality Metrics

Track these indicators:

```python
# Recipe relevance scoring
def calculate_relevance_score(user_preferences, suggested_recipes):
    score = 0
    for recipe in suggested_recipes:
        # Cuisine match
        if recipe['cuisine'] in user_preferences.get('cuisines', []):
            score += 10

        # Dietary restrictions match
        if all(restriction in recipe.get('tags', [])
               for restriction in user_preferences.get('dietary_restrictions', [])):
            score += 15

        # Prep time preference
        if recipe.get('prep_time', 999) <= user_preferences.get('max_prep_time', 999):
            score += 5

    return score / len(suggested_recipes)

# User interaction tracking
def track_user_interactions(user_id, recipes_shown, recipes_selected):
    selection_rate = len(recipes_selected) / len(recipes_shown)
    logger.info(f"User {user_id} selection rate: {selection_rate:.2%}")
```

## 🔧 Troubleshooting

### Common Issues and Solutions

**Issue: No embedding support detected**
```bash
# Solution: Run migration
cd backend
uv run alembic upgrade head

# Verify pgvector is installed
psql -d your_database -c "SELECT * FROM pg_extension WHERE extname='vector';"
```

**Issue: Slow search performance**
```sql
-- Solution: Check if indexes exist
\d+ recipes
-- Look for ix_recipes_embedding index

-- Create missing indexes
CREATE INDEX CONCURRENTLY ix_recipes_embedding_cosine
ON recipes USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

**Issue: Low similarity scores**
```python
# Solution: Adjust similarity threshold
results = vector_store.search_similar_recipes(
    query="pasta",
    min_similarity=0.6  # Lower threshold
)
```

**Issue: Memory usage too high**
```python
# Solution: Use smaller embedding dimensions or batch processing
# Consider using a smaller sentence transformer model
encoder = SentenceTransformer('all-MiniLM-L12-v2')  # Smaller than L6-v2
```

## 📊 Success Criteria

Your vector database implementation is working correctly when:

### ✅ Technical Health
- [ ] All unit tests pass (14/14)
- [ ] Simple verification passes (5/5)
- [ ] Search responds in < 1 second
- [ ] Embedding generation < 100ms
- [ ] No database errors in logs

### ✅ Business Impact
- [ ] 70%+ vector search hit rate (after initial period)
- [ ] 60%+ reduction in API token usage
- [ ] User selection rate > 40% for suggestions
- [ ] Average user rating for suggestions > 4.0/5

### ✅ Production Ready
- [ ] Database migration completed successfully
- [ ] Monitoring dashboards set up
- [ ] Performance alerts configured
- [ ] Backup strategy includes embedding data
- [ ] Rollback plan tested

## 🎉 Next Steps After Verification

1. **Gradual Rollout**: Start with 10% of users, monitor metrics
2. **Performance Tuning**: Optimize based on real usage patterns
3. **Feature Enhancement**: Add more sophisticated preference learning
4. **Cost Optimization**: Fine-tune similarity thresholds and caching
5. **User Feedback**: Collect explicit feedback on suggestion quality

## 📚 Additional Resources

- [pgvector Integration Guide](./vector-database-guide.md) - Detailed implementation
- [Token Optimization Guide](./token-optimization-guide.md) - Cost reduction strategies
- [Population Script](../scripts/populate_embeddings.py) - Batch embedding generation
- [Verification Scripts](../scripts/) - Automated testing tools

Remember: Vector search gets better over time as you collect more user data and feedback! 🚀
