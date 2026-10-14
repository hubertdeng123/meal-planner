# Frontend Development Guide

UX principles, flows and the reasoning behind each page live in
[`docs/redesign/UX.md`](./redesign/UX.md). This guide covers how the code is organised.

## Page Overview

| Page | Path | File | Purpose |
|------|------|------|---------|
| Login | `/login` | `pages/LoginPage.tsx` | Email/password sign-in |
| Register | `/register` | `pages/RegisterPage.tsx` | 3-step wizard: account, taste profile, fine-tuning |
| Today | `/dashboard` | `pages/DashboardPage.tsx` | Tonight's dinner, week strip, next actions, use-soon pantry, recent recipes |
| Recipes | `/recipes` | `pages/RecipesPage.tsx` | Search, facet chips (cuisine, favourites, quick), sort, load more |
| Recipe detail | `/recipes/:id` | `pages/RecipeDetailPage.tsx` | Servings scaling, ingredient checklist, cook mode, add to plan, feedback |
| Generate | `/generate` | `pages/GenerateRecipePage.tsx` | Brief form + live streaming draft via `useRecipeStream()`; accepts `?use=a,b` |
| Meal plans | `/meal-plans` | `pages/MealPlansPage.tsx` | Current week card, upcoming/past weeks, one-tap "plan this week" |
| Planner | `/meal-plans/:id` | `pages/MealPlanDetailPage.tsx` | 7-day grid (day switcher on mobile), recipe picker, autosave, plan health |
| Groceries | `/grocery` | `pages/GroceryListsPage.tsx` | To shop / done lists, new list from plan, recipes or empty |
| Shopping list | `/grocery/:id` | `pages/GroceryListDetailPage.tsx` | Shopping mode: quick add, aisle sections, progress, "in the cart" |
| Pantry | `/pantry` | `pages/PantryPage.tsx` | Quick add with shelf life, expiry states, multi-select "cook with these" |
| Settings | `/settings` | `pages/SettingsPage.tsx` | Anchored sections with a single sticky save bar |
| Not found | `*` | `pages/NotFoundPage.tsx` | 404 inside the app shell |

All pages are lazy-loaded in `App.tsx`. Protected pages render inside `Layout`, which wraps
its content in a `Suspense` boundary with `PageSkeleton`, so the shell never disappears
while a page chunk loads.

## Component Library

### Shell

- **`Layout.tsx`**: sidebar on desktop, sticky `h-14` header plus bottom tab bar on mobile, user
  menu. Exactly one `<nav>` landmark. `mode="focus"` narrows the content width (generate,
  shopping list).
- **`ProtectedRoute.tsx`**: redirects to `/login` when signed out, otherwise renders `Layout`.
- **`AuthLayout.tsx`**: split layout for login and register.

Page-level sticky bars must use `top-14 lg:top-0` to clear the mobile header. Fixed bottom bars
use `bottom-[calc(4.5rem+env(safe-area-inset-bottom))] lg:bottom-6 lg:pl-[var(--sidebar-width)]`
to clear the tab bar and sidebar.

### UI primitives (`components/ui/`)

| Component | Use it for |
|-----------|-----------|
| `AppIcons` | Every icon. Heroicons wrapped with `withHeroIcon`, plus `HungryHelperLogo`. Don't import Heroicons directly. |
| `ChipInput` | Free-text tags (ingredients, emails). Enter/comma adds, Backspace removes, optional suggestions. |
| `ChoiceChips` / `MultiChoiceChips` | Single/multi select as `aria-pressed` chips in a labelled `role="group"`. Prefer over radios/checkboxes. |
| `SegmentedControl` | 2–4 mutually exclusive views (sort modes, list source). |
| `Stepper` | Bounded numeric input (servings). |
| `Toggle` / `PreferenceToggle` | Boolean settings (`role="switch"`). |
| `PreferenceNumberInput` | Optional number with a unit suffix. |
| `SearchInput` | Search field with clear button. |
| `OverflowMenu` | Secondary/destructive actions behind a "More" button (Headless UI `Menu`). |
| `ModalShell` | Dialog container; title wired to `aria-labelledby`. |
| `ConfirmDialog` | Confirmation for destructive actions. |
| `EmptyState` / `ErrorState` | Empty lists and failed loads (`ErrorState` takes `onRetry`). |
| `Skeletons` | `PageSkeleton` and `SkeletonGrid` (`recipe` / `card` / `row`). Use these instead of spinners for loading content. |
| `PageLoader` | Exports `Spinner` for inline button busy states only. |
| `RecipeCover` | Deterministic illustrated cover for recipes without photos. |
| `PageHeader` | Title, subtitle and actions row. |
| `ToastContainer` | Renders toasts from `ToastContext` (mounted once in `App`). |

### Feature components

