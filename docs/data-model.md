# Data Model Reference

## Entity Relationship Diagram

```
┌──────────┐      ┌──────────────┐      ┌─────────────────┐
│  users   │─1:N─▶│   recipes    │─1:N─▶│recipe_feedbacks │
│          │      │              │      │                 │
│ id  PK   │      │ id       PK │      │ id          PK  │
│ email    │      │ user_id  FK │      │ user_id     FK  │
│ username │      │ name        │      │ recipe_id   FK  │
│ ...prefs │      │ ingredients │      │ liked, rating   │
└──┬───┬───┘      │ tags (ARRAY)│      └─────────────────┘
   │   │          └─────────────┘
   │   │
   │   │      ┌──────────────┐      ┌─────────────────┐
   │   ├─1:N─▶│  meal_plans  │─1:N─▶│ meal_plan_items │──0:1──▶ recipes
   │   │      │              │      │                 │
   │   │      │ id       PK │      │ id          PK  │
   │   │      │ user_id  FK │      │ meal_plan_id FK │
   │   │      │ start_date  │      │ recipe_id   FK  │
   │   │      │ end_date    │      │ date, meal_type │
   │   │      └──────┬───────┘      └─────────────────┘
   │   │             │
   │   │             └─0:N──▶┌───────────────┐      ┌───────────────┐
   │   │                     │ grocery_lists │─1:N─▶│ grocery_items │
   │   ├─1:N────────────────▶│               │      │               │
   │   │                     │ id        PK │      │ id        PK  │
   │   │                     │ user_id   FK │      │ grocery_list_id│
   │   │                     │ meal_plan_id │      │ name, checked │
   │   │                     └───────────────┘      └───────────────┘
   │   │
   │   └─1:N─▶┌───────────────┐
   │          │ pantry_items  │
   │          │               │
   │          │ id        PK │
   │          │ user_id   FK │
   │          │ name, expiry │
   │          └───────────────┘
```

## Table Reference

### `users`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | Integer | PK, indexed | Auto-increment |
| `email` | String | Unique, indexed, NOT NULL | |
| `username` | String | Unique, indexed, NOT NULL | |
| `hashed_password` | String | NOT NULL | bcrypt hash |
| `is_active` | Boolean | Default: true | |
| `created_at` | DateTime | | Auto-set |
| `updated_at` | DateTime | | Auto-updated |
| `food_preferences` | JSON | Default: `{}` | See preferences section |
| `dietary_restrictions` | JSON | Default: `[]` | List of restriction strings |
| `ingredient_rules` | JSON | Default: `{}` | See preferences section |
| `food_type_rules` | JSON | Default: `{}` | See preferences section |
| `nutritional_rules` | JSON | Default: `{}` | See preferences section |
| `scheduling_rules` | JSON | Default: `{}` | See preferences section |
| `dietary_rules` | JSON | Default: `{}` | See preferences section |
| `email_notifications_enabled` | Boolean | Default: true | |
| `weekly_planning_reminder` | Boolean | Default: true | |
| `reminder_day_of_week` | Integer | Default: 0 | Monday=0 .. Sunday=6 |
| `reminder_time` | Time | Default: 09:00 | |
| `timezone` | String | Default: "UTC" | pytz timezone name |

### `recipes`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | Integer | PK, indexed | |
| `user_id` | Integer | FK → users.id, NOT NULL | |
| `name` | String | NOT NULL, indexed | |
| `description` | Text | | |
| `instructions` | JSON | | List of step strings |
| `ingredients` | JSON | | List of `{name, quantity, unit, notes}` |
| `prep_time_minutes` | Integer | | |
| `cook_time_minutes` | Integer | | |
| `servings` | Integer | | |
| `tags` | ARRAY(String) | PostgreSQL-specific | Tag strings for filtering |
| `source_urls` | ARRAY(String) | | Reference URLs |
| `cuisine` | String | Indexed | e.g. "Italian", "Thai" |
| `difficulty` | String | | "easy", "medium", "hard" |
| `source` | String | | "ai_generated" or "manual" |
| `calories` | Float | | Per serving |
| `protein_g` | Float | | Per serving |
| `carbs_g` | Float | | Per serving |
| `fat_g` | Float | | Per serving |
| `fiber_g` | Float | | Per serving |
| `sugar_g` | Float | | Per serving |
| `sodium_mg` | Float | | Per serving |
| `image_url` | String | | |
| `created_at` | DateTime | | |
| `updated_at` | DateTime | | |

### `recipe_feedbacks`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | Integer | PK, indexed | |
| `user_id` | Integer | FK → users.id, NOT NULL | |
| `recipe_id` | Integer | FK → recipes.id, NOT NULL | |
| `rating` | Integer | Nullable | 1-5 stars |
| `liked` | Boolean | | Quick thumbs up/down |
| `notes` | Text | | Free-text feedback |
| `made_it` | Boolean | Default: false | |
| `would_make_again` | Boolean | | |
| `difficulty_rating` | Integer | | |
| `taste_rating` | Integer | | |
| `created_at` | DateTime | | |
| `updated_at` | DateTime | | |

