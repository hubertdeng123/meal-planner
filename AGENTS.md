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
GenerateRecipePage → useRecipeStream() → streamRecipe() fetch() SSE → POST /recipes/generate/stream
                                        ↓
                               prefetch_user_context()  ← DB queries (preferences, history, pantry)   [stage: context]
                                        ↓
                               generate_recipe_events() → agent.iter() → Grok / Together AI / demo
                                        ↓
                               native ThinkingPart deltas  → `thinking {delta}` events           [stage: thinking]
                                        ↓
                               partial output-tool args → `draft {recipe}` events (≤10/s)       [stage: drafting]
                                        ↓
                               save_generated_recipe() → `complete {recipe}` event              [stage: saving]
                               (`error {message, retryable}` on failure, `ping` keepalives throughout)
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
| Streaming endpoint | `backend/app/api/endpoints/recipes.py` | Thin SSE route; delegates to the stream service |
| Stream service | `backend/app/services/recipe_stream.py` | Named SSE events, draft throttling, keepalive, timeouts |
| Generation helpers | `backend/app/services/recipe_generation.py` | User context prefetch, prompt building, saving |
| Ingredient logic | `backend/app/services/ingredient_service.py` | Shared normalization/categorization — don't duplicate |
| SSE client | `frontend/src/services/recipe.service.ts` | `streamRecipe()` over the parser in `services/sse.ts` |
| Stream hook | `frontend/src/hooks/useRecipeStream.ts` | Stage/thinking/draft state, cancel, timeout — use this from UI |
| Date utils | `frontend/src/utils/date.ts` | Always use for YYYY-MM-DD parsing |

## Key Patterns to Follow

### Backend Patterns

1. **Pagination with filtering**: All list endpoints support `page`, `page_size`, `q` (search), `sort`, `order`. Return `PaginatedX` schema.
2. **User context prefetching**: Recipe generation prefetches all user data in Python before calling the LLM. No LLM tool-calling.
3. **Dependency injection**: `get_current_active_user` for auth, `get_db` for sessions, via `Depends()`.
4. **Ingredient service**: Use `ingredient_service.py` for `normalize_ingredient_name()`, `categorize_ingredient()`, and `sorted_ingredient_entries()`.

### Frontend Patterns

1. **SSE streaming**: Recipe generation uses `fetch()` with `ReadableStream`, not axios. UI code goes through the `useRecipeStream()` hook rather than calling the service directly.
2. **Date utilities**: Use `utils/date.ts` for parsing `YYYY-MM-DD` strings. Never use `new Date('YYYY-MM-DD')` directly (timezone shift bug).
3. **Toast notifications**: Use `useToast()` hook from `ToastContext`.
4. **Service layer**: Singleton class instances wrapping axios. SSE streaming uses raw `fetch()`.

## Common Pitfalls

1. **Date timezone**: `new Date('2026-01-15')` parses as UTC midnight → renders as Jan 14 in US timezones. Use `parseLocalDate()` from `utils/date.ts`.
2. **Tag filtering**: PostgreSQL uses `ARRAY.contains()`, SQLite (tests) uses `json_each()`. Check dialect.
3. **Streaming cancellation**: `useRecipeStream().cancel()` aborts the fetch and also runs on unmount; the backend cancels the agent run on disconnect. Don't hand-roll a second `AbortController`.
4. **Ingredient categorization**: Lives in `ingredient_service.py`. Both `grocery.py` and `meal_plans.py` import from there.
5. **Meal plan date validation**: Enforced at schema level (Pydantic) and DB level (`ck_meal_plans_date_range`).

## Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| **Grok/Together AI multi-provider** (not Claude API) | Auto-detects provider (prefers Grok when GROK_API_KEY set, falls back to Together). ToolOutput for structured JSON, reasoning tokens for UX |
| **Offline `demo` provider** | `LLM_PROVIDER=demo` (or `auto` with no keys when `ENVIRONMENT` is not production) streams a canned recipe through a PydanticAI `FunctionModel`, so the full UX works without API keys. `DEMO_LLM_DELAY_SCALE=0` makes it instant |
| **Prefetch user context** (not LLM tools) | Eliminates tool-calling round-trips. All context gathered in ~3 SQL queries before LLM call |
| **APScheduler** (not Celery) | Lightweight for single-server deployment. Hourly cron is sufficient for weekly email reminders |
| **localStorage for JWT** (not httpOnly cookies) | Simpler SSE auth (Bearer token in fetch headers). Acceptable for this app's threat model |
| **PydanticAI Agent** (not raw API calls) | Type-safe structured output, streaming support, OpenTelemetry instrumentation |

## Recipe Generation Flow (condensed)

1. User submits form → SSE connection to `POST /recipes/generate/stream`
2. Backend prefetches user context (~3 queries), builds prompt with preferences + history
3. `generate_recipe_events()` iterates the agent graph against the configured provider (Grok, Together AI, or demo)
4. Native thinking parts stream as `thinking` events; partial output-tool JSON is validated into `RecipeDraft` and streamed as `draft` events so the recipe fills in live
5. Recipe saved to DB → `complete` event → user redirected to detail page

## Cursor Cloud specific instructions

- PostgreSQL 16 runs on the host. Docker is not part of this environment, so `make db-up` will not start the database. The dev database is `meal_planner` with user `postgres` and password `password`: `postgresql://postgres:password@localhost:5432/meal_planner`.
- `scripts/cloud-agent-start.sh` starts Postgres (`pg_ctlcluster` when systemd is unavailable), creates that database, writes a root `.env` with a random `JWT_SECRET_KEY` when one is missing, runs `uv run alembic upgrade head`, and launches the API and Vite servers in tmux sessions named `backend` and `frontend`.
- API: http://127.0.0.1:8000 (`cd backend && uv run uvicorn app.main:app --host 0.0.0.0 --port 8000`). UI: http://127.0.0.1:5173 (`cd frontend && pnpm exec vite --host 0.0.0.0 --port 5173`). Vite does not use the README's port 3000.
- `BraintrustSpanProcessor()` in `backend/app/main.py` raises on import unless `BRAINTRUST_API_KEY` is set. The start script exports `BRAINTRUST_API_KEY=local-dev-unset` when no real key is present so the API can boot. Tracing export needs a real key.
- Recipe generation needs `GROK_API_KEY` or `TOGETHER_API_KEY`. Registration, pantry, meal plans, and grocery lists work without them. `GET /health` reports `llm_configured: false` until one of those keys is set.
- Frontend API base URL comes from `frontend/.env` (`VITE_API_URL=http://localhost:8000`), created by the start script when missing.
- Checks: `cd backend && uv run pytest` and `uv run ruff check .`; `cd frontend && pnpm run typecheck && pnpm run lint && pnpm run test`.

## Cross-References

- [CLAUDE.md](./CLAUDE.md) - Dev commands, code standards, testing
- [docs/architecture.md](./docs/architecture.md) - System architecture + full file map
- [docs/data-model.md](./docs/data-model.md) - Database schema reference
- [docs/api-reference.md](./docs/api-reference.md) - API endpoint reference
- [docs/frontend-guide.md](./docs/frontend-guide.md) - Frontend patterns and components
- [docs/development-guide.md](./docs/development-guide.md) - Developer workflow guide
- [docs/implementation-backlog.md](./docs/implementation-backlog.md) - Prioritized backlog
