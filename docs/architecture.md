# System Architecture

## System Diagram

```
                        ┌─────────────────────┐
                        │   React Frontend    │
                        │  (Vite + TypeScript) │
                        │   localhost:3000     │
                        └─────────┬───────────┘
                                  │ HTTP / SSE
                                  ▼
                        ┌─────────────────────┐         ┌──────────────┐
                        │   FastAPI Backend    │────────▶│ Grok / Together│
                        │   localhost:8000     │  REST   │  (auto-detect) │
                        │                     │         │  or offline    │
                        │                     │         │  demo model    │
                        │                     │         └──────────────┘
                        │  ┌───────────────┐  │
                        │  │  APScheduler  │  │─────────▶  SMTP Server
                        │  └───────────────┘  │          (email reminders)
                        └─────────┬───────────┘
                                  │ SQLAlchemy
                                  ▼
                        ┌─────────────────────┐
                        │    PostgreSQL 16     │
                        │    + pgvector        │
                        │  (Docker container)  │
                        └─────────────────────┘

Observability:
  Backend ──▶ Sentry (error tracking)
  Backend ──▶ Braintrust (LLM tracing via OpenTelemetry, only when BRAINTRUST_API_KEY is set)
```

## Backend Architecture

### Application Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI app, middleware, lifespan, router registration
│   ├── api/
│   │   ├── deps.py          # Dependency injection (auth, DB session)
│   │   └── endpoints/       # Route handlers by domain
│   ├── agents/              # PydanticAI agent + provider resolution, offline demo model
│   ├── core/
│   │   ├── config.py        # Settings from environment variables
│   │   ├── security.py      # JWT creation/verification, password hashing
│   │   ├── rate_limit.py    # slowapi rate limiter
│   │   └── exceptions.py    # Custom exception classes
│   ├── db/
│   │   └── database.py      # SQLAlchemy engine + session factory
│   ├── models/              # SQLAlchemy ORM models
│   ├── schemas/             # Pydantic request/response schemas
│   └── services/            # Business logic (recipe generation + SSE, ingredients, email, ...)
├── alembic/                 # Database migrations
├── tests/                   # pytest test suite
└── pyproject.toml           # Dependencies (managed by uv)
```

### Layer Responsibilities

| Layer | Responsibility |
|-------|---------------|
| **Models** (`models/`) | SQLAlchemy table definitions, relationships, constraints |
| **Schemas** (`schemas/`) | Pydantic validation for requests and responses |
| **Endpoints** (`api/endpoints/`) | HTTP handling, authorization, calling services/models |
| **Services** (`services/`) | Cross-cutting business logic (recipe generation pipeline, response formatting, email, scheduling, ingredient processing) |
| **Agents** (`agents/`) | AI model/provider configuration, the offline demo model |
| **Core** (`core/`) | Configuration, security, rate limiting, exceptions |

### Middleware Stack

1. **CORS** - Allows `localhost:3000`, `localhost:5173`, `localhost:5174`, and `BASE_URL`
2. **Rate Limiting** (slowapi) - Per-endpoint limits (e.g., 3/min for register, 5/min for login)

### Authentication Flow

1. User registers with `POST /auth/register` (email, username, password, preferences)
2. User logs in with `POST /auth/login` (OAuth2 password form) → receives JWT
3. JWT contains `{"sub": "<user_id>"}`, signed with `JWT_SECRET_KEY`
4. Protected endpoints use `Depends(get_current_active_user)` which decodes JWT and loads user
5. Frontend stores JWT in `localStorage`, sends as `Authorization: Bearer <token>`

### Observability

| Tool | Purpose | Configuration |
|------|---------|---------------|
| **Sentry** | Error tracking + performance monitoring | `SENTRY_DSN` env var, 10% trace/profile sample rate |
| **Braintrust** | LLM call tracing and evaluation | `init_logger(project="Hungry Helper")` + OpenTelemetry span processor, enabled only when `BRAINTRUST_API_KEY` is a real key |
| **OpenTelemetry** | Distributed tracing | `TracerProvider` with `BraintrustSpanProcessor` |
| **Python logging** | Application logs | File (`app.log`) + stdout, INFO level (configured before Sentry so it is not shadowed) |

## Frontend Architecture

### Component Hierarchy

```
App
├── AuthProvider
│   └── ToastProvider
│       ├── AppRoutes (React Router)
│       │   ├── LoginPage / RegisterPage (public)
│       │   └── ProtectedRoute (auth guard)
│       │       └── Layout (nav, sidebar, main content)
│       │           └── [Page Component]
│       └── ToastContainer
```

### Routing Structure

All routes defined in `App.tsx` using React Router v6. Lazy-loaded with `React.lazy()` + `Suspense`.

| Route | Page | Auth |
|-------|------|------|
| `/login` | LoginPage | No (redirects to /dashboard if authed) |
| `/register` | RegisterPage | No |
| `/dashboard` | DashboardPage | Yes |
| `/recipes` | RecipesPage | Yes |
| `/recipes/:id` | RecipeDetailPage | Yes |
| `/generate` | GenerateRecipePage | Yes |
| `/meal-plans` | MealPlansPage | Yes |
| `/meal-plans/:id` | MealPlanDetailPage | Yes |
| `/grocery` | GroceryListsPage | Yes |
| `/grocery/:id` | GroceryListDetailPage | Yes |
| `/pantry` | PantryPage | Yes |
| `/settings` | SettingsPage | Yes |

### State Management

- **AuthContext**: Login state, user info, JWT token. Persisted in `localStorage`.
- **ToastContext**: Notification queue. Methods: `showSuccess()`, `showError()`, `showWarning()`, `showInfo()`.
- **No global state library** (no Redux/Zustand). Page-level state with `useState`/`useEffect`.

### Service Layer

Services are singleton instances wrapping an axios client (`api.ts`):

```typescript
// api.ts creates axios instance with baseURL from VITE_API_URL
// Auth interceptor adds Bearer token from localStorage