**Note**: One feedback per user per recipe. The endpoint upserts (updates if existing).

### `meal_plans`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | Integer | PK, indexed | |
| `user_id` | Integer | FK → users.id | |
| `name` | String | | |
| `start_date` | Date | NOT NULL | |
| `end_date` | Date | NOT NULL | Check: `start_date <= end_date` |
| `created_at` | DateTime | | |
| `description` | Text | | |
| `theme` | String | | e.g. "Mediterranean week" |
| `occasion` | String | | |
| `budget_target` | Float | | |
| `prep_time_preference` | String | | |
| `special_notes` | JSON | Default: `{}` | |
| `week_dietary_restrictions` | JSON | Default: `[]` | |
| `week_food_preferences` | JSON | Default: `{}` | |

**Constraints**: `ck_meal_plans_date_range` ensures `start_date <= end_date`.

### `meal_plan_items`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | Integer | PK, indexed | |
| `meal_plan_id` | Integer | FK → meal_plans.id | Cascade delete |
| `recipe_id` | Integer | FK → recipes.id | Optional (can use recipe_data instead) |
| `date` | Date | NOT NULL | Which day this meal is for |
| `meal_type` | String | | "breakfast", "lunch", "dinner", "snack" |
| `servings` | Integer | Default: 1 | |
| `recipe_data` | JSON | | Inline recipe data (no recipe_id) |

### `grocery_lists`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | Integer | PK, indexed | |
| `user_id` | Integer | FK → users.id | |
| `meal_plan_id` | Integer | FK → meal_plans.id | Optional (standalone lists have null) |
| `name` | String(255) | | Auto-generated or user-provided |
| `created_at` | DateTime | | |
| `updated_at` | DateTime | | |

### `grocery_items`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | Integer | PK, indexed | |
| `grocery_list_id` | Integer | FK → grocery_lists.id | Cascade delete |
| `name` | String | NOT NULL | Normalized ingredient name |
| `quantity` | Float | | Merged across recipes |
| `unit` | String | | Lowercase, trimmed |
| `category` | String | | "Produce", "Dairy", "Meat", etc. |
| `checked` | Boolean | NOT NULL, Default: false | Shopping checklist state |

### `pantry_items`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | Integer | PK, indexed | |
| `user_id` | Integer | FK → users.id, NOT NULL | Indexed |
| `name` | String(255) | NOT NULL | |
| `quantity` | Float | | |
| `unit` | String(64) | | |
| `category` | String(100) | | |
| `expires_at` | DateTime | | Expiry date tracking |
| `created_at` | DateTime | | |
| `updated_at` | DateTime | | |

## User Preferences Deep Dive

The user model stores 6 preference rule types as JSON columns. Each maps to a Pydantic sub-model in `schemas/user.py`:

### `food_preferences`
```json
{
  "cuisines": ["Italian", "Thai", "Mexican"],
  "favorite_dishes": ["pasta", "curry"],
  "cooking_styles": ["quick", "one-pot"],
  "flavor_profiles": ["spicy", "umami"]
}
```

### `dietary_restrictions`
```json
["vegetarian", "gluten-free", "nut-free"]
```

### `ingredient_rules`
```json
{
  "must_include": ["garlic", "olive oil"],
  "must_exclude": ["cilantro", "anchovies"],
  "prefer_organic": true,
  "seasonal_preference": true
}
```

### `food_type_rules`
```json
{
  "preferred_proteins": ["chicken", "tofu"],
  "preferred_grains": ["rice", "quinoa"],
  "avoid_types": ["processed", "fried"]
}
```

### `nutritional_rules`
```json
{
  "daily_calorie_target": 2000,
  "daily_calorie_range": "1800-2200",
  "macro_targets": {"protein": "30%", "carbs": "40%", "fat": "30%"},
  "specific_goals": "high protein, low sugar"
}
```

### `scheduling_rules`
```json
{
  "meals_per_day": 3,
  "prep_day": "Sunday",
  "max_prep_time_weekday": 30,
  "max_prep_time_weekend": 60,
  "batch_cooking": true
}
```

### `dietary_rules`
```json
{
  "diet_type": "Mediterranean",
  "restrictions_notes": "Lactose intolerant but can have hard cheeses",
  "cheat_day": "Saturday"
}
```

## Migration History

| Revision | Date | Description |
|----------|------|-------------|
| `0001_squashed_schema` | 2026-01-20 | Baseline: users, recipes, recipe_feedbacks, meal_plans, meal_plan_items, grocery_lists, grocery_items |
| `701e5a180d5d` | 2026-01-25 | Add `name` column to grocery_lists |
| `9d3f2c7b1a4e` | 2026-02-07 | Add pantry_items table; rename feedback_text → notes; make rating nullable |
| `b4e8d1f2a9c3` | 2026-02-08 | Add check constraint `ck_meal_plans_date_range` (start_date <= end_date) |
