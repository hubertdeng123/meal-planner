# API Reference

Base URL: `/api/v1`

All endpoints require JWT authentication unless noted. Include `Authorization: Bearer <token>` header.

## Authentication (`/api/v1/auth`)

### POST `/auth/register`
Create a new user account with preferences.

- **Auth**: No
- **Rate Limit**: 3/minute
- **Request Body**:
  ```json
  {
    "user_data": {
      "email": "user@example.com",
      "username": "string",
      "password": "string"
    },
    "preferences": { ...UserPreferences }
  }
  ```
- **Response**: `UserSchema` (200)
- **Errors**: 400 if email or username already exists

### POST `/auth/login`
Authenticate and receive JWT token.

- **Auth**: No
- **Rate Limit**: 5/minute
- **Request Body**: `OAuth2PasswordRequestForm` (form data: `username`, `password`)
- **Response**: `{"access_token": "string", "token_type": "bearer"}`
- **Notes**: `username` field accepts both email and username

### GET `/auth/me`
Get current authenticated user.

- **Response**: `UserSchema` (with full preferences)

### PUT `/auth/me`
Update current user info and/or preferences.

- **Request Body**: `UserUpdate` (all fields optional: `email`, `username`, `preferences`)
- **Response**: `UserSchema`
- **Errors**: 400 if email/username taken by another user

### GET `/auth/me/preferences`
Get current user's detailed preferences.

- **Response**: `UserPreferences`

### PUT `/auth/me/preferences`
Replace all user preferences.

- **Request Body**: `UserPreferences`
- **Response**: `UserPreferences`

---

## Recipes (`/api/v1/recipes`)

### POST `/recipes/generate/stream`
Generate a recipe, streaming progress as Server-Sent Events (streaming contract v2; the
contract of record is `docs/redesign/README.md`).

- **Request Body** (`RecipeGenerationRequest`):
  ```json
  {
    "meal_type": "dinner",
    "cuisine": "Italian",
    "difficulty": "medium",
    "max_time_minutes": 45,
    "ingredients_to_use": ["chicken", "garlic"],
    "ingredients_to_avoid": ["cilantro"],
    "dietary_restrictions": ["gluten-free"],
    "servings": 4,
    "search_online": true,
    "comments": "Something hearty"
  }
  ```
  All fields optional except `servings` (default: 4).
- **Response**: `200 text/event-stream`. Every frame is a named event with a JSON payload:
  ```
  event: <type>
  data: <json>

  ```
  | Event | Payload | Notes |
  |-------|---------|-------|
  | `stage` | `{stage: "context" \| "thinking" \| "drafting" \| "saving", message}` | Pipeline moved to a new stage. Always starts with `context`; stages only move forward; `thinking` is skipped when the model emits no reasoning. |
  | `thinking` | `{delta}` | Model reasoning text as it arrives (native PydanticAI `ThinkingPart` deltas; `<think>` tags and `reasoning_content` are converted by PydanticAI). Zero or more. |
  | `draft` | `{recipe: RecipeDraft}` | Full snapshot of the partially written recipe (not a diff), at most ~10/s. `RecipeDraft` is `RecipeLLM` with every field optional and `null` fields omitted; lists grow and their last element may be incomplete. |
  | `complete` | `{recipe: Recipe}` | Terminal. Saved recipe, identical to `GET /recipes/{id}`. |
  | `error` | `{message, retryable}` | Terminal. `message` is user-safe (details are logged server-side). |
  | `ping` | `{}` | Keep-alive after ~15s without other frames. Ignore. |

  Typical order: `stage(context)` → `stage(thinking)` → `thinking`* → `stage(drafting)` →
  `draft`+ → `stage(saving)` → `complete`. If the client disconnects, the model run is
  cancelled and nothing is saved.
- **Errors before the stream starts**: 401 (missing/invalid token), 422 (invalid body),
  503 `{"detail": "Recipe generation isn't available right now."}` when no LLM provider can be
  resolved (only possible in production, or when `LLM_PROVIDER` names a provider without a key).
- **In-stream `error` messages**:
  | Cause | `retryable` |
  |-------|-------------|
  | Provider 429 / 5xx / network failure / timeout (`RECIPE_GENERATION_TIMEOUT_SECONDS`, default 120) | `true` |
  | Model output failed validation after retries | `true` |
  | Database error while saving | `true` |
  | Provider 401/403 (bad server credentials) | `false` |
- **Example**:
  ```
  event: stage
  data: {"stage":"context","message":"Reading your preferences and kitchen"}

  event: stage
  data: {"stage":"thinking","message":"Thinking through the recipe"}

  event: thinking
  data: {"delta":"The brief is "}

  event: stage
  data: {"stage":"drafting","message":"Writing the recipe"}

  event: draft
  data: {"recipe":{"name":"Thai Basil Tofu Stir-Fry","description":"Pad krapow-sty"}}

  event: stage
  data: {"stage":"saving","message":"Saving to your recipes"}

  event: complete
  data: {"recipe":{"id":42,"name":"Thai Basil Tofu Stir-Fry", ...}}
  ```
