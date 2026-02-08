# Frontend Development Guide

## Page Overview

| Page | Path | File | Purpose |
|------|------|------|---------|
| Login | `/login` | `pages/LoginPage.tsx` | Email/password auth with split-screen layout |
| Register | `/register` | `pages/RegisterPage.tsx` | 3-step wizard: account, taste profile, fine-tuning |
| Dashboard | `/dashboard` | `pages/DashboardPage.tsx` | Stats overview, quick actions, recent recipes |
| Recipes | `/recipes` | `pages/RecipesPage.tsx` | Paginated grid with search, tag filters, sort |
| Recipe Detail | `/recipes/:id` | `pages/RecipeDetailPage.tsx` | Full recipe, feedback (like/rate/notes), grocery creation |
| Generate | `/generate` | `pages/GenerateRecipePage.tsx` | AI generation form with SSE streaming display |
| Meal Plans | `/meal-plans` | `pages/MealPlansPage.tsx` | Paginated list, create with date range |
| Meal Plan Detail | `/meal-plans/:id` | `pages/MealPlanDetailPage.tsx` | Weekly calendar, slot management, autofill, grocery generation |
| Grocery Lists | `/grocery` | `pages/GroceryListsPage.tsx` | Paginated list, create from recipes |
| Grocery Detail | `/grocery/:id` | `pages/GroceryListDetailPage.tsx` | Category-grouped checklist, email sharing |
| Pantry | `/pantry` | `pages/PantryPage.tsx` | Inventory with expiry tracking, "use in recipe" action |
| Settings | `/settings` | `pages/SettingsPage.tsx` | 8-tab preferences editor, notifications |

## Component Library

### Layout Components

**`Layout.tsx`** - App shell with glassmorphic sticky header, desktop nav pills, mobile hamburger menu, profile dropdown. Wraps all protected page content.

**`ProtectedRoute.tsx`** - Auth guard. Redirects to `/login` if not authenticated, otherwise renders `<Layout>{children}</Layout>`.

**`Breadcrumbs.tsx`** - Navigation breadcrumbs with optional home icon.
```tsx
<Breadcrumbs items={[
  { label: 'Recipe Vault', href: '/recipes' },
  { label: recipe.name }  // no href = current page
]} />
```

### UI Components (`components/ui/`)

**`PageHeader`** - Page title with optional subtitle, badge, and action buttons.
```tsx
<PageHeader
  title="Recipe Vault"
  subtitle="Browse and manage your saved recipes"
  actions={<Link to="/generate" className="btn-primary">New recipe</Link>}
/>
```

**`SectionCard`** - Glassmorphic card container with optional header, subtitle, and action slot.
```tsx
<SectionCard title="Ingredients" action={<button>Edit</button>}>
  {/* content */}
</SectionCard>
```

**`StatPill`** - Compact stat display. Tones: `default`, `success`, `warn`, `warm`.
```tsx
<StatPill label="Total recipes" value={42} tone="warm" />
```

**`EmptyState`** - Placeholder for empty lists with icon, title, description, and CTA.
```tsx
<EmptyState
  icon={<RecipeBookIcon />}
  title="No recipes yet"
  description="Generate your first recipe"
  action={<Link to="/generate" className="btn-primary">Generate</Link>}
/>
```

**`ConfirmDialog`** - Modal confirmation dialog. Tones: `default`, `danger`.
```tsx
<ConfirmDialog
  isOpen={showDelete}
  title="Delete recipe?"
  description="This cannot be undone."
  confirmLabel="Delete"
  tone="danger"
  loading={deleting}
  onConfirm={handleDelete}
  onCancel={() => setShowDelete(false)}
/>
```

**`ModalShell`** - Generic modal container. Sizes: `sm`, `md`, `lg`.
```tsx
<ModalShell isOpen={show} title="Add item" onClose={() => setShow(false)}
  footer={<button className="btn-primary" onClick={save}>Save</button>}>
  {/* form fields */}
</ModalShell>
```

**`ToolbarRow`** - Toolbar container for search/filter controls with helper text.

