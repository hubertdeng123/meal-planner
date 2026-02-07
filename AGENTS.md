# Hungry Helper - AI Agent Onboarding Guide

> For dev commands, code standards, testing, and common tasks, see [CLAUDE.md](./CLAUDE.md).

## Project Identity

**Hungry Helper** is an AI-powered meal planning application. Users create accounts, set dietary preferences, generate personalized recipes via AI, organize weekly meal plans, and compile grocery lists.

**Tech stack**: FastAPI (Python 3.11+) + React 18 (TypeScript/Vite) + PostgreSQL (pgvector) + DeepSeek R1 via Together AI + Tailwind CSS + pnpm/uv

## Architecture Mental Model

### Flow 1: CRUD (recipes, meal plans, grocery lists, pantry)

```
Frontend Page → service.ts → axios → FastAPI endpoint → SQLAlchemy → PostgreSQL
                                              ↑
                                    get_current_active_user (JWT)
```

### Flow 2: Streaming AI Recipe Generation

```
GenerateRecipePage → fetch() SSE → POST /recipes/generate/stream
                                        ↓
                               prefetch_user_context()  ← DB queries (preferences, history, pantry)
                                        ↓
                               recipe_agent.run_stream()  → Together AI (DeepSeek R1)
                                        ↓
                               <think>...</think> tokens  → SSE thinking events
                                        ↓
                               RecipeLLM structured output → SSE recipe field events
                                        ↓
                               Save to DB → SSE complete event
```

### Flow 3: Grocery List from Meal Plan

```
MealPlanDetailPage → POST /{id}/grocery-list
                          ↓
                   Collect recipe ingredients → normalize names → merge quantities
                          ↓
                   categorize_ingredient() → create GroceryList + GroceryItems
```

### Flow 4: Scheduled Email Reminders

```
APScheduler (hourly cron) → check_weekly_reminders()
                                ↓
                     Query users where day_of_week matches + time within 1hr
                                ↓
                     email_service.send_weekly_reminder()  → SMTP
```

## Critical File Map

### Backend - Models (`backend/app/models/`)
| File | Description |
|------|-------------|
| `user.py` | User model with 6 JSON preference columns + notification settings |
| `recipe.py` | Recipe with JSON ingredients/instructions, ARRAY tags, nutrition floats |
| `recipe_feedback.py` | User feedback: liked, rating, notes |
| `meal_plan.py` | MealPlan, MealPlanItem, GroceryList, GroceryItem models |
| `pantry_item.py` | PantryItem with expiry tracking |

### Backend - Schemas (`backend/app/schemas/`)
| File | Description |
|------|-------------|
| `user.py` | UserCreate, UserPreferences (6 rule sub-models), Token, UserUpdate |
| `recipe.py` | Recipe, RecipeUpdate, RecipeGenerationRequest, RecipeFeedback, PaginatedRecipes |
| `meal_plan.py` | MealPlan CRUD schemas, MealPlanItem schemas, PaginatedMealPlans |
| `grocery.py` | GroceryList, GroceryItem, PaginatedGroceryLists |
| `pantry.py` | PantryItem, PantryItemCreate/Update, PaginatedPantryItems |
| `llm_response.py` | RecipeLLM, IngredientLLM, NutritionLLM (structured AI output) |

### Backend - Endpoints (`backend/app/api/endpoints/`)
| File | Description |
|------|-------------|
| `auth.py` | Register (with preferences), login (OAuth2), /me, /me/preferences |
| `recipes.py` | CRUD, paginated list, **streaming generation**, feedback |
| `meal_plans.py` | CRUD, paginated list, items CRUD, autofill, grocery generation |
| `grocery.py` | CRUD, paginated list, items CRUD, create from recipes |
| `pantry.py` | Paginated list, items CRUD |
| `notifications.py` | Preferences, test reminder, grocery/meal plan email notifications |
| `users.py` | Preferences CRUD, partial updates, profile, reset |

### Backend - Services (`backend/app/services/`)
| File | Description |
|------|-------------|
| `scheduler_service.py` | APScheduler singleton; hourly cron checks weekly reminders |
| `email_service.py` | SMTP email sending with HTML templates |
| `ingredient_service.py` | Shared ingredient normalization, categorization, sorting |

### Backend - Agents (`backend/app/agents/`)
| File | Description |
|------|-------------|
| `pydantic_recipe_agent.py` | PydanticAI Agent with DeepSeek R1, NativeOutput(RecipeLLM) |
| `recipe_deps.py` | RecipeAgentDeps dataclass (db Session + user_id) |