// Service pattern:
class RecipeService {
  async getRecipes(...): Promise<Recipe[]> {
    const response = await api.get<Recipe[]>('/recipes/');
    return response.data;
  }
}
export default new RecipeService();
```

### SSE Streaming

Recipe generation uses raw `fetch()` (not axios) for Server-Sent Events, behind one hook:

```typescript
// hooks/useRecipeStream.ts — the only thing pages use
const { stage, thinking, draft, recipe, error, elapsedMs, start, cancel, reset } = useRecipeStream();

// services/sse.ts — spec-compliant parser: named events, multi-line data, LF/CRLF/CR,
//   chunks split anywhere; readSSE(body) yields {event, data, id?}
// services/recipe.service.ts — streamRecipe(request, {signal, onEvent}) adds the Bearer
//   token, maps HTTP failures to RecipeStreamError {message, retryable, status}, validates
//   event names and JSON, and resolves after the terminal complete/error event.
```

The hook buffers `thinking` deltas and `draft` snapshots and flushes them at most once per
animation frame, aborts on unmount, `cancel()` and a new `start()`, and turns a 90s timeout
into a retryable error.

## AI Integration

### Agent Configuration

- **Providers** (`agents/pydantic_recipe_agent.py`): `LLM_PROVIDER` = `auto` (default) |
  `grok` | `together` | `demo`. `auto` prefers Grok when `GROK_API_KEY` is set, then Together,
  then the offline demo model unless `ENVIRONMENT` is production (then 503). Placeholder keys
  from `env.example` count as missing. `GET /health` reports the resolved provider.
- **Default models**: Grok `grok-4-1-fast-reasoning`, Together `moonshotai/Kimi-K2.5`,
  demo `demo-chef`
- **Framework**: PydanticAI with `ToolOutput(RecipeLLM, name="final_recipe", strict=True)`,
  built by `build_recipe_agent(model)` (tests pass their own `FunctionModel`)
- **Dependencies**: `RecipeAgentDeps(db: Session, user_id: int)`
- **Config**: `retries=2`, `output_retries=4`, `max_tokens` from settings
- **Tools**: Disabled. User context is prefetched and included in the prompt.

### Demo Model (`agents/demo_model.py`)

A PydanticAI `FunctionModel` for local development and tests with no network calls. It reads
the labelled `- Label: value` lines of the prompt (labels are constants in
`services/recipe_generation.py`), picks one of ~10 dish templates by cuisine, meal type,
diet and must-use/avoid ingredients, adapts it (servings scaling, vegetarian/vegan swaps,
time limit, added ingredients), then streams ~2.5s of thinking deltas followed by the
`final_recipe` tool-call JSON in small chunks; about 7s end to end.
`DEMO_LLM_DELAY_SCALE` (default 1.0) scales the delays; `0` makes it instant.

### Structured Output Schema

```python
class RecipeLLM(BaseModel):
    name: str
    description: str
    cuisine: str
    ingredients: list[IngredientLLM]   # name, quantity, unit, notes
    instructions: list[str]
    prep_time_minutes: int
    cook_time_minutes: int
    servings: int
    tags: list[str]
    nutrition: NutritionLLM            # calories, protein_g, carbs_g, fat_g, ...
    source_urls: list[str]

