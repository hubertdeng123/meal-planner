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
                        │   FastAPI Backend    │────────▶│  Together AI │
                        │   localhost:8000     │  REST   │ (DeepSeek R1)│
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
  Backend ──▶ Braintrust (LLM tracing via OpenTelemetry)
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
│   ├── agents/              # PydanticAI agent definitions
│   ├── core/
│   │   ├── config.py        # Settings from environment variables
│   │   ├── security.py      # JWT creation/verification, password hashing
│   │   ├── rate_limit.py    # slowapi rate limiter
│   │   └── exceptions.py    # Custom exception classes
│   ├── db/
│   │   └── database.py      # SQLAlchemy engine + session factory
│   ├── models/              # SQLAlchemy ORM models
│   ├── schemas/             # Pydantic request/response schemas
│   └── services/            # Business logic services
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
| **Services** (`services/`) | Cross-cutting business logic (email, scheduling, ingredient processing) |
| **Agents** (`agents/`) | AI model configuration, structured output schemas |
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
| **Braintrust** | LLM call tracing and evaluation | `init_logger(project="Hungry Helper")` + OpenTelemetry span processor |
| **OpenTelemetry** | Distributed tracing | `TracerProvider` with `BraintrustSpanProcessor` |
| **Python logging** | Application logs | File (`app.log`) + stdout, INFO level |

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

Recipe generation uses raw `fetch()` (not axios) for Server-Sent Events:

```typescript
// StreamCallbacks interface defines typed handlers for each event:
// onThinkingStart, onThinking, onThinkingEnd,
// onRecipeName, onRecipeDescription, onIngredient, onInstruction,
// onNutrition, onComplete, onError

// Key implementation details:
// - Uses ReadableStream with TextDecoder for chunked parsing
// - SSE lines prefixed with "data: " containing JSON
// - AbortSignal for cancellation support
// - Buffer handles partial lines across chunks
```

## AI Integration

### Agent Configuration

- **Model**: DeepSeek R1-0528 via Together AI (`deepseek-ai/DeepSeek-R1-0528`)
- **Framework**: PydanticAI with `NativeOutput(RecipeLLM)` for JSON schema `response_format`
- **Dependencies**: `RecipeAgentDeps(db: Session, user_id: int)`
- **Tools**: Disabled. User context is prefetched and included in the prompt.

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
```

### Streaming Protocol

1. DeepSeek R1 emits `<think>...</think>` reasoning tokens before structured output
2. Backend parses `<think>` tags and yields SSE events: `thinking_start`, `thinking`, `thinking_end`
3. After thinking completes, `result.get_output()` returns structured `RecipeLLM`
4. Backend yields recipe fields as individual SSE events for progressive UI rendering
5. Recipe is saved to DB, `complete` event sent with `recipe_id`

### User Context Prefetching

Instead of LLM tool calls, the backend prefetches all user context in ~3 SQL queries:

1. User preferences (dietary restrictions, cuisines, nutritional goals)
2. Past recipes (last 20 names to avoid duplicates) + feedback (liked/disliked analysis)
3. Pantry items (last 20 items for ingredient suggestions)

This context is formatted into the user prompt, avoiding tool-calling latency.

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
