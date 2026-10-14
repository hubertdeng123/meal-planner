from __future__ import annotations

import re
from collections.abc import Mapping


CATEGORY_ORDER = (
    "Produce",
    "Meat & Seafood",
    "Dairy",
    "Pantry",
    "Other",
)
CATEGORY_RANK = {category: index for index, category in enumerate(CATEGORY_ORDER)}

# Shelf-stable forms of otherwise fresh ingredients ("chicken broth", "tomato paste",
# "coconut milk"); checked before the fresh categories.
PANTRY_FIRST_KEYWORDS = [
    "broth",
    "stock",
    "bouillon",
    "paste",
    "powder",
    "sauce",
    "flakes",
    "extract",
    "canned",
    "dried",
    "coconut milk",
    "almond milk",
    "oat milk",
    "peanut butter",
    "breadcrumbs",
    "tortilla",
    "noodle",
]

PRODUCE_KEYWORDS = [
    "tomato",
    "onion",
    "scallion",
    "shallot",
    "leek",
    "garlic",
    "potato",
    "sweet potato",
    "carrot",
    "bell pepper",
    "chili",
    "jalapeno",
    "jalapeño",
    "mushroom",
    "spinach",
    "kale",
    "lettuce",
    "arugula",
    "cabbage",
    "broccoli",
    "cauliflower",
    "zucchini",
    "courgette",
    "eggplant",
    "aubergine",
    "squash",
    "pumpkin",
    "celery",
    "cucumber",
    "corn",
    "green bean",
    "pea",
    "avocado",
    "lemon",
    "lime",
    "orange",
    "apple",
    "banana",
    "berry",
    "blueberry",
    "strawberry",
    "raspberry",
    "blackberry",
    "grape",
    "mango",
    "parsley",
    "basil",
    "cilantro",
    "coriander leaves",
    "mint",
    "dill",
    "thyme",
    "rosemary",
    "ginger",
]

DAIRY_KEYWORDS = [
    "milk",
    "buttermilk",
    "cheese",
    "butter",
    "ghee",
    "cream",
    "yogurt",
    "egg",
    "mozzarella",
    "parmesan",
    "ricotta",
    "feta",
    "cheddar",
    "halloumi",
    "paneer",
]

MEAT_KEYWORDS = [
    "chicken",
    "beef",
    "steak",
    "pork",
    "lamb",
    "ham",
    "fish",
    "salmon",
    "tuna",
    "cod",
    "shrimp",
    "prawn",
    "anchovy",
    "turkey",
    "bacon",
    "sausage",
    "chorizo",
]

PANTRY_KEYWORDS = [
    "rice",
    "pasta",
    "spaghetti",
    "penne",
    "rigatoni",
    "fusilli",
    "linguine",
    "macaroni",
    "noodle",
    "couscous",
    "quinoa",
    "bulgur",
    "oat",
    "flour",
    "sugar",
    "honey",
    "maple syrup",
    "salt",
    "pepper",
    "oil",
    "vinegar",
    "mustard",
    "miso",
    "tahini",
    "olive oil",
    "bread",
    "tortilla",
    "bean",
    "chickpea",
    "lentil",
    "almond",
    "walnut",
    "cashew",
    "peanut",
    "cumin",
    "paprika",
    "turmeric",
    "cinnamon",
    "oregano",
    "garam masala",
    "curry",
]


def _keyword_pattern(keywords: list[str]) -> re.Pattern[str]:
    """Match whole words only, allowing plurals (so "egg" matches "eggs" but not "eggplant")."""
    alternatives = []
    for keyword in sorted(keywords, key=len, reverse=True):
        escaped = re.escape(keyword)
        if keyword.endswith("y"):
            alternatives.append(f"{escaped[:-1]}(?:y|ies)")
        else:
            alternatives.append(f"{escaped}(?:e?s)?")
    return re.compile(rf"\b(?:{'|'.join(alternatives)})\b")


_CATEGORY_PATTERNS = (
    ("Pantry", _keyword_pattern(PANTRY_FIRST_KEYWORDS)),
    ("Produce", _keyword_pattern(PRODUCE_KEYWORDS)),
    ("Dairy", _keyword_pattern(DAIRY_KEYWORDS)),
    ("Meat & Seafood", _keyword_pattern(MEAT_KEYWORDS)),
    ("Pantry", _keyword_pattern(PANTRY_KEYWORDS)),
)


def categorize_ingredient(ingredient_name: str) -> str:
    """Map an ingredient name to a grocery aisle, or "Other" when nothing matches."""
    normalized_name = ingredient_name.lower()
    for category, pattern in _CATEGORY_PATTERNS:
        if pattern.search(normalized_name):
            return category
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