### Frontend - Pages (`frontend/src/pages/`)
| File | Description |
|------|-------------|
| `LoginPage.tsx` / `RegisterPage.tsx` | Auth forms with preference wizard on register |
| `DashboardPage.tsx` | Activity overview, quick actions |
| `RecipesPage.tsx` | Paginated recipe grid with search/tag filters |
| `RecipeDetailPage.tsx` | Full recipe view with feedback |
| `GenerateRecipePage.tsx` | AI generation form with SSE streaming display |
| `MealPlansPage.tsx` | Paginated meal plan list |
| `MealPlanDetailPage.tsx` | Weekly calendar view, item management, grocery generation |
| `GroceryListsPage.tsx` | Paginated grocery list |
| `GroceryListDetailPage.tsx` | Checklist with category grouping |
| `PantryPage.tsx` | Pantry inventory with expiry tracking |
| `SettingsPage.tsx` | Preferences, notifications, profile settings |

### Frontend - Components (`frontend/src/components/`)
| File | Description |
|------|-------------|
| `Layout.tsx` | App shell with nav, responsive sidebar, profile menu |
| `ProtectedRoute.tsx` | Auth guard wrapping Layout |
| `LoadingModal.tsx` | Recipe generation progress with phased stepper |
| `Breadcrumbs.tsx` | Navigation breadcrumb trail |
| `ui/` | Reusable UI components (ToastContainer, AppIcons, etc.) |

### Frontend - Services (`frontend/src/services/`)
| File | Description |
|------|-------------|
| `api.ts` | Axios instance with baseURL and auth interceptor |
| `auth.service.ts` | Login, register, token management |
| `recipe.service.ts` | CRUD + SSE streaming with StreamCallbacks pattern |
| `mealPlan.service.ts` | Meal plan and item CRUD |
| `grocery.service.ts` | Grocery list and item CRUD |
| `pantry.service.ts` | Pantry item CRUD |
| `notification.service.ts` | Email notification triggers |

### Frontend - State (`frontend/src/contexts/`)
| File | Description |
|------|-------------|
| `AuthContextProvider.tsx` | Auth state, token storage (localStorage), login/logout |
| `ToastContext.tsx` | Toast notification queue with auto-dismiss |

### Frontend - Utils (`frontend/src/utils/`)
| File | Description |
|------|-------------|
| `date.ts` | Safe local date parsing to avoid timezone shift bugs |

## Data Model Overview

```
User (1)──→(N) Recipe ──→(N) RecipeFeedback
  │
  ├──→(N) MealPlan ──→(N) MealPlanItem ──→(0..1) Recipe
  │           │
  │           └──→(0..N) GroceryList ──→(N) GroceryItem
  │
  ├──→(N) GroceryList (standalone, no meal_plan_id)
  │
  └──→(N) PantryItem
```

Key JSON columns on `User`: `food_preferences`, `dietary_restrictions`, `ingredient_rules`, `food_type_rules`, `nutritional_rules`, `scheduling_rules`, `dietary_rules`

See [docs/data-model.md](./docs/data-model.md) for full schema reference.

## Key Patterns to Follow

### Backend Patterns

1. **Pagination with filtering**: All list endpoints support `page`, `page_size`, `q` (search), `sort`, `order`. Return `PaginatedX` schema with `items`, `page`, `page_size`, `total`, `total_pages`.

2. **User context prefetching**: Recipe generation prefetches all user data (preferences, history, liked/disliked recipes, pantry) in Python before calling the LLM. This avoids tool-calling latency.

3. **Pydantic validation**: Request bodies use Pydantic schemas. Response models are declared in route decorators.

4. **Dependency injection**: `get_current_active_user` for auth, `get_db` for database sessions, injected via FastAPI `Depends()`.

5. **Ingredient service**: Use `ingredient_service.py` for `normalize_ingredient_name()`, `categorize_ingredient()`, and `sorted_ingredient_entries()`. Do not duplicate categorization logic.

### Frontend Patterns

1. **SSE streaming**: Recipe generation uses `fetch()` with `ReadableStream`, not axios. The `StreamCallbacks` interface provides typed callbacks for each event type. Always pass an `AbortSignal` for cancellation.

2. **Date utilities**: Use `utils/date.ts` for parsing `YYYY-MM-DD` strings. Never use `new Date('YYYY-MM-DD')` directly (timezone shift bug).

3. **Toast notifications**: Use `useToast()` hook from `ToastContext`. Call `showSuccess()`, `showError()`, etc.

