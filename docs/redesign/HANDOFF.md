# Handoff notes

Append-only. Newest at the bottom. Prefix with `[engineer]` or `[designer]`.

[lead] Contract is in `README.md`. Engineer: please land `useRecipeStream` and the types early
and note it here so the designer can wire the generate experience against the real thing.

[designer] UX direction is in `docs/redesign/UX.md`. Building the generate page against the
documented `useRecipeStream()` interface now (I derive the draft type from the hook's return
type, so I only depend on the hook export plus `Recipe`). API requests, in priority order —
all optional, I ship graceful fallbacks until they land:
1. Read my existing feedback for a recipe: `GET /recipes/{id}/feedback` → `RecipeFeedbackResponse | null`
   (or `my_feedback` embedded on `GET /recipes/{id}`), plus a service method
   `recipeService.getFeedback(id)`. Unlocks showing prior rating/notes on recipe detail.
2. `cuisine` and `difficulty` on the `Recipe` response/type (the model already has the
   columns). Used on cards and the recipe hero.
3. Optional: `liked`/`rating` on items from `GET /recipes/list` so the vault can offer a
   "Favourites" filter chip.
Ping here when the hook + `RecipeDraft` types land and when the `demo` provider is live.

[engineer] Milestone 1 landed (typecheck clean): `frontend/src/hooks/useRecipeStream.ts`
exports `useRecipeStream()` (named + default) matching the README interface exactly. Types in
`types/index.ts`: `RecipeDraft`, `IngredientDraft`, `StreamStage`, `ServerStreamStage`,
`StreamError`, `RecipeStreamEvent`, `RecipeStreamState`. Behaviour notes:
- `start(req)` sets `stage: 'context'` immediately (before the network round-trip); calling it
  while running aborts the previous run.
- `cancel()` aborts and goes back to `stage: 'idle'` but keeps `thinking`/`draft` so you can
  leave the partial card on screen; `reset()` clears everything.
- `stage` only advances; `thinking` is skipped when the model doesn't reason (go straight
  `context -> drafting`). `elapsedMs` ticks every 250ms and freezes on complete/error/cancel.
- `draft` is a full snapshot each time; the last list item may be partial (e.g. ingredient with
  a `name` but no `unit` yet, or a half-written instruction string). Render defensively.
- Errors: `error.retryable` is true for timeouts (90s), dropped connections, provider hiccups;
  false for auth/validation/unconfigured.
- Your requests: (2) is on the type now: `Recipe.cuisine`, `Recipe.difficulty`, plus
  `Recipe.total_minutes`. (1) `recipeService.getFeedback(id)` and (3) `Recipe.feedback`
  (`RecipeFeedbackResponse | null`, embedded on detail AND list items) are typed; backend for
  all of these lands next, I'll ping. Also coming: `GET /recipes/list?favorites=true`
  (liked or rating >= 4), `cuisine=` filter, `sort=total_minutes`, `recipeService.getFacets()`
  (cuisine/tag counts for filter chips), `recipeService.deleteFeedback(id)`.
- The old `recipeService.generateRecipeStream(callbacks)` remains as a deprecated adapter so the
  current `GenerateRecipePage` keeps working; tell me when your page stops using it and I'll
  delete it.

[designer] `GenerateRecipePage` now runs entirely on `useRecipeStream()`; it no longer uses
`recipeService.generateRecipeStream(callbacks)` / `StreamCallbacks`, so the deprecated adapter
can go. `LoadingModal` and the old `components/recipe/*` streaming cards are deleted.
Thanks for embedding `Recipe.feedback` — recipe detail reads it (falls back to `getFeedback`).

[engineer] Milestone 2: streaming v2 backend + demo provider are LIVE on http://localhost:8000
(`/health` → `llm_provider: "demo"`). A demo run takes ~7s: `stage(context)` at 0s,
`thinking` from ~0.6s, `drafting` + `draft` snapshots from ~4s (title types in first, then
description, ingredients, steps, nutrition), `saving` + `complete` at ~7s. Raw transcript:
`/opt/cursor/artifacts/stream-v2-transcript.txt`. The demo respects meal type, cuisine,
servings, max time, must-use/avoid, and vegetarian/vegan (swaps chicken→tofu etc.).
Done from your list + extras (all typed in `types/index.ts`, all in `recipe.service.ts`):
- `Recipe.cuisine`, `Recipe.difficulty` (lowercase `easy|medium|hard` for generated recipes),
  `Recipe.total_minutes`, `Recipe.feedback` — on detail, list, `PUT`, and the `complete` event.
- `getFeedback(id)` → `RecipeFeedbackResponse | null`; `deleteFeedback(id)` (204).
- `getRecipesPaginated({ favorites: true })` (liked OR rating >= 4), `{ cuisine: 'Thai' }`
  (case-insensitive), `{ sort: 'total_minutes' }`. Pagination contract unchanged.
- `getFacets()` → `{ cuisines: [{value, count}], tags: [{value, count}], total }`, most common
  first; good for real filter chips instead of client-side filtering of one page.
- Deprecated `generateRecipeStream` / `StreamCallbacks` removed as you asked.
FYI (not mine to fix): `pnpm run typecheck` is `tsc --noEmit` against a root tsconfig with
`"files": []` + references, so it checks nothing. `pnpm exec tsc -p tsconfig.app.json --noEmit`
is the real check; it currently passes for the whole app. Suggest the lead switch the script to
`tsc -b --noEmit` or `tsc -p tsconfig.app.json --noEmit`.

[designer] Phase 2 frontend rehaul is complete: generate, today (dashboard), recipes + detail
(cook mode, scaling, feedback), meal plans + planner (autosave, picker, plan health), groceries
(shopping mode), pantry ("cook with these"), settings (sections + sticky save bar), 404 route,
and skeleton loading inside the app shell. Gates green: typecheck, lint, 172 tests, build.
RecipesPage now uses `getFacets()`, `favorites`, `cuisine` and `sort: 'total_minutes'`, thanks.
The `streamFixtures.ts` typecheck errors I saw earlier no longer reproduce.
Open requests, in priority order (the UI works today without them):
1. `POST /grocery/{id}/items`: when `category` is missing/empty, store
   `categorize_ingredient(name)` instead of null. Quick-add items ("2 lemons") currently land
   in "Other" until the shopper edits the aisle.
2. Meal plan items: embed a recipe summary (`name`, `total_minutes`, `cuisine`, `tags`) on
   each item. The planner currently fetches `getRecipes(0, 200)` to label slots and score
   plan health; plans that reference older recipes past that window show `recipe_data` names
   only and count as "not quick".
3. Dashboard `next_slots` holds 3 slots; the week strip derives per-day fill from
   `getMealPlan(active_plan_id)` instead. A `week_fill: [{date, filled, total}]` on the
   summary would save that request.
4. `categorize_ingredient()` quality, seen in visual QA with the demo recipes: "eggplant" lands in
   Dairy (substring match on "egg"), and chickpea, black bean, lentil, rigatoni, corn tortilla
   and most spices fall into Other. The shopping list groups by aisle, so this is the biggest
   remaining polish issue on `/grocery/:id`. Word-boundary matching plus Pantry/Spices entries
   would cover most of it.
