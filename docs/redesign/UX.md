# Hungry Helper — UX direction

## Jobs to be done

1. **Decide what to cook tonight.** "I have 30 minutes and half a bag of spinach. What can I make?"
2. **Plan the week.** Fill the slots I care about (usually dinners) without fighting the UI.
3. **Shop.** Take one list into the store, check things off one-handed, know when I'm done.
4. **Use up the pantry.** See what's going off and turn it into a meal.

Everything else (preferences, notifications, history) supports those four. The app should open
on whichever job is most urgent right now, and every screen should lead to the next job
(recipe → plan → list → shop).

## Friction in today's flows

- **Generate** is a long form of selects, then a blocking modal that hides everything the
  stream produces, then a fake confetti overlay and an auto-redirect. The most interesting
  part of the product (watching a recipe get built for you) is invisible, and the user has no
  say in what happens after.
- **Dashboard** is a "decision cockpit": impact badges, stat pills, four equal-weight panels.
  Nothing tells you what to do next.
- **Recipe detail** is a read-only document: no checkable ingredients, no servings scaling, no
  cooking mode, prior rating is never shown, and "add to plan" doesn't exist.
- **Meal plan detail** is 21 raw `<select>`s plus 21 number inputs, with a separate Save
  button you can forget to press.
- **Grocery detail** buries the list under a header with a split email button, a sticky
  progress card with four controls, and modal-based adding.
- **Pantry** shows three stat pills per item; expiry state is a small chip. No way to cook with
  several items at once.
- Settings: 8 tabs of raw checkboxes, a hand-rolled toggle duplicated three times.
- Spinners everywhere, even where the layout is known. No 404.

## Information architecture

| Destination | Job | Nav label |
|---|---|---|
| `/dashboard` | Today: what's next | **Today** |
| `/generate` | Decide tonight | **Cook** (primary action, always one tap away) |
| `/recipes`, `/recipes/:id` | Library + cooking | **Recipes** |
| `/meal-plans`, `/meal-plans/:id` | Plan the week | **Plan** |
| `/grocery`, `/grocery/:id` | Shop | **Shop** |
| `/pantry` | Use it up | **Pantry** |
| `/settings` | Taste profile, reminders | user menu |

Desktop keeps the sidebar. Mobile gets a **bottom tab bar** (Today, Recipes, Cook, Plan, Shop)
because the app is used one-handed in a kitchen or a store; the drawer stays for Pantry,
Settings and sign out. Both live inside one `<nav>` landmark.

## Per-page decisions

- **Cook (generate).** A short brief made of quick-pick chips (meal, cuisine, time, effort),
  a servings stepper, chip inputs for "must use" and "avoid" (with pantry use-soon items as
  one-tap suggestions; `?use=` still prefills), notes and a web-inspiration toggle. On submit
  the same page becomes a **live kitchen**: a stage timeline (context → thinking → drafting →
  saving) with elapsed time, a collapsible "Chef's notes" panel streaming the reasoning, and
  the recipe card assembling from `draft` (title, meta, ingredients and steps appearing as they
  arrive, nutrition). Cancel is always visible. Errors show inline with Retry when
  `retryable`. On `complete` the card becomes the saved recipe with explicit next steps
  (open, add to plan, build grocery list, make another). No auto-redirect, no confetti.
- **Today.** Greeting plus one headline suggestion (from `today_brief`), a 7-day strip of the
  next slots, a short "next up" list (max 3 actions, no impact badges), pantry use-soon with a
  one-tap "Cook with these", and recent recipes as visual cards.
- **Recipes.** Visual card grid with `RecipeCover`, search, sort as a segmented control, and
  client-side filter chips (Quick ≤30 min, Vegetarian, Vegan, Gluten-free) over the loaded
  page. Paging becomes "Load more".
- **Recipe detail.** Hero with cover, meta stats and actions (Start cooking, Add to plan,
  Add to grocery list, overflow for delete). Ingredients are checkable and scale with a
  servings stepper. Steps are numbered; **cook mode** shows one step at a time in large type
  with arrow keys, plus the ingredient checklist. Nutrition as tiles. A rating/notes card
  (shows prior feedback once the API exposes it).
- **Plan.** List of week cards with a 7-dot fill indicator; the current week is highlighted.
  Planner: 7-day grid on desktop, one day at a time with a day switcher on mobile. Each slot is
  a tappable card that opens a **recipe picker** (search, recent first, clear slot). Servings
  stepper on filled slots. **Autosave** per slot with a quiet "Saving… / Saved" indicator.
  Plan health collapses to one line with a details disclosure. Toolbar: Autofill, Build
  grocery list; overflow: Copy previous week, Email plan, Clear week.
- **Shop.** Shopping mode first: quick-add input at the top (type, Enter), progress bar,
  aisle sections, 56px tap rows, checked items collapse into a "In the cart" section at the
  bottom. Tap the name to edit inline. Email/share and archive live in an overflow menu. A
  completion state when everything is checked.
- **Pantry.** Inline quick-add row (name + optional expiry). Item cards show expiry as a
  coloured status strip (expired / use soon / fresh / no date). View modes stay
  (Use soon, Recently updated, Expiry order). Select mode → "Cook with N items" →
  `/generate?use=a,b`.
- **Settings.** One page, sectioned (Account, Reminders, Taste, Ingredients, Cooking style,
  Nutrition, Schedule, Dietary) with a sticky section index on desktop; chips instead of
  checkbox grids; the shared `Toggle`; one sticky save bar for preferences when dirty.
- **Global.** Skeletons where layout is known, a 404 route, visible focus rings, 390px-first
  layouts, `prefers-reduced-motion` respected (already global in `index.css`).
