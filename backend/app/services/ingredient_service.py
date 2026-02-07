from __future__ import annotations

from collections.abc import Mapping


CATEGORY_ORDER = (
    "Produce",
    "Meat & Seafood",
    "Dairy",
    "Pantry",
    "Other",
)
CATEGORY_RANK = {category: index for index, category in enumerate(CATEGORY_ORDER)}

PRODUCE_KEYWORDS = [
    "tomato",
    "onion",
    "garlic",
    "potato",
    "carrot",
    "bell pepper",
    "mushroom",
    "spinach",
    "lettuce",
    "cucumber",
    "avocado",
    "lemon",
    "lime",
    "parsley",
    "basil",
    "cilantro",
    "ginger",
    "apple",
    "banana",
]

DAIRY_KEYWORDS = [
    "milk",
    "cheese",
    "butter",
    "cream",
    "yogurt",
    "egg",
    "mozzarella",
    "parmesan",
]

MEAT_KEYWORDS = [
    "chicken",
    "beef",
    "pork",
    "fish",
    "salmon",
    "shrimp",
    "turkey",
    "bacon",
    "sausage",
]

PANTRY_KEYWORDS = [
    "rice",
    "pasta",
    "flour",
    "sugar",
    "salt",
    "pepper",
    "oil",
    "vinegar",
    "soy sauce",
    "olive oil",
    "bread",
    "beans",
    "lentils",
]


def categorize_ingredient(ingredient_name: str) -> str:
    normalized_name = ingredient_name.lower()

    for keyword in PRODUCE_KEYWORDS:
        if keyword in normalized_name:
            return "Produce"
    for keyword in DAIRY_KEYWORDS:
        if keyword in normalized_name:
            return "Dairy"
    for keyword in MEAT_KEYWORDS:
        if keyword in normalized_name:
            return "Meat & Seafood"
    for keyword in PANTRY_KEYWORDS:
        if keyword in normalized_name:
            return "Pantry"
    return "Other"


def normalize_ingredient_name(ingredient_name: str) -> str:
    normalized = " ".join(ingredient_name.strip().lower().split())
    normalized = normalized.replace(",", "")

    # Conservative singularization for common patterns.
    if normalized.endswith("ies") and len(normalized) > 4:
        normalized = f"{normalized[:-3]}y"
    elif normalized.endswith("oes") and len(normalized) > 4:
        normalized = normalized[:-2]
    elif (
        normalized.endswith("s")
        and len(normalized) > 3
        and not normalized.endswith(("ss", "us", "is", "ves"))
    ):
        normalized = normalized[:-1]

    return normalized


def category_sort_key(category: str | None, ingredient_name: str) -> tuple[int, str]:
    category_name = (category or "Other").strip() or "Other"
    return (
        CATEGORY_RANK.get(category_name, len(CATEGORY_RANK)),
        normalize_ingredient_name(ingredient_name),
    )


def sorted_ingredient_entries(
    ingredient_map: Mapping[str, dict[str, str | float]],
) -> list[tuple[str, dict[str, str | float]]]:
    return sorted(
        ingredient_map.items(),
        key=lambda entry: category_sort_key(
            str(entry[1].get("category") or "Other"), entry[0]
        ),
    )
