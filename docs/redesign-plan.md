# Hungry Helper — Product, UX & Visual Redesign Specification

**Author**: Product/UX Lead (Role #1)  
**Status**: Approved Engineering Specification  
**Scope**: Full-stack Frontend Redesign (`/workspace/frontend/src/`) — Visual Identity, Design System Tokens, Information Architecture, Navigation, Page Layouts, and Interactive User Flows.  
**Constraint**: 100% backward compatibility with existing backend APIs (`app/api/endpoints/*`), service layers (`src/services/*`), data models (`src/types/*`), and existing automated test assertions (`src/**/__tests__/*.test.tsx`).

---

## 1. Executive Summary & Design Philosophy

### 1.1 Vision: The "Organic-Modern" Editorial Kitchen
Hungry Helper is evolving from a prototype utility with competing pastel gradients into an **editorial, tactile, calm kitchen companion** — inspired by the typographic warmth of *NYT Cooking* and *Bon Appétit*, the calm spatial rhythm of *Kinfolk*, and the crisp functional ergonomics of *Linear*.

Cooking and meal planning happen in high-distraction environments: standing at an open fridge on a Tuesday evening, glancing at a phone with flour-dusted hands at the stove, or walking grocery store aisles one-handed. The interface must feel **warm, grounded, high-contrast, scannable, and effortless**.

### 1.2 Core Aesthetic Principles
1. **Warm Editorial Surfaces over Neon Gradients**:
   - Replace the current multi-colored radial background blobs (pink `rgba(254, 205, 211)`, mint `rgba(209, 250, 229)`, yellow `rgba(254, 243, 199)`, orange `rgba(255, 237, 213)`) and heavy 5-layer drop shadows with tactile **warm alabaster/linen paper surfaces** (`#FAF7F2` page background, `#F3EFE6` muted stone containers, `#FFFFFF` crisp elevated recipe cards).
2. **Editorial Serif + Geometric Sans Typography**:
   - Pair **`Fraunces`** (optical-size variable editorial serif for page titles, recipe titles, and hero greetings) with **`Plus Jakarta Sans`** (clean, legible humanist sans-serif for UI controls, ingredient quantities, scannable lists, and metadata) and **`JetBrains Mono`** / tabular numerals (`tabular-nums`) for timers, nutrition macros, and ingredient measurements.
3. **Single Signature Accent + Semantic Botanical Sage**:
   - **Primary Accent — Terracotta / Burnt Sienna (`#C84B31`, hover `#B83B22`)**: Used purposefully for primary CTAs, active navigation indicators, and key interactive focal points. Meets **WCAG AA contrast (>4.8:1)** with crisp `#FFFFFF` text, without muddy text-shadows or 3-stop neon orange gradients.
   - **Semantic Freshness / Positive — Botanical Sage (`#3F624D`, soft `#ECF3EE`)**: Reserved strictly for positive semantic states (plan completion, checked grocery items, nutrition balance, fresh pantry status).
   - **Semantic Warning — Warm Ochre (`#B45309`, soft `#FEF3C7`)**: Used for expiring pantry items ("Use within 3 days") and repeated-recipe nudges.
   - **Semantic Danger — Crimson Clay (`#B91C1C`, soft `#FEE2E2`)**: Used for destructive actions and expired status.
4. **Refined Borders & Diffused Elevation**:
   - Replace heavy `0 32px 64px -16px` shadows and blurred neon `.panel-glow` pseudo-elements with crisp `1px solid` warm stone borders (`#E7E0D6` / `rgba(28, 25, 23, 0.09)`) and subtle, natural elevation (`0 2px 8px -2px rgba(28, 25, 23, 0.05), 0 8px 24px -4px rgba(28, 25, 23, 0.04)`).
   - Standardize card radii on `rounded-2xl` (`1rem`) for inner modules/inputs and `rounded-3xl` (`1.5rem`) for primary section containers.

---

## 2. Current App Audit (Concrete Codebase Findings)

A thorough audit of `/workspace/frontend/src/` revealed structural UX, IA, visual design, responsiveness, and accessibility issues across six product areas:

### 2.1 Navigation & Information Architecture (`Layout.tsx`, `App.tsx`, `ProtectedRoute.tsx`)
1. **"Focus Mode" Navigation Trap (`App.tsx` lines 90 & 106, `Layout.tsx` lines 108–114 & 200–221)**:
   - `/generate` (`GenerateRecipePage`) and `/grocery/:id` (`GroceryListDetailPage`) use `<ProtectedRoute mode="focus">`.
   - In `Layout.tsx`, `isFocusMode` **completely hides the primary navigation bar** (`navigation.map` is replaced with a desktop-only "Back to dashboard" button) and **hides the mobile hamburger menu button** (`isFocusMode ? 'hidden' : ''` on line 202)!
   - **Impact**: On mobile viewports (`<640px`), both the `hidden md:flex` "Back to dashboard" button and the `sm:hidden` menu button are hidden, trapping mobile users on `/generate` with only the brand logo as a hidden escape hatch.
2. **Hidden Dashboard Entry Point (`Layout.tsx` lines 23–29)**:
   - `navigation` contains 5 links (`Recipe Vault`, `Meal Plans`, `Grocery Lists`, `Pantry`, `Make a Recipe`), but **no explicit "Today" / "Dashboard" link**. Users only reach `/dashboard` if they know to click the `Hungry Helper` logo pill.
3. **Fragmented Mental Model (Grocery vs. Pantry)**:
   - `Grocery Lists` (`/grocery`) and `Pantry` (`/pantry`) occupy separate top-level slots despite representing two halves of the same kitchen inventory loop ("What I need to buy" vs. "What I have on hand"), crowding the header bar.
4. **Lack of Ergonomic Mobile Bottom Navigation**:
   - Mobile users must reach to the top-right corner, tap a hamburger button (`Open main menu`), and wait for staggered `animate-slide-in-up` animations just to switch between core views while shopping or cooking.
5. **Missing Route Aliases & 404 Catch-All (`App.tsx`)**:
   - Navigating to intuitive URLs like `/home`, `/planner`, `/shopping`, `/inventory`, `/preferences`, or any unknown path renders a blank screen inside `<Routes>` because there is no catch-all `<Route path="*" />` or alias redirects.

### 2.2 Visual System & CSS (`index.css`, `tailwind.config.js`)
1. **Competing Pastel Gradients & Visual Noise**:
   - `.app-shell` layers 4 competing radial gradients (orange, yellow, pink, mint) over a linear gradient.
   - `Layout.tsx` adds another radial gradient plus two blurred orange and emerald orbs inside `.glass-panel`.
   - `DashboardPage.tsx` hero adds `bg-gradient-to-br from-orange-50 via-amber-50 to-emerald-50` plus two more blurred orbs (`bg-orange-200/40`, `bg-emerald-200/35`).
   - `NutritionCard.tsx` uses `bg-gradient-to-br from-green-50 to-emerald-50`, while `GroceryListDetailPage.tsx` uses `.category-header-fun` (orange-to-emerald gradient).
2. **InconsistentNeutral Scales (`stone` vs `slate` vs `gray`)**:
   - Components mix `text-stone-900`, `text-slate-900`, and `text-gray-900`, as well as `border-stone-200`, `border-slate-200`, and `bg-slate-50` (cool blue-gray) on top of warm `#faf9f7` backgrounds, creating a muddy visual clash.
3. **Typography Lack of Hierarchy (`index.css` lines 242–250)**:
   - `.font-display` is configured as `'Manrope', 'Plus Jakarta Sans'` — two nearly identical geometric sans-serifs — giving headings zero editorial warmth or distinction from body copy.
4. **Over-Engineered Button & Card Shadows (`index.css` lines 60–181)**:
   - `.btn-primary` uses a 3-stop neon orange gradient (`#e85d04` -> `#f97316` -> `#d14b00`), `text-shadow`, and 5 stacked box-shadows.
   - `.card` uses 5 stacked box-shadows up to `64px` blur, making dense grids (like 9 recipes or 12 pantry items) feel heavy and cluttered.

### 2.3 Today / Dashboard (`DashboardPage.tsx`)
1. **Disconnected Triage Flow**:
   - The hero ("Daily decision cockpit") and "Right now" action queue compete visually, while `Plan continuity`, `Pantry risk`, `Shopping continuity`, and `Recent context` sit in 4 equal-weight boxes below.
   - Expiring pantry items in `Pantry risk` (`summary.pantry_risk.top_items`) are static divs — clicking an expiring item (e.g., "Spinach") does **not** let you immediately generate a recipe with that ingredient (`/generate?use=Spinach`), even though `PantryPage` supports that exact query parameter!

### 2.4 Recipes & AI Chef (`RecipesPage.tsx`, `RecipeDetailPage.tsx`, `GenerateRecipePage.tsx`, `RecipeForm.tsx`)
1. **Disconnected Recipe Vault & AI Chef**:
   - `RecipesPage` has a bare search input and two raw `<select>`/`<button>` controls (`Sort by newest`, `Descending`), with no quick dietary/tag filter chips or inline prompt banner to jump into AI generation.
   - Recipe cards lack visual warmth (no category/cuisine eyebrow, cramped delete icon overlapping top-right text, raw `0 min` when prep/cook time are 0).
2. **Static `RecipeDetailPage` Lacks "Cooking Mode" & Interactive Utilities**:
   - `RecipeDetailPage.tsx` (lines 253–312) renders ingredients as a plain static `<ul>` and instructions as a plain `<ol>`. Note that `src/components/recipe/IngredientsCard.tsx`, `InstructionsCard.tsx`, `NutritionCard.tsx`, `QuickInfoCard.tsx`, and `RecipeHeaderCard.tsx` exist in the repo with emoji headers (`🥕`, `📝`, `🧮`) but aren't even used on `RecipeDetailPage`!
   - Users cooking at the counter cannot:
     - Check off ingredients as they prep (`mise en place` checklist),
     - Scale servings dynamically (`1x`, `2x`, or `+/-` stepper ajustar) to recalculate ingredient quantities on the fly,
     - Check off or highlight active cooking steps as they progress through the recipe, or toggle a distraction-free **Cook Mode** view,
     - Quickly add the recipe to an active Meal Plan slot directly from the recipe detail header.
3. **`GenerateRecipePage` & `RecipeForm` Friction**:
   - `RecipeForm` is a long vertical wall of inputs inside a nested card-inside-a-SectionCard (`SectionCard` -> `form.card`).
   - Lacks quick-select inspiration chips (e.g., *"30-Min Weeknight"*, *"High-Protein Bowl"*, *"Mediterranean Pantry Cleanout"*) to help users overcome blank-canvas syndrome.
   - `SuccessCelebration` uses a giant bouncing `🎉` emoji modal that blocks the user for 2 seconds instead of a refined editorial transition.

### 2.5 Weekly Meal Planner (`MealPlansPage.tsx`, `MealPlanDetailPage.tsx`)
1. **7-Card Vertical Scroll Marathon on `MealPlanDetailPage` (lines 499–570)**:
   - Every day of the week renders as a full-width `SectionCard` stacked vertically (`days.map`), each containing 3 sub-cards (`breakfast`, `lunch`, `dinner`), each containing a raw `<select>` dropdown (listing up to 200 ungrouped recipes) and a raw `<input type="number">` for servings.
   - On mobile, this creates 21 stacked form controls requiring endless scrolling. On desktop, it wastes horizontal space instead of offering a cohesive weekly overview + day focus or scannable editorial grid.
   - When a recipe is assigned to a slot, the user only sees the `<select>` text — they cannot see the recipe's prep time, tags, or click through to view the recipe!
2. **Action Toolbar Overload (`MealPlanDetailPage.tsx` lines 420–467)**:
   - 6 buttons (`Save changes`, `Autofill open slots`, `Build grocery list`, `Email this plan`, `Copy previous week`, `Clear week`) are dumped into a single wrapping flex row with equal visual hierarchy, making primary actions (`Save changes`, `Autofill open slots`, `Build grocery list`) fight with secondary utilities (`Copy previous week`, `Clear week`, `Email this plan`).

### 2.6 Grocery Lists & Pantry (`GroceryListsPage.tsx`, `GroceryListDetailPage.tsx`, `PantryPage.tsx`)
1. **Isolated Shopping & Inventory**:
   - When viewing `/grocery` or `/pantry`, there is no unified sub-navigation to hop between **Shopping Lists** and **Pantry Inventory**, nor a quick way on a completed grocery list to restock/jump to the pantry.
2. **`GroceryListDetailPage` Mobile Ergonomics**:
   - Uses `mode="focus"` (stripping app navigation).
   - Header crowds `Back`, icon, title, created date, split `Email me` dropdown button, and `Add item` button into a single unwrapping flex row (`<div className="flex items-center mb-4">`), which overflows on 375px mobile screens.
   - Category filter tabs/jump pills are missing when a list has 30+ items across 5 aisles.
3. **`PantryPage` Card Density & Multi-Select**:
   - Each pantry item card renders 3 separate `StatPill` boxes (`Quantity`, `Category`, `Expiry`) stacked vertically inside a grid card, creating excessive height and visual repetition for simple staples like "Rice — 2 lb".
   - Selecting multiple expiring pantry items to generate a single combined recipe requires manually typing URL params; adding a multi-select or "Cook with expiring items" batch action alongside per-item `Use in recipe` dramatically improves kitchen triage.

### 2.7 Auth & Settings (`LoginPage.tsx`, `RegisterPage.tsx`, `SettingsPage.tsx`)
1. **Settings 8-Tab Fragmentation (`SettingsPage.tsx` lines 45–54)**:
   - 8 vertical sidebar tabs (`Account`, `Notifications`, `Food favorites`, `Ingredients`, `Cooking style`, `Nutrition`, `Schedule`, `Dietary rules`) stack vertically on mobile above the content, pushing the actual settings form below the fold. Grouping them under clear section categories (Account & Alerts vs. Culinary & Dietary Profile) with a horizontally scrollable pill bar on mobile improves mobile usability immediately.
2. **Auth Pages (`LoginPage.tsx`, `RegisterPage.tsx`)**:
   - `RegisterPage` mixes `text-gray-900`, `text-gray-700`, `text-stone-700`, and `.sticker` neon dots.
   - `ToastContainer.tsx` uses raw `bg-green-500`, `bg-red-500`, `bg-yellow-500`, `bg-blue-500` rectangles (`bottom-4 right-4`) that overlap mobile bottom navigation if not positioned and styled to match the editorial design system.

---

## 3. New Information Architecture & Sitemap

### 3.1 Unified Navigation Model
We eliminate the broken `mode="focus"` navigation trap and unify the application around **4 Primary Destinations** + **1 Persistent AI Chef CTA** + **User/Settings Menu**:

| Primary Pillar | Label | Canonical Route | Active Match Rules | Purpose & Mental Model |
|---|---|---|---|---|
| **1. Today** | `Today` | `/dashboard` | `/dashboard` | Daily kitchen briefing, expiring pantry triage, today's planned meals, and quick resume. |
| **2. Planner** | `Meal Plans` | `/meal-plans` | `/meal-plans`, `/meal-plans/:id` | Weekly meal calendar, AI autofill, plan health score, and 1-click grocery compilation. |
| **3. Recipes** | `Recipe Vault` | `/recipes` | `/recipes`, `/recipes/:id` | Personal cookbook, dietary/time filtering, interactive Cook Mode, and ratings/notes. |
| **4. Kitchen & Shop** | `Grocery Lists` / `Pantry` | `/grocery` & `/pantry` | `/grocery`, `/grocery/:id`, `/pantry` | Unified **Kitchen & Shop** hub with a shared top segmented switcher (`Grocery Lists` \| `Pantry`) so both routes are 1 tap apart and both remain directly accessible in navigation. |
| **Primary CTA** | `Make a Recipe` | `/generate` | `/generate` | Persistent terracotta CTA button in top header (and central/prominent action on mobile) launching the AI Chef Studio. |
| **Account & Prefs** | `Settings` | `/settings` | `/settings` | Taste profile, dietary rules, macro targets, and weekly email reminder schedule. |

#### Desktop Navigation (`>= 768px`)
- **Sticky Editorial Header Bar**: Warm translucent stone surface (`bg-[#FAF7F2]/90 backdrop-blur-md border-b border-[#E7E0D6]`), replacing the floating glass pill with neon blobs.
- **Left**: Brand mark (`HungryHelperLogo` in warm terracotta container + `Hungry Helper` in `Fraunces` serif display type, linking to `/dashboard`).
- **Center-Left Nav Links**:
  - `Today` (`/dashboard`)
  - `Recipe Vault` (`/recipes`)
  - `Meal Plans` (`/meal-plans`)
  - `Grocery Lists` (`/grocery`)
  - `Pantry` (`/pantry`)
  - `Make a Recipe` (`/generate` — styled with subtle warm accent badge/button treatment so it stands out as the generative studio while preserving the exact link text `Make a Recipe` for test compatibility).
- **Right**:
  - Direct quick-link icon/pill to `Settings` (`/settings`) + User Profile Menu button (`aria-label="Open user menu"` / `<span className="sr-only">Open user menu</span>`) with dropdown portal for `Settings` and `Sign out`.

#### Mobile Navigation (`< 768px`)
- **Streamlined Top Header**: Brand logo (`Hungry Helper` -> `/dashboard`), quick `Make a Recipe` (`/generate`) pill, and the accessible menu toggle button (`Open main menu`) + User Menu (`Open user menu`).
- **Ergonomic Fixed Bottom Navigation Bar (`md:hidden`)**:
  - Fixed at `bottom-0 inset-x-0 z-40` with safe-area padding (`pb-safe`), crisp top border (`border-t border-[#E7E0D6] bg-[#FAF7F2]/95 backdrop-blur-md`), providing instant 1-tap thumb access to:
    1. **Today** (`/dashboard`)
    2. **Recipes** (`/recipes`)
    3. **AI Chef** (`/generate` — elevated terracotta center pill)
    4. **Planner** (`/meal-plans`)
    5. **Shop & Pantry** (`/grocery` / `/pantry`)
- **No Navigation Traps**: `Layout` `mode="focus"` is retired/normalized so that `/generate` and `/grocery/:id` always keep the responsive header and mobile navigation accessible. (`Layout` still accepts `mode?: 'full' | 'condensed' | 'focus'` in `LayoutProps` for TypeScript backward compatibility, using `mode="focus"` only to slightly tighten vertical container padding without hiding navigation controls).

### 3.2 Complete Route Table & Legacy Redirects (`src/App.tsx`)

All existing routes are preserved intact, and intuitive alias/legacy routes are added via `<Navigate replace />` so bookmarks, deep links, and tests never break:

| Route Path | Component / Target | Auth | Layout Mode | Notes |
|---|---|---|---|---|
| `/` | `<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />` | Public/Auto | — | Root entrypoint |
| `/login` | `<LoginPage />` (or redirect to `/dashboard` if authed) | Public | Auth Shell | Editorial split-screen sign-in |
| `/register` | `<RegisterPage />` (or redirect to `/dashboard` if authed) | Public | Auth Shell | 3-step onboarding wizard |
| `/dashboard` | `<DashboardPage />` | Protected | Full | "Today's Kitchen" daily triage |
| `/recipes` | `<RecipesPage />` | Protected | Full | Recipe Vault with search, sort, dietary chips & AI prompt bar |
| `/recipes/:id` | `<RecipeDetailPage />` | Protected | Full | Interactive recipe view with Cook Mode, scaling & checklist |
| `/generate` | `<GenerateRecipePage />` | Protected | Full / Studio | AI Chef Studio with preset inspirations & live streaming |
| `/meal-plans` | `<MealPlansPage />` | Protected | Full | Weekly meal plans overview |
| `/meal-plans/:id` | `<MealPlanDetailPage />` | Protected | Full | Interactive week grid (desktop) & day switcher (mobile) |
| `/grocery` | `<GroceryListsPage />` | Protected | Full | Grocery lists + Kitchen & Shop sub-nav switcher |
| `/grocery/:id` | `<GroceryListDetailPage />` | Protected | Full | Aisle-by-aisle interactive shopping checklist |
| `/pantry` | `<PantryPage />` | Protected | Full | Pantry inventory + expiry triage + Kitchen & Shop sub-nav |
| `/settings` | `<SettingsPage />` | Protected | Full | Categorized culinary preferences & notification schedule |
| **Aliases & Redirects** | | | | |
| `/home` | `<Navigate to="/dashboard" replace />` | Any | — | Alias for Today / Dashboard |
| `/recipes/new` | `<Navigate to="/generate" replace />` | Any | — | Alias for AI Chef |
| `/recipes/generate` | `<Navigate to="/generate" replace />` | Any | — | Alias for AI Chef |
| `/planner` | `<Navigate to="/meal-plans" replace />` | Any | — | Alias for Meal Plans |
| `/shopping` | `<Navigate to="/grocery" replace />` | Any | — | Alias for Grocery Lists |
| `/grocery-lists` | `<Navigate to="/grocery" replace />` | Any | — | Alias for Grocery Lists |
| `/inventory` | `<Navigate to="/pantry" replace />` | Any | — | Alias for Pantry |
| `/preferences` | `<Navigate to="/settings" replace />` | Any | — | Alias for Settings |
| `/profile` | `<Navigate to="/settings" replace />` | Any | — | Alias for Settings |
| `*` (Catch-all) | `<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />` | Any | — | Prevents blank screen on unknown routes |

---

## 4. Key User Flows (Before vs. After)

### Flow 1: Daily Kitchen Triage (`Dashboard` -> `Expiring Pantry` -> `AI Recipe` -> `Plan`)
- **Before**:
  - User lands on `/dashboard` ("Daily decision cockpit") with pastel gradients.
  - Sees "Pantry risk" showing `Spinach (Expires Tomorrow)`, but the item is non-interactive text. To use it, the user must manually navigate to `/pantry`, find Spinach again, and click `Use in recipe`.
- **After**:
  - User lands on `/dashboard` (**Today's Kitchen**), featuring a warm editorial masthead with the date, personalized greeting, primary CTA, and a scannable 3-metric summary bar (`Week Coverage`, `Expiring Soon`, `Shopping Status`).
  - In the **Pantry Triage** card, each expiring item row (`summary.pantry_risk.top_items`) includes a direct **"Cook with this"** action link (`/generate?use=${encodeURIComponent(item.name)}`), plus a **"Use all expiring"** batch link (`/generate?use=item1,item2`) when multiple items are at risk.
  - Clicking it opens `/generate` with those ingredients pre-populated as removable pills, ready for 1-click generation.

### Flow 2: AI Recipe Discovery & Interactive Cooking View (`Prompting` -> `Streaming` -> `Cook Mode`)
- **Before**:
  - User opens `/generate` (trapped in `focus` mode on mobile). Faces a blank form with 8 fields.
  - After generation, `RecipeDetailPage` shows a static list of ingredients and numbered paragraphs. While cooking, users lose their place in long instruction lists and have to do mental math to double or halve a recipe.
- **After**:
  - On `/generate`, above the `RecipeForm`, an **Quick Inspiration Bar** offers 1-tap preset chips (*"25-Min Weeknight"*, *"Pantry Cleanout"*, *"High-Protein Dinner"*, *"Cozy Vegetarian"*) that populate form constraints while keeping every form field accessible.
  - During generation, `LoadingModal` displays a calm editorial kitchen preparation progress stepper with live AI thinking status and cancellation.
  - On `/recipes/:id` (`RecipeDetailPage`):
    - **Interactive Serving Scaler**: A `-` / `+` serving adjuster (plus `1x`, `2x` quick reset) dynamically scales displayed ingredient quantities while preserving the base recipe data.
    - **Checkable Ingredient Prep List**: Clicking any ingredient toggles a check mark and subtle strikethrough so home cooks can verify their *mise en place*.
    - **Interactive Step-by-Step Instructions & Cook Mode**: Each instruction step is clickable/checkable to mark progress, with a **"Cook Mode"** toggle that enlarges step typography and highlights the current active step for across-the-counter readability.
    - **Quick "Add to Meal Plan" Action**: Alongside `Add to grocery list`, users can assign the recipe directly to an active meal plan or jump to the planner.

### Flow 3: Weekly Meal Planning (`Overview` -> `Week Grid / Day Switcher` -> `Autofill` -> `1-Click Grocery Compilation`)
- **Before**:
  - `MealPlanDetailPage` stacks 7 large day cards vertically (`21` raw `<select>` and `<input>` boxes), with 6 equal-weight buttons crammed into a top card. Assigned slots show no recipe metadata or link to the recipe.
- **After**:
  - **Streamlined Command Bar**: Primary workflow actions (`Save changes`, `Autofill open slots`, `Build grocery list`) are visually prioritized on the left; secondary utilities (`Copy previous week`, `Email this plan`, `Clear week`) are cleanly grouped alongside the live `InlineStatus` pill (`Unsaved changes` / `All changes saved`).
  - **Compact Plan Health Ribbon**: Displays `Health score`, `Coverage`, and `Quick meals` with actionable editorial guidance bullets.
  - **Interactive Week Strip / Day Switcher (Mobile) + Scannable Week View**:
    - An interactive **7-Day Week Strip** at the top of the schedule shows each day of the week with fill indicators (3 dots representing Breakfast, Lunch, Dinner).
    - Users can filter/jump to a specific day on mobile or view the full week (`All days` default view preserved so all days render in DOM for instant scanning and full test compatibility).
    - Each Meal Slot Card (`Breakfast`, `Lunch`, `Dinner`) shows a styled recipe selector, inline compact servings stepper/input, and—when a recipe is selected—displays a **Recipe Preview Chip** with total time (`22 min`), dietary tags, and a direct link to `/recipes/:id`, plus the amber repetition warning (`Repeated 3 times this week.`) when a recipe is used $\ge 3$ times.

### Flow 4: Aisle-by-Aisle Shopping & Pantry Sync (`Grocery Check-off` -> `Aisle Filter` -> `Pantry Switch`)
- **Before**:
  - `GroceryListsPage` and `PantryPage` are separate worlds. `GroceryListDetailPage` has a cramped mobile header and no aisle quick-filters.
- **After**:
  - **Unified Kitchen & Shop Switcher**: Both `/grocery` and `/pantry` feature a top `KitchenSubNav` segmented bar (`Grocery Lists` with active list count | `Pantry` with expiring item badge) allowing instant switching between shopping and inventory.
  - **Ergonomic `GroceryListDetailPage`**:
    - Responsive header that stacks cleanly on mobile and aligns actions (`Email me` split button, `Add item`) on desktop.
    - Sticky progress bar with `Uncheck all`, `Collapse checked` / `Show checked`, and **Aisle Quick-Filter Pills** (`All Aisles`, `Produce`, `Meat & Seafood`, `Dairy`, `Pantry`, `Other`) for large lists.
    - High-contrast 44x44px touch targets for checking off items one-handed in the store, with a celebratory completion banner offering a direct link to `/pantry` ("Update pantry staples") alongside `Back to meal plans` and `Archive list`.

---

## 5. Component & Token Contract for the Engineering Team

To ensure Role #2 (Design System Engineer) and Roles #3–#5 (Feature Engineers) build to the exact same visual and programmatic specification, adhere strictly to the contracts below.

### 5.1 CSS Custom Properties & Color Tokens (`src/index.css` & `tailwind.config.js`)

Define the following root CSS variables in `src/index.css` and map them in `tailwind.config.js`:

```css
:root {
  /* Brand / Primary — Editorial Terracotta (WCAG AA compliant with #FFFFFF text: 4.95:1) */
  --primary: #c84b31;
  --primary-hover: #b83b22;
  --primary-soft: rgba(200, 75, 49, 0.10);
  --primary-glow: rgba(200, 75, 49, 0.22);

  /* Secondary / Botanical Sage — Freshness, completion, positive states */
  --secondary: #3f624d;
  --secondary-hover: #314e3c;
  --secondary-soft: rgba(63, 98, 77, 0.12);

  /* Semantic Status */
  --success: #2f6f4e;
  --success-soft: #ecf5f0;
  --warning: #b45309;
  --warning-soft: #fef3c7;
  --error: #b91c1c;
  --error-soft: #fee2e2;

  /* Editorial Warm Neutrals (Stone / Linen / Espresso) */
  --page-bg: #faf7f2;
  --surface: #ffffff;
  --surface-muted: #f3efe6;
  --surface-warm: #f9f1ea;
  --surface-elevated: #ffffff;

  /* Typography Ink Hierarchy */
  --text-primary: #1c1917;   /* Deep espresso charcoal */
  --text-secondary: #57534e; /* Warm walnut gray */
  --text-muted: #78716c;     /* Stone 500 — WCAG AA compliant for secondary labels */

  /* Borders & Dividers */
  --border: #e7e0d6;
  --border-strong: #d6cec2;
  --border-subtle: rgba(28, 25, 23, 0.06);

  /* Legacy aliases for 100% backward compatibility */
  --page: var(--page-bg);
  --text: var(--text-primary);
  --accent: var(--primary);
  --accent-strong: var(--primary-hover);
  --accent-soft: var(--primary-soft);
}
```

### 5.2 Typography Contract (`src/index.css` & `tailwind.config.js`)
1. **Google Fonts Import (`src/index.css`)**:
   - Load `Fraunces` (axes `opsz,wght@9..144,400..700`), `Plus Jakarta Sans` (`wght@400;500;600;700`), and `JetBrains Mono` (`wght@400;500`).
2. **Font Family Classes**:
   - `font-display`: `'Fraunces', Georgia, Cambria, 'Times New Roman', serif` with `letter-spacing: -0.02em`.
   - `font-sans`: `'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`.
   - `font-mono`: `'JetBrains Mono', ui-monospace, SFMono-Regular, monospace`.
3. **Typography Utility Classes**:
   - `.page-title`: `font-display text-3xl sm:text-4xl font-semibold text-[#1C1917] tracking-tight leading-[1.15]`
   - `.page-subtitle`: `mt-2 text-base text-[#57534E] leading-relaxed`
   - `.section-title`: `font-display text-xl font-semibold text-[#1C1917] tracking-tight`
   - `.section-subtitle`: `text-sm text-[#57534E]`
   - `.eyebrow`: `text-xs font-semibold uppercase tracking-[0.14em] text-[#78716C]`

### 5.3 Core CSS Component Classes (`src/index.css`)
All existing class names MUST be preserved and restyled to the Organic-Modern aesthetic:
- `.app-shell`: `min-h-screen bg-[#FAF7F2] text-[#1C1917]` with a subtle warm top wash (`radial-gradient(ellipse 90% 40% at 50% -10%, rgba(200, 75, 49, 0.05), transparent)`), removing the pink/mint/yellow radial blobs.
- `.surface` & `.card`: `rounded-3xl border border-[#E7E0D6] bg-white shadow-[0_2px_10px_-2px_rgba(28,25,23,0.04),0_6px_20px_-4px_rgba(28,25,23,0.03)] transition-all duration-200`.
- `.surface-muted`: `rounded-2xl border border-[#E7E0D6] bg-[#F3EFE6]/75`.
- `.surface-warm`: `rounded-2xl border border-[#C84B31]/20 bg-[#F9F1EA]`.
- `.glass-panel` & `.card-premium`: Warm editorial card surface (`bg-white/95 backdrop-blur-md border border-[#E7E0D6] rounded-3xl shadow-[0_8px_30px_-6px_rgba(28,25,23,0.07)]`).
- `.btn-primary`: Solid terracotta (`bg-[#C84B31] hover:bg-[#B83B22] text-white rounded-full px-5 py-2.5 text-sm font-semibold shadow-sm hover:shadow transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#C84B31]/30 focus:ring-offset-2 disabled:opacity-50`). No neon 3-stop orange gradient or heavy text-shadow.
- `.btn-secondary`: Crisp warm white (`bg-white hover:bg-[#FAF7F2] text-[#1C1917] border border-[#D6CEC2] rounded-full px-5 py-2.5 text-sm font-semibold shadow-2xs transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#C84B31]/25 disabled:opacity-50`).
- `.btn-danger`: Crimson clay (`bg-[#B91C1C] hover:bg-[#991B1B] text-white rounded-full px-5 py-2.5 text-sm font-semibold shadow-sm transition-all duration-150 disabled:opacity-50`).
- `.btn-ghost`: `inline-flex items-center justify-center rounded-full border border-transparent bg-transparent hover:bg-[#F3EFE6] px-3.5 py-2 text-sm font-semibold text-[#57534E] hover:text-[#1C1917] transition-colors`.
- `.input`: `block w-full rounded-xl border border-[#D6CEC2] bg-white px-3.5 py-2.5 text-sm text-[#1C1917] placeholder:text-[#A8A29E] transition-colors focus:border-[#C84B31] focus:outline-none focus:ring-3 focus:ring-[#C84B31]/15`.
- `.chip`: `inline-flex items-center gap-1.5 rounded-full border border-[#E7E0D6] bg-[#FAF7F2] px-3 py-1 text-xs font-medium text-[#57534E]`.
- `.badge`: `inline-flex items-center gap-1.5 rounded-full border border-[#C84B31]/25 bg-[#F9F1EA] px-3.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#B83B22]`.

### 5.4 Shared UI Component Contracts (`src/components/ui/*` & `src/components/Layout.tsx`)

1. **`Layout.tsx`**:
   - Props: `{ children: React.ReactNode; breadcrumbs?: React.ReactNode; mode?: 'full' | 'condensed' | 'focus' }`.
   - Must always render:
     - Brand title `Hungry Helper` linking to `/dashboard`.
     - Desktop navigation links (`Today` -> `/dashboard`, `Recipe Vault` -> `/recipes`, `Meal Plans` -> `/meal-plans`, `Grocery Lists` -> `/grocery`, `Pantry` -> `/pantry`, `Make a Recipe` -> `/generate`).
     - Accessible user menu button with `<span className="sr-only">Open user menu</span>` and accessible mobile menu button with `<span className="sr-only">Open main menu</span>` (even when `mode="focus"` is passed!).
     - Mobile bottom tab bar (`md:hidden`) for 1-tap navigation across core sections (`Today`, `Recipes`, `AI Chef`, `Planner`, `Kitchen`).
2. **`PageHeader.tsx`**:
   - Props: `{ title: string; subtitle?: string; badge?: ReactNode; center?: boolean; actions?: ReactNode; className?: string; noMargin?: boolean }`.
   - Renders `title` inside an `<h1>` with `.page-title` (`font-display`), optional `badge` eyebrow above, `subtitle` below, and right-aligned `actions`.
3. **`SectionCard.tsx`**:
   - Props: `{ title?: ReactNode; subtitle?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; contentClassName?: string; headerClassName?: string; bare?: boolean }`.
   - Renders a `<section className="surface ...">` with optional `<header>` (`<h2>` title, `<p>` subtitle, and `action` slot).
4. **`StatPill.tsx`**:
   - Props: `{ label: string; value: ReactNode; tone?: 'default' | 'warm' | 'success'; className?: string; style?: CSSProperties }`.
   - Tones:
     - `default`: `border-[#E7E0D6] bg-[#FAF7F2] text-[#1C1917]`
     - `warm`: `border-[#C84B31]/25 bg-[#F9F1EA] text-[#9A3412]`
     - `success`: `border-[#3F624D]/25 bg-[#ECF5F0] text-[#2F6F4E]`
5. **`KitchenSubNav` (or Segmented Switcher in Grocery & Pantry pages)**:
   - Shared navigation header or segmented pill bar rendered on `GroceryListsPage`, `GroceryListDetailPage`, and `PantryPage` that lets users toggle directly between **Shopping Lists** (`/grocery`) and **Pantry Inventory** (`/pantry`), plus quick cross-links (e.g., `Manage Pantry` button on `/grocery` and `Shopping Lists` button on `/pantry`).
6. **`ToastContainer.tsx`**:
   - Positioned at `bottom-20 md:bottom-6 right-4 z-50` so it never covers the mobile bottom navigation bar. Styled with warm editorial borders and high-contrast status icons.

---

## 6. Test Compatibility & Accessibility Contract (Strict Preservation)

All existing Vitest + React Testing Library suites in `src/**/__tests__/*.test.tsx` MUST pass without modification. Engineers must preserve the following exact DOM queries, roles, labels, and attributes:

| Test Suite | Required Elements, Roles, Labels & Text Assertions |
|---|---|
| **`Layout.test.tsx`** | • Renders `children`<br>• Brand text: `'Hungry Helper'`<br>• Mobile menu button: `getByRole('button', { name: 'Open main menu' })`<br>• User profile button: `getByRole('button', { name: 'Open user menu' })`<br>• Landmark: `getByRole('navigation')` (Note: ensure there is a single primary `<nav>` with role `navigation`, or if secondary navs exist, use `<div>` or `role="region"` so `screen.getByRole('navigation')` resolves unambiguously to a single element!) |
| **`LoginPage.test.tsx`** | • Heading/text: `'Welcome back!'` and `"Sign in and let's get cooking"`<br>• Inputs: `getByLabelText(/email address/i)` and `getByLabelText(/password/i)`<br>• Submit button: `getByRole('button', { name: /sign in/i })` -> shows `'Signing in...'` and `disabled` when loading<br>• Fallback error text: `"Couldn't sign you in. Try again?"`<br>• Calls `authService.login({ email, password })` and `navigate('/dashboard')` |
| **`RecipesPage.test.tsx`** | • Loading state: `data-testid="loading-spinner"`<br>• Empty state (no recipes): title `'No recipes yet...yet'`, description `'Kick things off with your first recipe.'`, link `'Make a recipe'` with `href="/generate"`<br>• Header CTA when recipes exist: link `'New recipe, please'` with `href="/generate"`<br>• Recipe card: wrapped in `.card`, links to `/recipes/${recipe.id}`, displays `recipe.name`, `recipe.description`, `${prep + cook} min` (e.g. `'45 min'`, `'0 min'`), `${recipe.servings} servings` (e.g. `'4 servings'`, `'1 servings'`), and tags (`'easy'`, `'vegetarian'`)<br>• Delete button: `title="Delete recipe"`, disabled while deleting, contains `.animate-spin` element while deleting |
| **`GenerateRecipePage.test.tsx`** | • Reads `?use=` query parameters from `location.search` (e.g. `/generate?use=spinach&use=tomato`) and renders prefilled ingredient pills (`'spinach'`, `'tomato'`) in the document |
| **`MealPlanDetailPage.test.tsx`** | • Renders `'Plan health'` section title<br>• Renders `'Repeated 3 times this week.'` for each slot assigned a recipe used $\ge 3$ times in the week (all days rendered in DOM by default) |
| **`PantryPage.test.tsx`** | • Filter buttons with `aria-pressed`: `getByRole('button', { name: 'Use soon' })`, `getByRole('button', { name: 'Recently updated' })`, `getByRole('button', { name: 'Expiry order' })`<br>• Pantry item card has `.card` class (`screen.getByText('Spinach').closest('.card')`)<br>• Inside each `.card`, button `getByRole('button', { name: 'Use in recipe' })` calls `navigate('/generate?use=Spinach')` |
| **`ConfirmDialog.test.tsx`** | • Renders `title`, `description`, `Cancel` button, and `confirmLabel` button when `isOpen={true}`; renders nothing when `isOpen={false}` |

> **Critical Note on `screen.getByRole('navigation')` in `Layout.test.tsx`**:
> `Layout.test.tsx` line 121 calls `const nav = screen.getByRole('navigation');`. In Testing Library, `getByRole('navigation')` throws an error if there is more than one `<nav>` element rendered in `Layout`! Therefore, `Layout.tsx` MUST have **only one `<nav>` element** (wrapping the header/navigation), and any mobile bottom bar or sub-navigation bar inside `Layout` must use `<div role="region" aria-label="Mobile navigation">` (or be inside the single `<nav>`) so `getByRole('navigation')` always matches exactly one element.

---

## 7. Engineering Execution Roadmap

1. **Role #2 — Design System & Core Shell Engineer**:
   - Update `src/index.css` and `tailwind.config.js` with the Organic-Modern color palette, `Fraunces` + `Plus Jakarta Sans` typography, refined `.card`/`.surface`/`.btn-*`/`.input` styles.
   - Redesign `src/components/Layout.tsx`, `src/components/Breadcrumbs.tsx`, and `src/components/ui/*` (`PageHeader`, `SectionCard`, `StatPill`, `ToolbarRow`, `EmptyState`, `InlineStatus`, `ModalShell`, `ConfirmDialog`, `ToastContainer`, `LoadingModal`).
   - Update `src/App.tsx` to remove `mode="focus"` traps and add all legacy/alias route redirects and catch-all route.
2. **Role #3 — Dashboard, Auth & Settings Engineer**:
   - Redesign `DashboardPage.tsx` (Today's Kitchen masthead, interactive expiring pantry triage with direct `/generate?use=` links, today's meal slots, shopping continuity).
   - Redesign `LoginPage.tsx`, `RegisterPage.tsx`, `SettingsPage.tsx`, and `PreferenceComponents.tsx`.
3. **Role #4 — Recipes & AI Chef Engineer**:
   - Redesign `RecipesPage.tsx` (editorial recipe cards, quick dietary/time filter chips, search/sort toolbar).
   - Redesign `GenerateRecipePage.tsx` and `RecipeForm.tsx` (AI Chef Studio, preset inspiration chips, clean ingredient pills, refined celebration).
   - Redesign `RecipeDetailPage.tsx` and `src/components/recipe/*` (interactive serving scaler, checkable ingredient prep list, interactive step-by-step Cook Mode, and recipe feedback).
4. **Role #5 — Meal Planner, Grocery Lists & Pantry Engineer**:
   - Redesign `MealPlansPage.tsx` and `MealPlanDetailPage.tsx` (organized command bar, plan health ribbon, interactive week day strip + rich slot cards with recipe time/preview links).
   - Redesign `GroceryListsPage.tsx`, `GroceryListDetailPage.tsx`, and `PantryPage.tsx` (unified Kitchen & Shop sub-nav switcher, aisle filter pills, compact pantry cards, and batch expiring-item recipe handoff).
