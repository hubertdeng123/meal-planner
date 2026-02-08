# Hungry Helper - AI Agent Onboarding Guide

> For dev commands, code standards, testing, and common tasks, see [CLAUDE.md](./CLAUDE.md).

## Project Identity

**Hungry Helper** is an AI-powered meal planning application. Users create accounts, set dietary preferences, generate personalized recipes via AI, organize weekly meal plans, and compile grocery lists.

**Tech stack**: FastAPI (Python 3.11+) + React 18 (TypeScript/Vite) + PostgreSQL + Grok (xAI) / Together AI + PydanticAI + Tailwind CSS + pnpm/uv

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
                               recipe_agent.run_stream()  → Grok / Together AI (auto-detected)
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

## File Map

See [docs/architecture.md](./docs/architecture.md) for the full file map. Key entry points:

| Area | Key File | Notes |
|------|----------|-------|
| AI agent | `backend/app/agents/pydantic_recipe_agent.py` | Multi-provider (Grok/Together), ToolOutput(RecipeLLM) |
| Streaming endpoint | `backend/app/api/endpoints/recipes.py` | SSE generation + user context prefetch |
| Ingredient logic | `backend/app/services/ingredient_service.py` | Shared normalization/categorization — don't duplicate |
| SSE client | `frontend/src/services/recipe.service.ts` | StreamCallbacks pattern with AbortSignal |
| Date utils | `frontend/src/utils/date.ts` | Always use for YYYY-MM-DD parsing |

## Key Patterns to Follow

### Backend Patterns

1. **Pagination with filtering**: All list endpoints support `page`, `page_size`, `q` (search), `sort`, `order`. Return `PaginatedX` schema.
2. **User context prefetching**: Recipe generation prefetches all user data in Python before calling the LLM. No LLM tool-calling.
3. **Dependency injection**: `get_current_active_user` for auth, `get_db` for sessions, via `Depends()`.
4. **Ingredient service**: Use `ingredient_service.py` for `normalize_ingredient_name()`, `categorize_ingredient()`, and `sorted_ingredient_entries()`.

### Frontend Patterns

1. **SSE streaming**: Recipe generation uses `fetch()` with `ReadableStream`, not axios. Always pass an `AbortSignal`.
2. **Date utilities**: Use `utils/date.ts` for parsing `YYYY-MM-DD` strings. Never use `new Date('YYYY-MM-DD')` directly (timezone shift bug).
3. **Toast notifications**: Use `useToast()` hook from `ToastContext`.
4. **Service layer**: Singleton class instances wrapping axios. SSE streaming uses raw `fetch()`.

## Common Pitfalls

1. **Date timezone**: `new Date('2026-01-15')` parses as UTC midnight → renders as Jan 14 in US timezones. Use `parseLocalDate()` from `utils/date.ts`.
2. **Tag filtering**: PostgreSQL uses `ARRAY.contains()`, SQLite (tests) uses `json_each()`. Check dialect.
3. **Streaming cancellation**: Wire `AbortController.abort()` to cancel button + unmount cleanup. Check `error.name === 'AbortError'`.
4. **Ingredient categorization**: Lives in `ingredient_service.py`. Both `grocery.py` and `meal_plans.py` import from there.
5. **Meal plan date validation**: Enforced at schema level (Pydantic) and DB level (`ck_meal_plans_date_range`).

## Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| **Grok/Together AI multi-provider** (not Claude API) | Auto-detects provider (prefers Grok when GROK_API_KEY set, falls back to Together). ToolOutput for structured JSON, reasoning tokens for UX |
| **Prefetch user context** (not LLM tools) | Eliminates tool-calling round-trips. All context gathered in ~3 SQL queries before LLM call |
| **APScheduler** (not Celery) | Lightweight for single-server deployment. Hourly cron is sufficient for weekly email reminders |
| **localStorage for JWT** (not httpOnly cookies) | Simpler SSE auth (Bearer token in fetch headers). Acceptable for this app's threat model |
| **PydanticAI Agent** (not raw API calls) | Type-safe structured output, streaming support, OpenTelemetry instrumentation |

## Recipe Generation Flow (condensed)

1. User submits form → SSE connection to `POST /recipes/generate/stream`
2. Backend prefetches user context (~3 queries), builds prompt with preferences + history
3. `recipe_agent.run_stream()` calls configured LLM provider (Grok or Together AI)
4. Thinking tokens stream as SSE events → frontend shows progress; structured output parsed into recipe fields
5. Recipe saved to DB → `complete` event → user redirected to detail page

## Cross-References

- [CLAUDE.md](./CLAUDE.md) - Dev commands, code standards, testing
- [docs/architecture.md](./docs/architecture.md) - System architecture + full file map
- [docs/data-model.md](./docs/data-model.md) - Database schema reference
- [docs/api-reference.md](./docs/api-reference.md) - API endpoint reference
- [docs/frontend-guide.md](./docs/frontend-guide.md) - Frontend patterns and components
- [docs/development-guide.md](./docs/development-guide.md) - Developer workflow guide
- [docs/implementation-backlog.md](./docs/implementation-backlog.md) - Prioritized backlog