- **Providers**: `LLM_PROVIDER` = `auto` (default) | `grok` | `together` | `demo`. `auto`
  prefers Grok, then Together, then the offline `demo` model when `ENVIRONMENT` is not
  production. `GET /health` reports the resolved `llm_provider` / `llm_model`.

### GET `/recipes/`
Get user's recipes (simple list).

- **Query**: `skip` (default: 0), `limit` (default: 20)
- **Response**: `Recipe[]`

### GET `/recipes/list`
Get paginated recipes with search and filters.

- **Query**:
  | Param | Type | Default | Description |
  |-------|------|---------|-------------|
  | `page` | int (>=1) | 1 | Page number |
  | `page_size` | int (1-100) | 12 | Items per page |
  | `q` | string | — | Search name/description |
  | `tags` | string[] | — | Filter by tags (all must match) |
  | `cuisine` | string | — | Case-insensitive exact cuisine match |
  | `favorites` | bool | `false` | Only recipes the user liked or rated 4+ |
  | `sort` | `created_at` \| `name` \| `total_minutes` | `created_at` | Sort field (ties broken by `id`) |
  | `order` | `asc` \| `desc` | `desc` | Sort direction |
- **Response**: `PaginatedRecipes` (`{items, page, page_size, total, total_pages}`)

### GET `/recipes/facets`
Cuisine and tag counts across all of the user's recipes, most common first (labels are
grouped case-insensitively). Useful for filter chips.

- **Response**:
  ```json
  {
    "cuisines": [{"value": "Thai", "count": 3}],
    "tags": [{"value": "quick", "count": 5}, {"value": "vegan", "count": 2}],
    "total": 7
  }
  ```

### GET `/recipes/{recipe_id}`
Get a specific recipe.

- **Response**: `Recipe`
- **Errors**: 404 if not found or not owned by user

### PUT `/recipes/{recipe_id}`
Update a recipe.

- **Request Body**: `RecipeUpdate` (all fields optional)
- **Response**: `Recipe`

### DELETE `/recipes/{recipe_id}`
Delete a recipe and associated feedback/meal plan items.

- **Response**: `{"detail": "Recipe deleted successfully"}`

### GET `/recipes/{recipe_id}/feedback`
Get the current user's feedback for a recipe.

- **Response**: `RecipeFeedback`, or `null` if none has been left
- **Errors**: 404 if the recipe is not found or not owned by user

### POST `/recipes/{recipe_id}/feedback`
Add or update feedback for a recipe.

- **Request Body**:
  ```json
  {
    "liked": true,
    "rating": 5,
    "notes": "Delicious!"
  }
  ```
  `liked` is required; `rating` (1-5) and `notes` are optional.
- **Response**: `RecipeFeedback`
- **Notes**: Upserts — replaces existing feedback if already given

### DELETE `/recipes/{recipe_id}/feedback`
Remove the current user's feedback (no-op if there is none).

- **Response**: 204

### `Recipe` schema
```json
{
  "id": 42,
  "user_id": 1,
  "name": "Thai Basil Tofu Stir-Fry",
  "description": "string | null",
  "cuisine": "Thai",
  "difficulty": "easy",
  "instructions": ["..."],
  "ingredients": [{"name": "firm tofu", "quantity": 300, "unit": "g", "notes": null}],
  "prep_time_minutes": 10,
  "cook_time_minutes": 15,
  "total_minutes": 25,
  "servings": 2,
  "tags": ["vegetarian"],
  "nutrition": {"calories": 450, "protein_g": 25, "carbs_g": 50, "fat_g": 15, "fiber_g": 3, "sugar_g": 4, "sodium_mg": 700},
  "source": "ai_generated",
  "source_urls": [],
  "image_url": null,
  "created_at": "2026-10-14T04:22:39",
  "feedback": null
}
```
`total_minutes` is `prep + cook` (null when both are null). `feedback` is the current user's
`RecipeFeedback` or `null`, embedded on every endpoint that returns `Recipe`.

---

## Meal Plans (`/api/v1/meal-plans`)

### GET `/meal-plans/`
List meal plans (simple).

- **Query**: `skip`, `limit`
- **Response**: `MealPlanList[]` (includes `item_count`)

### GET `/meal-plans/list`
List paginated meal plans.

