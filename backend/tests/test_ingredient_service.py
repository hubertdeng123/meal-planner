from app.services.ingredient_service import (
    categorize_ingredient,
    normalize_ingredient_name,
    sorted_ingredient_entries,
)


def test_categorize_ingredient_maps_common_keywords():
    assert categorize_ingredient("Roma tomato") == "Produce"
    assert categorize_ingredient("Parmesan cheese") == "Dairy"
    assert categorize_ingredient("Ground turkey") == "Meat & Seafood"
    assert categorize_ingredient("Olive oil") == "Pantry"


def test_categorize_ingredient_matches_whole_words_only():
    assert categorize_ingredient("Eggplant") == "Produce"
    assert categorize_ingredient("Large eggs") == "Dairy"
    assert categorize_ingredient("Peanuts") == "Pantry"
    assert categorize_ingredient("Frozen peas") == "Produce"
    assert categorize_ingredient("Cornstarch") == "Other"


def test_categorize_ingredient_handles_plurals():
    assert categorize_ingredient("Cherry tomatoes") == "Produce"
    assert categorize_ingredient("Blueberries") == "Produce"
    assert categorize_ingredient("Anchovies") == "Meat & Seafood"


def test_categorize_ingredient_covers_legumes_pasta_and_spices():
    assert categorize_ingredient("Canned chickpeas") == "Pantry"
    assert categorize_ingredient("Black beans") == "Pantry"
    assert categorize_ingredient("Rigatoni") == "Pantry"
    assert categorize_ingredient("Ground cumin") == "Pantry"
    assert categorize_ingredient("Smoked paprika") == "Pantry"


def test_categorize_ingredient_prefers_shelf_stable_forms():
    assert categorize_ingredient("Chicken broth") == "Pantry"
    assert categorize_ingredient("Tomato paste") == "Pantry"
    assert categorize_ingredient("Coconut milk") == "Pantry"
    assert categorize_ingredient("Garlic powder") == "Pantry"
    assert categorize_ingredient("Egg noodles") == "Pantry"
    assert categorize_ingredient("Green beans") == "Produce"
    assert categorize_ingredient("Black pepper") == "Pantry"
    assert categorize_ingredient("Red bell pepper") == "Produce"
    assert categorize_ingredient("chili flake") == "Pantry"
    assert categorize_ingredient("pumpkin seed") == "Pantry"


def test_categorize_ingredient_falls_back_to_other():
    assert categorize_ingredient("mystery seasoning blend") == "Other"


def test_normalize_ingredient_name_trims_case_and_plurality():
    assert normalize_ingredient_name("  TOMATOES  ") == "tomato"
    assert normalize_ingredient_name("Olives") == "olives"
    assert normalize_ingredient_name("berries") == "berry"


def test_sorted_ingredient_entries_follows_shop_order():
    ingredient_map = {
        "salt": {"quantity": 1, "unit": "tsp", "category": "Pantry"},
        "milk": {"quantity": 1, "unit": "cup", "category": "Dairy"},
        "tomato": {"quantity": 2, "unit": "count", "category": "Produce"},
        "chicken breast": {"quantity": 1, "unit": "lb", "category": "Meat & Seafood"},
    }

    sorted_entries = sorted_ingredient_entries(ingredient_map)
    names = [name for name, _ in sorted_entries]
    assert names == ["tomato", "chicken breast", "milk", "salt"]
