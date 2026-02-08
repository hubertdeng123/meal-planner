# Development Guide

## Quick Start

See [CLAUDE.md](../CLAUDE.md) for all dev commands. Here's the minimal path:

```bash
# Prerequisites: Python 3.11+, Node.js 18+, pnpm, uv, Docker
make doctor              # Check prerequisites
make quick-start         # Full setup + start dev servers
```

Or step by step:

```bash
make db-up               # Start PostgreSQL (Docker)
make db-create           # Create database
cd backend && uv sync && uv run alembic upgrade head
cd frontend && pnpm install
make dev                 # Start backend + frontend
```

Visit http://localhost:3000, create an account, and start planning meals.

## Adding a New Feature

### Backend Endpoint

1. **Schema** - Create/update Pydantic models in `backend/app/schemas/`:
   ```python
   # schemas/my_feature.py
   class MyItemCreate(BaseModel):
       name: str
       value: int

   class MyItem(MyItemCreate):
       id: int
       user_id: int
       created_at: datetime

       model_config = ConfigDict(from_attributes=True)
   ```

2. **Model** (if new table) - Add SQLAlchemy model in `backend/app/models/`:
   ```python
   class MyItem(Base):
       __tablename__ = "my_items"
       id = Column(Integer, primary_key=True, index=True)
       user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
       name = Column(String, nullable=False)
       # ...
   ```

3. **Migration** (if new/changed table):
   ```bash
   cd backend
   uv run alembic revision --autogenerate -m "add my_items table"
   # Review the generated migration file!
   uv run alembic upgrade head
   ```

4. **Endpoint** - Add route handler in `backend/app/api/endpoints/`:
   ```python
   # endpoints/my_feature.py
   router = APIRouter()

   @router.post("/", response_model=MyItem, status_code=status.HTTP_201_CREATED)
   async def create_item(
       item_data: MyItemCreate,
       current_user: User = Depends(get_current_active_user),
       db: Session = Depends(get_db),
   ):
       item = MyItemModel(user_id=current_user.id, **item_data.model_dump())
       db.add(item)
       db.commit()
       db.refresh(item)
       return item
   ```

5. **Register router** in `backend/app/main.py`:
   ```python
   from app.api.endpoints import my_feature
   app.include_router(my_feature.router, prefix=f"{settings.API_PREFIX}/my-feature", tags=["my-feature"])
   ```

6. **Tests** - Write tests in `backend/tests/api/`:
   ```python
   def test_create_item(client, auth_headers):
       response = client.post("/api/v1/my-feature/", json={"name": "test"}, headers=auth_headers)
       assert response.status_code == 201
   ```

### Frontend Page

1. **Types** - Add interfaces in `frontend/src/types/index.ts`

2. **Service** - Create `frontend/src/services/myFeature.service.ts`:
   ```typescript
   class MyFeatureService {
     async getItems(): Promise<PaginatedResponse<MyItem>> {
       const response = await api.get<PaginatedResponse<MyItem>>('/my-feature/list');
       return response.data;
     }
   }
   export default new MyFeatureService();
   ```

3. **Page** - Create `frontend/src/pages/MyFeaturePage.tsx` using existing patterns:
   - Use `PageHeader` for title
   - Use `SectionCard` for content sections
   - Use pagination pattern (see [frontend-guide.md](./frontend-guide.md))

4. **Route** - Add to `frontend/src/App.tsx`:
   ```tsx
   const MyFeaturePage = lazy(() => import('./pages/MyFeaturePage'));
   // In routes:
   <Route path="/my-feature" element={<ProtectedRoute><MyFeaturePage /></ProtectedRoute>} />
   ```

5. **Navigation** (optional) - Add to `Layout.tsx` navigation array

### Full-Stack Feature Checklist