| Folder | Components |
|--------|-----------|
| `generate/` | `RecipeBrief` (form), `StageTimeline`, `LiveRecipeCard` (renders partial drafts defensively), `ChefNotes` (thinking stream); `brief.ts` and `pipeline.ts` hold non-component helpers |
| `recipe/` | `RecipeCard`, `IngredientChecklist`, `NutritionTiles`, `CookMode` (full-screen step-by-step, keyboard + wake lock) |
| `mealplan/` | `RecipePicker` (searchable slot picker), `AddToPlanDialog` |
| `grocery/` | `GroceryRow` (tap-to-check + inline edit), `NewListDialog`, `EmailListDialog` |
| root | `PreferenceComponents.tsx`: `TastePreferences`, `IngredientPreferences`, `RoutinePreferences`, `NutritionPreferences` |

Non-component exports (helpers, constants, types) go in `.ts` files so
`react-refresh/only-export-components` stays clean.

## Utilities (`utils/`)

| File | Contents |
|------|----------|
| `date.ts` | `parseLocalIsoDate`, `toLocalIsoDate`, `formatLocalDate`, `todayIso`, `addDaysIso`, `getDateRange`, `getWeekRange`, `daysFromToday`, `formatRange`, `formatRelativeDay` |
| `recipe.ts` | `totalMinutes`, `formatMinutes`, `formatQuantity`, `formatAmount`, `isQuick`, `dietaryTags`, `hasNutrition` |
| `mealPlan.ts` | `PLAN_MEAL_TYPES`, `MEAL_LABELS`, `slotKey`, `indexItems`, `itemRecipeName`, `computePlanHealth` |
| `grocery.ts` | `AISLE_ORDER`, `parseQuickAdd` ("2 cups rice"), `groupByAisle`, `formatItemAmount`, `isValidEmail` |
| `pantry.ts` | `expiryState`, `expiryLabel`, `USE_SOON_DAYS`, `generateHref(names)` → `/generate?use=a,b` |

Never call `new Date('YYYY-MM-DD')`; it parses as UTC midnight and shifts the day in US time
zones. Use `parseLocalIsoDate()`.

## Hooks

- **`useAuth()`**: `{ isAuthenticated, login, logout, loading }`.
- **`useCurrentUser()`**: the signed-in `User` (module-cached; call `clearCachedUser()` on logout).
- **`useRecipeStream()`** (engineer-owned): `{ stage, thinking, draft, recipe, error, elapsedMs,
  start, cancel, reset }`. `cancel()` keeps the partial draft; `error.retryable` decides whether
  to offer "Try again". Don't write another SSE client.

## Design System

Tokens live in `src/index.css` and `tailwind.config.js`.

- **Colour**: `primary` herb green (`--primary`, `-hover`, `-soft`, `-ink`), `accent` tomato
  (`--accent`, `-soft`, `-ink`), `paper` page background, stone neutrals.
- **Type**: Inter for UI, Fraunces (`font-display`) for headings.
- **Buttons**: `btn-primary`, `btn-secondary`, `btn-ghost`, `btn-danger`, `btn-accent`, sizes
  `btn-sm` / `btn-lg`; `icon-button` (`-muted`, `-outline`, `-danger`).
- **Surfaces**: `card`, `card-hover`, `surface`, `surface-muted`, `surface-warm`.
- **Text**: `eyebrow`, `page-title`, `page-subtitle`, `section-title`, `label`, `helper-text`, `link`.
- **Controls**: `input`, `chip` / `chip-active`, `tag`, `segmented*`, `nav-item(-active)`,
  `icon-tile(-sm|-lg|-accent|-amber|-stone)`.
- **Feedback**: `progress-track` / `progress-bar`, `skeleton`.
- **Motion**: `animate-fade-in`, `animate-slide-in-up`, `animate-scale-in`, `stagger`. Every
  animation is disabled under `prefers-reduced-motion: reduce`.

Interactive elements get a visible `focus-visible` ring; tap targets are at least 44px on mobile.

## State and Data

- **Toasts**: `const { addToast } = useToast(); addToast('Saved.', 'success')`.
- **Services**: singleton instances in `services/` wrapping axios (`api.ts` attaches the JWT and
  logs out on 401). Pages call services directly; there is no global data store.
- **Optimistic updates**: grocery checks, planner slots and servings update locally first and
  roll back with an error toast if the request fails. The planner debounces servings changes
  (500ms) and shows a save indicator instead of a Save button.
- **Lists**: services keep their paginated APIs; pages use "Load more" rather than numbered
  pagination, with a 250ms debounced `q` search.

## Testing

- **Runner**: Vitest (jsdom) + Testing Library + `user-event`.
- **Render helper**: `render` from `src/test/utils` wraps Router, `AuthProvider` and
  `ToastProvider`. `AuthProvider` calls `authService.isAuthenticated()`, so any test that mocks
  `auth.service` must include it.
- Toasts are not rendered in page tests (the container lives in `App`); assert on state instead.
- Query by role and accessible name (`getByRole('button', { name: 'Add item' })`), not class names.

```bash
pnpm run test           # all tests once
pnpm run test:watch
pnpm run test:coverage
```