**`InlineStatus`** - Status indicator dot with label. Tones: `success`, `warning`, `error`, `neutral`.

**`InfoBadge`** - Small badge component.

**`SkeletonShimmer`** - Loading skeleton with shimmer animation.

**`ToastContainer`** - Renders active toast notifications (bottom-right, auto-dismiss 3s).

**`AppIcons`** - 40+ icon components from Heroicons v2 plus custom SVG icons (HungryHelperLogo, CalendarMealIcon, RecipeBookIcon, etc.).

### Recipe Components

| Component | Purpose |
|-----------|---------|
| `RecipeForm.tsx` | Generation form: meal type, cuisine, difficulty, ingredients, servings |
| `RecipeHeaderCard.tsx` | Recipe header with image and metadata |
| `QuickInfoCard.tsx` | Time, servings, difficulty at a glance |
| `IngredientsCard.tsx` | Ingredient list display |
| `InstructionsCard.tsx` | Step-by-step instructions |
| `NutritionCard.tsx` | Nutrition facts display |

### Other Components

**`LoadingModal.tsx`** - Recipe generation progress modal with 3-phase stepper (gathering inspiration, selecting ingredients, crafting recipe). Shows thinking indicator dots.

**`PreferenceComponents.tsx`** - Settings page form sections for each preference category.

## Design System

### CSS Custom Properties

```css
/* Primary - Warm orange */
--primary: #e85d04;
--primary-hover: #d14b00;
--primary-soft: rgba(232, 93, 4, 0.12);

/* Secondary - Teal */
--secondary: #0d9488;

/* Semantic */
--success: #059669;
--error: #dc2626;
--warning: #d97706;

/* Neutrals - Warm stone scale */
--text-primary: #1c1917;
--text-secondary: #57534e;
--text-muted: #a8a29e;
--surface: #ffffff;
--page-bg: #fafaf9;
```

### Fonts

- **Primary**: Plus Jakarta Sans (body text, UI)
- **Display**: Manrope (headings)
- **Fallback**: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto

### Button Classes

| Class | Style |
|-------|-------|
| `.btn-primary` | Orange gradient, pill shape, lift on hover, multi-layer shadow |
| `.btn-secondary` | White gradient, subtle border, lift on hover |
| `.btn-danger` | Red gradient, same hover pattern |
| `.btn-ghost` | Minimal border, transparent background |

### Card Classes

| Class | Style |
|-------|-------|
| `.card` | Rounded-3xl, gradient background, multi-layer shadow |
| `.card-hover` | Lift on hover with enhanced shadow |
| `.glass-panel` | Backdrop-blur-2xl, semi-transparent, inner glow |
| `.surface` / `.surface-muted` / `.surface-warm` | Background variants |

### Input Classes

`.input` - Rounded-2xl, gradient background, focus glow ring with `--primary` color.

### Animations

**Entry**: `animate-fade-in`, `animate-slide-in-up`, `animate-scale-in`
**Interactive**: `animate-heartbeat`, `animate-strike`, `animate-check-in`, `animate-bounce-in`
**Loading**: `animate-shimmer`, `animate-warm-glow`
**Success**: `animate-celebration-glow`, `animate-success-ripple`

Staggered entry pattern:
```tsx
<div
  className="opacity-0 animate-slide-in-up"
  style={{ animationDelay: `${index * 75}ms`, animationFillMode: 'forwards' }}
/>
```

All animations respect `prefers-reduced-motion: reduce`.

## State Management

### AuthContext

```typescript
interface AuthContextType {
  isAuthenticated: boolean;
  login: () => void;   // Re-checks auth state
  logout: () => void;  // Clears token, updates state
  loading: boolean;    // True during initial auth check
}

// Usage
const { isAuthenticated, login, logout, loading } = useAuth();
```

JWT stored in `localStorage` as `access_token`. The axios interceptor in `api.ts` attaches it to all requests and calls `logout()` on 401 responses.

### ToastContext