class RecipeDraft(BaseModel):          # same fields, all optional; streamed partial snapshots
    ...
```

### Streaming Pipeline (contract v2)

| Module | Role |
|--------|------|
| `api/endpoints/recipes.py` | Thin endpoint: resolves the agent (503 if none), returns `StreamingResponse(with_keepalive(generate_recipe_events(...)))` |
| `services/recipe_stream.py` | `generate_recipe_events()` runs the pipeline and yields SSE frames; `with_keepalive()` adds pings; `describe_error()` maps exceptions to `(message, retryable)` |
| `services/recipe_generation.py` | `prefetch_user_context()`, `select_cuisine()`, `build_recipe_prompt()`, `save_generated_recipe()` |
| `services/recipe_responses.py` | `format_recipe_response()` / `format_feedback_response()`, shared by every recipe endpoint and the `complete` event |
| `db/database.py` | `get_session_factory()` dependency; the stream opens its own session because FastAPI 0.115 closes `get_db` sessions before a streaming body runs |

1. Emit `stage(context)`, open a session, prefetch context in a threadpool, build the prompt.
2. `agent.iter(prompt)`: for every model-request node, `node.stream(run.ctx)` yields
   `PartStartEvent`/`PartDeltaEvent`. `ThinkingPart`/`ThinkingPartDelta` (and plain text
   before the output tool call) become `thinking` frames. Once the `final_recipe` tool call
   starts, its accumulated argument JSON is validated with
   `TypeAdapter(RecipeDraft).validate_json(..., experimental_allow_partial="trailing-strings")`
   and emitted as `draft`, throttled to `RECIPE_STREAM_DRAFT_INTERVAL_SECONDS` (0.1s) and
   deduplicated. Output-validation retries simply continue streaming the next attempt.
   (`StreamedRunResult.stream_output()` isn't used: partial validation of the strict
   `RecipeLLM` fails until every required field exists, so it only yields at the very end.)
3. The run's final `RecipeLLM` is saved (`stage(saving)`), re-read through
   `format_recipe_response` and sent as `complete`.
4. Any exception becomes one `error` frame with a friendly message and `retryable`, while the
   traceback is logged. The whole run is bounded by `RECIPE_GENERATION_TIMEOUT_SECONDS`.
5. `with_keepalive` runs the pipeline in its own task and emits `ping` after
   `RECIPE_STREAM_PING_SECONDS` (15s) of silence. A client disconnect cancels that task, which
   cancels the model call; nothing is saved.

### User Context Prefetching

Instead of LLM tool calls, `prefetch_user_context()` gathers everything in four small queries
into a frozen `UserContext`:

1. User preferences (dietary restrictions, cuisines, nutritional goals)
2. Past recipe names (last 20, to avoid duplicates)
3. Rated feedback, split in Python into liked recipes (rating >= 4, best first, max 10) and
   disliked ingredients (rating <= 2, minus anything that also appears in liked recipes)
4. Pantry items (last 20)

`build_recipe_prompt()` turns the request plus context into labelled lines, skipping empty
sections.

## Infrastructure

### Docker Setup

**Development**: `docker-compose.yml` runs PostgreSQL 16 with pgvector extension.

```yaml
services:
  db:
    image: pgvector/pgvector:pg16
    ports: ["127.0.0.1:5432:5432"]
```

**Production**: `docker-compose.production.yml` adds backend + frontend containers.

### CI/CD

- **GitHub Actions**: Build + test pipeline
- **Pre-commit hooks**: Ruff (Python), tsc --noEmit (TypeScript), Prettier

### Deployment

- Cloudflare Tunnel for public access
- See `README-DEPLOYMENT.md` for production setup
