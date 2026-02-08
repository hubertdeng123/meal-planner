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
Generate a recipe with AI streaming.

- **Request Body**:
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
- **Response**: `text/event-stream` (SSE)
- **SSE Event Types**:
  | Type | Payload | Description |
  |------|---------|-------------|
  | `status` | `{message}` | Progress updates |
  | `thinking_start` | — | DeepSeek R1 reasoning begins |
  | `thinking` | `{content}` | Reasoning token chunk |
  | `thinking_end` | — | Reasoning complete |
  | `recipe_start` | — | Recipe output begins |
  | `recipe_name` | `{content: "name"}` | Recipe name |
  | `recipe_description` | `{content: "desc"}` | Description |
  | `recipe_metadata` | `{content: {prep_time, cook_time, servings}}` | Timing info |
  | `ingredients_start` | — | Ingredients section |
  | `ingredient` | `{content: {name, quantity, unit, notes}}` | Single ingredient |
  | `instructions_start` | — | Instructions section |
  | `instruction` | `{step, content}` | Single step |
  | `nutrition` | `{content: NutritionFacts}` | Nutrition data |
  | `complete` | `{recipe_id, message}` | Generation done, recipe saved |
  | `error` | `{message}` | Error occurred |

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
  | `tags` | string[] | — | Filter by tags |
  | `sort` | `created_at` \| `name` | `created_at` | Sort field |
  | `order` | `asc` \| `desc` | `desc` | Sort direction |
- **Response**: `PaginatedRecipes` (`{items, page, page_size, total, total_pages}`)

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
  All fields optional.
- **Response**: `RecipeFeedback`
- **Notes**: Upserts — updates existing feedback if already given

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
| 503 | Service Unavailable (SMTP down) |