```typescript
const { addToast } = useToast();
addToast('Recipe saved!', 'success');
addToast('Failed to delete', 'error');
addToast('Check your email', 'info');
addToast('Unsaved changes', 'warning');
```

Toasts auto-dismiss after 3 seconds. Rendered by `ToastContainer`.

## Service Layer

Services are singleton class instances wrapping the axios client from `api.ts`.

```typescript
// Pattern: all services follow this structure
class SomeService {
  async getItems(params): Promise<PaginatedResponse<Item>> {
    const response = await api.get<PaginatedResponse<Item>>('/some/list', { params });
    return response.data;
  }
}
export default new SomeService();
```

### SSE Streaming (recipe.service.ts)

Recipe generation uses raw `fetch()` instead of axios for Server-Sent Events:

```typescript
const response = await fetch(`${baseURL}/recipes/generate/stream`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  body: JSON.stringify(request),
  signal: options.signal,  // AbortController for cancellation
});

const reader = response.body.getReader();
// Read chunks, split by newlines, parse "data: {json}" lines
// Dispatch to typed StreamCallbacks
```

**StreamCallbacks interface** provides handlers for each event type:
`onThinkingStart`, `onThinking`, `onThinkingEnd`, `onRecipeName`, `onRecipeDescription`, `onIngredient`, `onInstruction`, `onNutrition`, `onComplete`, `onError`

Always pass an `AbortSignal` for cancellation support.

## Testing Patterns

### Setup

- **Runner**: Vitest with jsdom environment
- **Libraries**: @testing-library/react, @testing-library/user-event
- **Config**: `vitest.config.ts` with `globals: true`, `css: true`
- **Setup file**: `src/test/setup.ts` mocks window APIs (matchMedia, scrollTo, localStorage, ResizeObserver)

### Custom Render

```typescript
// src/test/utils.tsx
import { render } from '@testing-library/react';

function customRender(ui: React.ReactElement) {
  return render(ui, {
    wrapper: ({ children }) => (
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    ),
  });
}
```

### Mock Data

`src/test/mocks.ts` provides reusable test fixtures: `mockUser`, `mockRecipe`, `mockGroceryList`, `mockMealPlan`.

### Common Patterns

```typescript
// Mock a service
vi.mock('../services/recipe.service', () => ({
  default: {
    getRecipesPaginated: vi.fn().mockResolvedValue({ items: [], total: 0, ... }),
  },
}));

// Test component
import { customRender } from '../test/utils';
it('shows loading state', async () => {
  customRender(<RecipesPage />);
  expect(screen.getByText(/loading/i)).toBeInTheDocument();
});
```

### Running Tests

```bash
pnpm run test              # Run all tests once
pnpm run test:watch        # Watch mode
pnpm run test:coverage     # Coverage report
```

## Pagination Pattern

All list pages follow the same pattern:

```typescript
const [page, setPage] = useState(1);
const [totalPages, setTotalPages] = useState(0);
const [searchInput, setSearchInput] = useState('');
const [searchQuery, setSearchQuery] = useState('');

// Debounced search (250ms)
useEffect(() => {
  const timer = setTimeout(() => { setSearchQuery(searchInput); setPage(1); }, 250);
  return () => clearTimeout(timer);
}, [searchInput]);

// Load data when page/query changes
const loadData = useCallback(async () => {
  const result = await service.getListPaginated({ page, page_size: 12, q: searchQuery || undefined });
  setItems(result.items);
  setTotalPages(result.total_pages);
}, [page, searchQuery]);

useEffect(() => { loadData(); }, [loadData]);
```

## Date Utilities

Always use `utils/date.ts` for date-only values:

```typescript
import { parseLocalIsoDate, toLocalIsoDate, formatLocalDate } from '../utils/date';

// Parse "YYYY-MM-DD" as local date (avoids UTC midnight → wrong day bug)
const date = parseLocalIsoDate('2026-01-15');

// Convert Date back to "YYYY-MM-DD" string
const isoStr = toLocalIsoDate(new Date());

// Format for display
const display = formatLocalDate('2026-01-15'); // "January 15, 2026"
```
