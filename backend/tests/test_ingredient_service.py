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