4. **Protected routes**: All authenticated pages wrap in `<ProtectedRoute>` which checks `isAuthenticated` and renders `<Layout>`.

5. **Service layer**: Services are singleton class instances. They wrap axios (`api.ts`) for REST calls. SSE streaming uses raw `fetch()`.

## Common Pitfalls

1. **Date timezone**: `new Date('2026-01-15')` parses as UTC midnight, which renders as Jan 14 in US timezones. Always use `parseLocalDate()` from `utils/date.ts`.

2. **Tag filtering performance**: Recipe tag filtering on PostgreSQL uses `ARRAY.contains()`. On SQLite (tests), it uses `json_each()` subquery. Check dialect before applying filters.

3. **Hook dependency warnings**: Several pages had `react-hooks/exhaustive-deps` issues. Wrap data-loading functions in `useCallback` and include in dependency arrays.

4. **Streaming cancellation**: Always wire `AbortController.abort()` to the cancel button and component unmount cleanup. Check `error.name === 'AbortError'` to distinguish cancellation from real errors.

5. **Ingredient categorization**: The `categorize_ingredient()` function lives in `ingredient_service.py`. Both `grocery.py` and `meal_plans.py` import from there. Do not create duplicate categorization logic.

6. **Meal plan date validation**: `start_date <= end_date` is enforced at schema level (Pydantic validator) and DB level (check constraint `ck_meal_plans_date_range`).

## Architectural Decisions & Rationale

| Decision | Rationale |
|----------|-----------|
| **DeepSeek R1 via Together AI** (not Claude API) | Structured JSON output via `response_format`, reasoning tokens visible for UX, cost-effective for high-volume generation |
| **Prefetch user context** (not LLM tools) | Eliminates tool-calling round-trips. All context gathered in ~3 SQL queries before LLM call |
| **APScheduler** (not Celery) | Lightweight for single-server deployment. Hourly cron is sufficient for weekly email reminders |
| **localStorage for JWT** (not httpOnly cookies) | Simpler SSE auth (Bearer token in fetch headers). Acceptable for this app's threat model |
| **PydanticAI Agent** (not raw API calls) | Type-safe structured output, streaming support, OpenTelemetry instrumentation for Braintrust logging |
| **Singleton services** (not DI container) | Simple for current scale. `scheduler_service`, `email_service` are module-level singletons |

## End-to-End Feature Walkthrough

### Recipe Generation Flow

1. User fills form on `GenerateRecipePage.tsx` (cuisine, difficulty, ingredients, servings)
2. `recipeService.generateRecipeStream()` opens SSE connection to `POST /api/v1/recipes/generate/stream`
3. Backend `prefetch_user_context()` runs ~3 SQL queries (preferences, past recipes, feedback, pantry)
4. Prompt is built with preferences, history, dietary restrictions, pantry items
5. `recipe_agent.run_stream()` calls Together AI with DeepSeek R1
6. `<think>` tokens stream as SSE `thinking` events → `LoadingModal` shows thinking indicator
7. Structured `RecipeLLM` output is parsed → fields streamed as SSE events (name, description, ingredients, instructions, nutrition)
8. `GenerateRecipePage` builds recipe display progressively from callbacks
9. Recipe saved to DB → `complete` event with `recipe_id`
10. User redirected to `RecipeDetailPage`

### Meal Plan → Grocery List Flow

1. User creates meal plan on `MealPlansPage` → `POST /api/v1/meal-plans/`
2. User adds items (recipe slots) on `MealPlanDetailPage` → `POST /{id}/items`
3. User clicks "Generate Grocery List" → `POST /{id}/grocery-list`
4. Backend collects all recipe ingredients, normalizes names, merges same-unit quantities
5. `categorize_ingredient()` assigns categories (Produce, Dairy, Meat, etc.)
6. `GroceryList` + `GroceryItem` records created, sorted by category
7. User views checklist on `GroceryListDetailPage`, checks off items while shopping

## Cross-References

- [CLAUDE.md](./CLAUDE.md) - Dev commands, code standards, testing, common tasks
- [docs/architecture.md](./docs/architecture.md) - System architecture deep dive
- [docs/data-model.md](./docs/data-model.md) - Database schema reference
- [docs/api-reference.md](./docs/api-reference.md) - Complete API endpoint reference
- [docs/frontend-guide.md](./docs/frontend-guide.md) - Frontend patterns and components
- [docs/development-guide.md](./docs/development-guide.md) - Developer workflow guide
- [docs/implementation-backlog.md](./docs/implementation-backlog.md) - Prioritized backlog