- [ ] Backend schema (Pydantic)
- [ ] Backend model (SQLAlchemy) + migration
- [ ] Backend endpoint with auth
- [ ] Backend tests
- [ ] Frontend types
- [ ] Frontend service
- [ ] Frontend page/component
- [ ] Frontend route
- [ ] `uv run ruff check .` passes
- [ ] `pnpm run lint && pnpm run typecheck` passes
- [ ] `pnpm run build` succeeds

## Testing

### Backend (pytest)

```bash
cd backend
uv run pytest                    # Run all tests
uv run pytest tests/api/         # Run API tests only
uv run pytest -k "test_recipe"   # Run matching tests
uv run pytest -x                 # Stop on first failure
```

**Key patterns**:
- Tests use SQLite in-memory (not PostgreSQL)
- Fixtures provide `client`, `db`, `auth_headers`
- Tag filtering uses `json_each()` on SQLite vs `ARRAY.contains()` on PostgreSQL

### Frontend (Vitest)

```bash
cd frontend
pnpm run test                    # Run all tests once
pnpm run test:watch              # Watch mode
pnpm run test:coverage           # With coverage report
```

**Key patterns**:
- Use `customRender()` from `src/test/utils.tsx` (wraps with providers)
- Mock services with `vi.mock()`
- Mock data in `src/test/mocks.ts`
- Setup file mocks browser APIs (localStorage, matchMedia, etc.)

## Database Changes

### Alembic Workflow

```bash
cd backend

# 1. Make model changes in app/models/

# 2. Generate migration
uv run alembic revision --autogenerate -m "describe the change"

# 3. Review the generated file in alembic/versions/
#    - Check column types, constraints, indexes
#    - Verify downgrade() reverses the upgrade()
#    - Add data migrations if renaming columns

# 4. Apply
uv run alembic upgrade head

# 5. Verify
uv run alembic current
```

### Migration Review Checklist

- [ ] Column types match the SQLAlchemy model
- [ ] Foreign keys have proper cascade behavior
- [ ] Indexes added for frequently queried columns
- [ ] `downgrade()` correctly reverses all changes
- [ ] Data migrations preserve existing data (e.g., column renames)
- [ ] Check constraints are enforced (e.g., `start_date <= end_date`)

### Useful Commands

```bash
uv run alembic history           # Show migration history
uv run alembic current           # Show current revision
uv run alembic downgrade -1      # Roll back one migration
uv run alembic upgrade head      # Apply all pending migrations
```

## Code Quality

### Pre-commit Hooks

Install once:
```bash
cd backend && uv run pre-commit install
```

Runs automatically on `git commit`:
- **Ruff** (Python): formatting + linting
- **tsc --noEmit** (TypeScript): type checking
- **Prettier**: code formatting
- YAML/JSON validation, trailing whitespace

Run manually:
```bash
uv run pre-commit run --all-files
```

### Manual Checks

```bash
# Backend
cd backend
uv run ruff check .              # Lint
uv run ruff format .             # Format
uv run pytest                    # Tests

# Frontend
cd frontend
pnpm run lint                    # ESLint
pnpm run typecheck               # TypeScript
pnpm run test                    # Vitest
pnpm run build                   # Production build
pnpm run format                  # Prettier
```

### What Must Pass Before Merge

1. `uv run ruff check .` - no lint errors
2. `uv run pytest -q` - all tests pass
3. `pnpm run lint` - no ESLint errors
4. `pnpm run typecheck` - no TypeScript errors
5. `pnpm run test` - all tests pass
6. `pnpm run build` - production build succeeds

## Known Issues & Backlog

See [implementation-backlog.md](./implementation-backlog.md) for the prioritized backlog organized by milestone:

- **M1** (Reliability): Scheduler fix, date validation, frontend date consistency, hook cleanup, tag filtering perf, shared ingredient service
- **M2** (Core UX): Planner quick actions, plan health score, pantry intelligence, grocery shop mode
- **M3** (Performance): Route-level code splitting, testing expansion