- **Query**:
  | Param | Type | Default | Description |
  |-------|------|---------|-------------|
  | `page` | int (>=1) | 1 | Page number |
  | `page_size` | int (1-100) | 12 | Items per page |
  | `q` | string | — | Search by name |
  | `sort` | `created_at` \| `name` \| `start_date` | `created_at` | Sort field |
  | `order` | `asc` \| `desc` | `desc` | Sort direction |
- **Response**: `PaginatedMealPlans`

### POST `/meal-plans/`
Create a meal plan (optionally with items).

- **Request Body**:
  ```json
  {
    "name": "Week of Jan 20",
    "start_date": "2026-01-20",
    "end_date": "2026-01-26",
    "description": "Healthy eating week",
    "theme": "Mediterranean",
    "items": [
      {"date": "2026-01-20", "meal_type": "dinner", "recipe_id": 5, "servings": 4}
    ]
  }
  ```
- **Response**: `MealPlan` (201)
- **Validation**: `start_date <= end_date`

### GET `/meal-plans/{meal_plan_id}`
Get meal plan with all items.

- **Response**: `MealPlan` (includes `items` array)

### PUT `/meal-plans/{meal_plan_id}`
Update meal plan metadata.

- **Request Body**: `MealPlanUpdate` (all fields optional)
- **Response**: `MealPlan`
- **Validation**: Rejects `start_date > end_date`

### DELETE `/meal-plans/{meal_plan_id}`
Delete a meal plan (cascades to items).

- **Response**: 204 No Content

### POST `/meal-plans/{meal_plan_id}/items`
Add an item to a meal plan.

- **Request Body**:
  ```json
  {
    "date": "2026-01-20",
    "meal_type": "dinner",
    "servings": 4,
    "recipe_id": 5,
    "recipe_data": null
  }
  ```
- **Response**: `MealPlanItem` (201)

### PUT `/meal-plans/{meal_plan_id}/items/{item_id}`
Update a meal plan item.

- **Request Body**: `MealPlanItemUpdate` (all fields optional)
- **Response**: `MealPlanItem`

### DELETE `/meal-plans/{meal_plan_id}/items/{item_id}`
Delete a meal plan item.

- **Response**: 204 No Content

### POST `/meal-plans/{meal_plan_id}/autofill`
Fill open breakfast/lunch/dinner slots with user's recipes.

- **Response**: `{"created_count": 12, "message": "Added 12 meal slot(s)."}`
- **Notes**: Rotates through user's recipes for empty slots
- **Errors**: 400 if user has no recipes

### POST `/meal-plans/{meal_plan_id}/grocery-list`
Generate a grocery list from meal plan recipes.

- **Response**: `GroceryList` (with items, sorted by category)
- **Notes**: Normalizes ingredient names, merges quantities, categorizes items
- **Errors**: 400 if no recipe-linked slots

---

## Grocery (`/api/v1/grocery`)

### POST `/grocery/`
Create an empty grocery list.

- **Request Body**: `GroceryListCreate` (`meal_plan_id` optional)
- **Response**: `GroceryList`

### GET `/grocery/`
List grocery lists (simple).

- **Query**: `skip`, `limit`
- **Response**: `GroceryList[]`

### GET `/grocery/list`
List paginated grocery lists.

- **Query**: `page`, `page_size`, `q`, `sort` (`created_at` | `name`), `order`
- **Response**: `PaginatedGroceryLists`

### GET `/grocery/{grocery_list_id}`
Get grocery list with items.

- **Response**: `GroceryList` (items sorted by category)

### DELETE `/grocery/{grocery_list_id}`
Delete a grocery list.

- **Response**: `{"detail": "Grocery list deleted successfully"}`

### POST `/grocery/{grocery_list_id}/items`
Add an item to a grocery list.

- **Request Body**:
  ```json
  {"name": "Tomatoes", "quantity": 4, "unit": "whole", "category": "Produce"}
  ```
- **Response**: `GroceryItem`

### PUT `/grocery/{grocery_list_id}/items/{item_id}`
Update a grocery item (name, quantity, checked, etc.).

- **Request Body**: `GroceryItemUpdate` (all fields optional)
- **Response**: `GroceryItem`

### DELETE `/grocery/{grocery_list_id}/items/{item_id}`
Delete a grocery item.

- **Response**: `{"detail": "Grocery item deleted successfully"}`

### POST `/grocery/from-recipes/`
Create a grocery list from selected recipes.

- **Request Body**: `[1, 5, 12]` (array of recipe IDs)
- **Response**: `GroceryList` (with auto-generated name, normalized/merged ingredients)
- **Errors**: 404 if any recipe not found

---

## Pantry (`/api/v1/pantry`)

### GET `/pantry/`
List pantry items (paginated).

- **Query**:
  | Param | Type | Default | Description |
  |-------|------|---------|-------------|
  | `page` | int (>=1) | 1 | Page number |
  | `page_size` | int (1-100) | 20 | Items per page |
  | `q` | string | — | Search by name |
  | `sort` | `updated_at` \| `name` \| `expires_at` | `updated_at` | Sort field |
  | `order` | `asc` \| `desc` | `desc` | Sort direction |
