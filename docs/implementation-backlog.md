# Hungry Helper Implementation Backlog

## Scope
This backlog converts the current product/design/engineering review into executable work with priorities, dependencies, and acceptance criteria.

## Milestones
- `M1` Reliability + Flow Safety (P0)
- `M2` Core Flow UX Upgrade (Planner, Pantry, Grocery)
- `M3` Performance + Scale + Coverage

## Priority Legend
- `P0` critical reliability or correctness
- `P1` high-value product feature
- `P2` optimization and quality hardening

---

## EPIC A: Reliability and Correctness (`M1`)

### A1. Scheduler cadence fix (`P0`)
- **Problem**: Weekly reminder scheduler currently runs at midnight daily despite hourly intent.
- **Dependencies**: none
- **Tasks**:
  1. Update APScheduler trigger to run hourly at minute `0`.
  2. Align code comments/logs with actual behavior.
  3. Add/extend test coverage for trigger configuration.
- **Acceptance Criteria**:
  1. Scheduler job runs hourly, not once daily at midnight.
  2. Existing reminder logic works unchanged after trigger update.

### A2. Meal plan date-range validation (`P0`)
- **Problem**: API accepts invalid range where `start_date > end_date`.
- **Dependencies**: none
- **Tasks**:
  1. Add schema-level validator in `MealPlanBase`.
  2. Add DB-level check constraint to `meal_plans`.
  3. Add migration and API tests for invalid range.
- **Acceptance Criteria**:
  1. Invalid range is rejected with 422/400 from API.
  2. Database enforces the constraint independently.

### A3. Local date rendering consistency in frontend (`P0`)
- **Problem**: `new Date('YYYY-MM-DD')` can render wrong day in non-UTC timezones.
- **Dependencies**: none
- **Tasks**:
  1. Add date utility: parse local ISO date and format display date.
  2. Replace direct `new Date(dateString)` usage in meal-plan pages.
  3. Add tests around date formatting utility.
- **Acceptance Criteria**:
  1. Display date is stable across timezones for stored local calendar dates.

### A4. React hook dependency cleanup (`P0`)
- **Problem**: multiple pages have `react-hooks/exhaustive-deps` warnings.
- **Dependencies**: none
- **Tasks**:
  1. Wrap loaders in `useCallback`.
  2. Adjust `useEffect` dependency arrays.
  3. Ensure no behavior regression.
- **Acceptance Criteria**:
  1. `pnpm lint` has no `exhaustive-deps` warnings for these pages.

---

## EPIC B: Backend Scalability and Code Health (`M1/M3`)

### B1. DB-native recipe tag filtering (`P0`)
- **Problem**: paginated recipes endpoint currently pulls all rows for tag filtering in Python.
- **Dependencies**: none
- **Tasks**:
  1. Replace in-memory filtering with SQL-level filtering.
  2. Keep compatibility for SQLite tests and Postgres prod.
  3. Add tests for tags + pagination interaction.
- **Acceptance Criteria**:
  1. Endpoint performs filtering in query path.
  2. Pagination counts are correct with tag filters.

### B2. Shared ingredient categorization service (`P1`)
- **Problem**: duplicated categorization logic in grocery and meal-plan endpoints.
- **Dependencies**: none
- **Tasks**:
  1. Create shared helper/service for ingredient categorization.
  2. Replace duplicated functions.
  3. Add unit tests for categorization behavior.
- **Acceptance Criteria**:
  1. Single source of truth for ingredient categories.
  2. Existing API outputs unchanged for representative inputs.

---

## EPIC C: Smart Weekly Planner (`M2`, `P1`)

### C1. Planner quick actions and flow polish
- **Dependencies**: EPIC A complete
- **Tasks**:
  1. Add quick actions row in meal-plan detail: `Copy previous week`, `Clear day`, `Clear week`.
  2. Add auto-save indicator and improved unsaved state messaging.
  3. Add lightweight slot-level validation (servings >= 1, optional duplicate warning).
- **Acceptance Criteria**:
  1. Users can execute common planning actions in <=2 clicks.
  2. Save state is always visible and understandable.

### C2. Plan health score card
- **Dependencies**: C1
- **Tasks**:
  1. Add score card with metrics: slot coverage, recipe variety, quick-meal ratio.
  2. Add recommendation text based on score deficits.
- **Acceptance Criteria**:
  1. Score updates reactively as slots change.

---

## EPIC D: Pantry Intelligence (`M2`, `P1`)

### D1. Expiry-aware pantry UI
- **Dependencies**: A3 date utilities
- **Tasks**:
  1. Add expiry capture/edit fields in Pantry create modal.
  2. Add `expiring soon` and `expired` badges.
  3. Add sorting/filtering chips: `Use soon`, `Recently updated`.
- **Acceptance Criteria**:
  1. Users can prioritize pantry items by urgency without leaving page.

### D2. Pantry-to-generation handoff
- **Dependencies**: D1
- **Tasks**:
  1. Add “Use in recipe” action from pantry page to prefill generator ingredients.
  2. Support query-param prefill on generate page.
- **Acceptance Criteria**:
  1. Pantry item can pre-populate recipe generation input in one click.

---

## EPIC E: Grocery Shop Mode (`M2`, `P1`)

### E1. Mobile-first shopping controls
- **Dependencies**: none
- **Tasks**:
  1. Add sticky quick actions: `Check all in category`, `Uncheck all`, `Collapse checked`.
  2. Add item count and progress microcopy refinements.
  3. Improve touch targets for checkbox and edit/delete actions.
- **Acceptance Criteria**:
  1. Faster completion for large lists on mobile.

### E2. Smart dedupe and aisle-order prep
- **Dependencies**: B2 shared categorization
- **Tasks**:
  1. Add backend dedupe normalization for ingredient names (trim/lower/basic singularization).
  2. Add deterministic category ordering for shop route.
- **Acceptance Criteria**:
  1. Generated grocery lists contain fewer duplicate semantic items.

---

## EPIC F: Performance and Delivery Quality (`M3`, `P2`)

### F1. Route-level code splitting
- **Dependencies**: none
- **Tasks**:
  1. Convert page imports in `App.tsx` to lazy-loaded routes.
  2. Add fallback loading UI.
- **Acceptance Criteria**:
  1. Initial JS bundle size reduced from current baseline.

### F2. Testing expansion
- **Dependencies**: EPIC A and B
- **Tasks**:
  1. Add frontend tests for meal-plan and pantry key behaviors.
  2. Add backend tests for date validation and tag filtering.
  3. Add scheduler unit tests for trigger behavior.
- **Acceptance Criteria**:
  1. New behaviors are covered by tests, and CI remains green.

---

## Delivery Sequence

1. `M1` A1, A2, A3, A4, B1, B2
2. `M2` C1, C2, D1, D2, E1, E2
3. `M3` F1, F2

## Definition of Done
- All implemented items pass:
  1. `frontend`: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`
  2. `backend`: `uv run pytest -q`
- No new lint warnings.
- No API contract regressions for existing clients.