- **Response**: `PaginatedPantryItems`

### POST `/pantry/items`
Add a pantry item.

- **Request Body**:
  ```json
  {"name": "Olive oil", "quantity": 1, "unit": "bottle", "category": "Pantry", "expires_at": null}
  ```
- **Response**: `PantryItem` (201)

### PUT `/pantry/items/{item_id}`
Update a pantry item.

- **Request Body**: `PantryItemUpdate` (all fields optional)
- **Response**: `PantryItem`

### DELETE `/pantry/items/{item_id}`
Delete a pantry item.

- **Response**: `{"detail": "Pantry item deleted successfully"}`

---

## Notifications (`/api/v1/notifications`)

### GET `/notifications/preferences/`
Get notification preferences.

- **Response**:
  ```json
  {
    "email_notifications_enabled": true,
    "weekly_planning_reminder": true,
    "reminder_day_of_week": 0,
    "reminder_time": "09:00:00",
    "timezone": "US/Pacific"
  }
  ```

### PUT `/notifications/preferences/`
Update notification preferences.

- **Request Body**: `UserNotificationUpdate` (all fields optional)
- **Response**: `UserNotificationPreferences`
- **Validation**: Timezone must be valid pytz timezone; `reminder_day_of_week` 0-6

### POST `/notifications/test-weekly-reminder/`
Send a test weekly reminder to the current user.

- **Response**: `{"detail": "Test reminder sent successfully", "email": "user@example.com"}`
- **Errors**: 400 if notifications disabled, 503 if SMTP unavailable

### POST `/notifications/send-grocery-notification/`
Email a grocery list.

- **Request Body**:
  ```json
  {"grocery_list_id": 5, "additional_emails": ["friend@example.com"]}
  ```
- **Response**: `{"detail": "...", "sent_to": [...], "total_sent": 2}`

### POST `/notifications/send-weekly-meal-plan-notification/`
Email a weekly meal plan summary.

- **Request Body**:
  ```json
  {"meal_plan_id": 3, "additional_emails": [], "weekly_recipes": null}
  ```
- **Response**: Same format as grocery notification

### GET `/notifications/timezone-list/`
Get available timezones.

- **Auth**: No
- **Response**: `{"timezones": ["UTC", "US/Eastern", ...]}`

### GET `/notifications/reminder-schedule/`
Get next scheduled reminder.

- **Response**:
  ```json
  {
    "next_reminder": "2026-02-09T17:00:00+00:00",
    "reminder_day": "Monday",
    "reminder_time": "09:00",
    "timezone": "US/Pacific",
    "message": "Next reminder: Monday at 09:00 (US/Pacific)"
  }
  ```

---

## Users (`/api/v1/users`)

### GET `/users/preferences`
Get user preferences (same data as `/auth/me/preferences`).

- **Response**: `UserPreferences`

### PUT `/users/preferences`
Update preferences (partial update).

- **Request Body**: `UserPreferencesUpdate` (all fields optional)
- **Response**: `UserPreferences`

### PATCH `/users/preferences/food`
Update food preferences only.

- **Request Body**: `Dict[str, Any]`
- **Response**: `UserPreferences`

### PATCH `/users/preferences/dietary-restrictions`
Update dietary restrictions only.

- **Request Body**: `["vegetarian", "gluten-free"]`
- **Response**: `{"dietary_restrictions": [...]}`

### PATCH `/users/preferences/ingredient-rules`
Update ingredient rules only.

- **Request Body**: `IngredientRules`
- **Response**: `{"ingredient_rules": {...}}`

### PATCH `/users/preferences/nutritional-rules`
Update nutritional rules only.

- **Request Body**: `NutritionalRules`
- **Response**: `{"nutritional_rules": {...}}`

### GET `/users/profile`
Get basic user profile.

- **Response**: `{id, username, email, is_active, created_at, has_preferences}`

### DELETE `/users/preferences`
Reset all preferences to defaults.

- **Response**: `{"detail": "User preferences reset successfully"}`

---

## Common Response Schemas

### Paginated Response
```json
{
  "items": [...],
  "page": 1,
  "page_size": 12,
  "total": 47,
  "total_pages": 4
}
```

### Error Response
```json
{"detail": "Error message string"}
```

### HTTP Status Codes
| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 204 | No Content (successful delete) |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (invalid/missing token) |
| 404 | Not Found |
| 422 | Unprocessable Entity (Pydantic validation) |
| 429 | Too Many Requests (rate limited) |
| 500 | Internal Server Error |
| 503 | Service Unavailable (SMTP down, or no LLM provider configured) |
