"""Offline "demo" LLM for local development and tests.

A PydanticAI `FunctionModel` that streams believable reasoning and then calls the output tool
with a recipe assembled from a small template library. It reads the structured lines of the
prompt built by `app.services.recipe_generation`, so the result loosely follows the request
(meal type, cuisine, must-use / avoid ingredients, servings, time limit). No network calls.
"""

import asyncio
import json
import random
import re
import uuid
from collections.abc import AsyncIterator
from dataclasses import dataclass, field
from typing import Literal

from pydantic_ai.messages import (
    ModelMessage,
    ModelRequest,
    ModelResponse,
    ThinkingPart,
    ToolCallPart,
    UserPromptPart,
)
from pydantic_ai.models.function import (
    AgentInfo,
    DeltaThinkingCalls,
    DeltaThinkingPart,
    DeltaToolCall,
    DeltaToolCalls,
    FunctionModel,
)

from app.services import recipe_generation as prompts

DEMO_MODEL_NAME = "demo-chef"

_FIELD_LINE = re.compile(r"^-\s+(?P<label>[^:]+):\s*(?P<value>.+?)\s*$")
_MEAT_WORDS = (
    "chicken",
    "beef",
    "pork",
    "bacon",
    "lamb",
    "shrimp",
    "salmon",
    "fish",
    "anchov",
    "turkey",
    "sausage",
    "chorizo",
)
_ANIMAL_WORDS = _MEAT_WORDS + ("egg", "milk", "butter", "cheese", "yogurt", "cream", "honey", "parmesan", "feta", "ricotta")  # fmt: skip

# Swaps that keep a template plausible under a dietary restriction: ingredient -> substitute,
# plus the word swaps applied to the dish name, description and steps.
_VEGETARIAN_SWAPS = {
    "chicken thigh": "firm tofu",
    "ground pork": "firm tofu",
    "salmon fillet": "firm tofu",
    "fish sauce": "light soy sauce",
    "oyster sauce": "mushroom stir-fry sauce",
}
_VEGAN_SWAPS = _VEGETARIAN_SWAPS | {
    "feta": "vegan feta",
    "greek yogurt": "coconut yogurt",
    "milk": "oat milk",
    "ricotta salata": "vegan parmesan",
}
_TEXT_SWAPS = {
    "chicken": "tofu",
    "pork": "tofu",
    "salmon": "tofu",
    "fish sauce": "light soy sauce",
    " and the fish flakes": "",
    "the fish": "the tofu",
}


@dataclass(frozen=True)
class _Ingredient:
    name: str
    per_serving: float
    unit: str
    notes: str | None = None


@dataclass(frozen=True)
class _Dish:
    name: str
    cuisine: str
    meal_types: tuple[str, ...]
    description: str
    ingredients: tuple[_Ingredient, ...]
    steps: tuple[str, ...]
    prep: int
    cook: int
    tags: tuple[str, ...]
    nutrition: dict[str, float]
    hook: str


_I = _Ingredient
_DISHES: tuple[_Dish, ...] = (
    _Dish(
        name="Lemony Chickpea & Spinach Skillet",
        cuisine="Mediterranean",
        meal_types=("lunch", "dinner"),
        description="Crispy-edged chickpeas simmered with garlic, wilted spinach and a bright lemon-feta finish.",
        ingredients=(
            _I("chickpeas", 0.4, "cup", "drained and patted dry"),
            _I("baby spinach", 1.0, "cup"),
            _I("garlic", 0.75, "clove", "thinly sliced"),
            _I("olive oil", 0.5, "tbsp"),
            _I("lemon", 0.25, "whole", "zested and juiced"),
            _I("feta", 15, "g", "crumbled"),
            _I("smoked paprika", 0.25, "tsp"),
        ),
        steps=(
            "Heat the olive oil in a wide skillet over medium-high heat and add the chickpeas in a single layer.",
            "Cook without stirring for 4 minutes until blistered, then toss with the smoked paprika and garlic for 1 minute.",
            "Add the spinach a handful at a time, letting each batch wilt before adding the next.",
            "Take off the heat, stir in the lemon zest and juice, and season with salt and pepper.",
            "Scatter the feta over the top and serve warm.",
        ),
        prep=10,
        cook=15,
        tags=("vegetarian", "quick", "high-fiber", "one-pan"),
        nutrition={
            "calories": 340,
            "protein_g": 15,
            "carbs_g": 38,
            "fat_g": 14,
            "fiber_g": 11,
            "sugar_g": 5,
            "sodium_mg": 520,
        },  # fmt: skip
        hook="crisping the chickpeas first gives texture without needing much oil",
    ),
    _Dish(
        name="Thai Basil Chicken Stir-Fry",
        cuisine="Thai",
        meal_types=("lunch", "dinner"),
        description="Pad krapow-style chicken with holy basil, chillies and a glossy savory sauce, served over jasmine rice.",
        ingredients=(
            _I("chicken thigh", 150, "g", "finely chopped"),
            _I("jasmine rice", 0.5, "cup", "uncooked"),
            _I("thai basil", 0.5, "cup", "leaves picked"),
            _I("garlic", 1.0, "clove", "minced"),
            _I("bird's eye chili", 0.5, "whole", "sliced"),
            _I("fish sauce", 0.5, "tbsp"),
            _I("oyster sauce", 0.5, "tbsp"),
            _I("neutral oil", 0.5, "tbsp"),
        ),
        steps=(
            "Rinse the jasmine rice and cook it according to the package directions.",
            "Pound or finely chop the garlic and chili together into a rough paste.",
            "Heat the oil in a wok over high heat and fry the paste for 20 seconds until fragrant.",
            "Add the chicken and stir-fry for 4-5 minutes until cooked through and lightly browned.",
            "Stir in the fish sauce and oyster sauce, then toss in the basil until just wilted.",
            "Serve over the rice.",
        ),
        prep=10,
        cook=15,
        tags=("high-protein", "quick", "spicy", "dairy-free"),
        nutrition={
            "calories": 520,
            "protein_g": 36,
            "carbs_g": 58,
            "fat_g": 15,
            "fiber_g": 2,
            "sugar_g": 4,
            "sodium_mg": 980,
        },  # fmt: skip
        hook="high heat and a short cook keep the basil fragrant",
    ),
    _Dish(
        name="Black Bean & Sweet Potato Tacos",
        cuisine="Mexican",
        meal_types=("lunch", "dinner"),
        description="Roasted cumin sweet potato and smoky black beans in warm tortillas with a quick lime crema.",
        ingredients=(
            _I("sweet potato", 0.5, "whole", "cut into 1 cm cubes"),
            _I("black beans", 0.33, "cup", "drained"),
            _I("corn tortillas", 2, "whole"),
            _I("ground cumin", 0.5, "tsp"),
            _I("chipotle powder", 0.25, "tsp"),
            _I("lime", 0.25, "whole"),
            _I("greek yogurt", 2, "tbsp"),
            _I("red onion", 0.125, "whole", "finely diced"),
            _I("cilantro", 1, "tbsp", "chopped"),
        ),
        steps=(
            "Heat the oven to 220°C (425°F). Toss the sweet potato with oil, cumin and chipotle and roast for 20 minutes.",
            "Warm the black beans in a small pan with a splash of water and a pinch of salt, mashing a few against the side.",
            "Stir the lime juice into the yogurt to make a quick crema.",
            "Char the tortillas directly over a gas flame or in a dry skillet for 30 seconds per side.",
            "Fill each tortilla with beans and sweet potato, then top with onion, cilantro and the crema.",
        ),
        prep=10,
        cook=25,
        tags=("vegetarian", "high-fiber", "family-friendly"),
        nutrition={
            "calories": 410,
            "protein_g": 15,
            "carbs_g": 68,
            "fat_g": 8,
            "fiber_g": 14,
            "sugar_g": 9,
            "sodium_mg": 430,
        },  # fmt: skip
        hook="roasting the sweet potato hot gives caramelized edges that stand up to the beans",
    ),
    _Dish(
        name="Weeknight Chana Masala",
        cuisine="Indian",
        meal_types=("lunch", "dinner"),
        description="Chickpeas simmered in a gingery tomato-onion masala, finished with garam masala and fresh cilantro.",
        ingredients=(
            _I("chickpeas", 0.5, "cup", "drained"),
            _I("onion", 0.25, "whole", "finely chopped"),
            _I("crushed tomatoes", 0.33, "cup"),
            _I("fresh ginger", 0.5, "tsp", "grated"),
            _I("garlic", 0.75, "clove", "minced"),
            _I("garam masala", 0.5, "tsp"),
            _I("ground turmeric", 0.125, "tsp"),
            _I("cumin seeds", 0.25, "tsp"),
            _I("neutral oil", 0.5, "tbsp"),
            _I("basmati rice", 0.33, "cup", "uncooked, to serve"),
        ),
        steps=(
            "Start the basmati rice so it is ready when the curry is.",
            "Heat the oil in a heavy pan and sizzle the cumin seeds for 30 seconds.",
            "Add the onion and cook for 8 minutes until deep golden, then stir in the ginger and garlic for 1 minute.",
            "Add the turmeric and half the garam masala, then the crushed tomatoes; simmer for 5 minutes until the oil separates.",
            "Add the chickpeas and a splash of water, simmer for 10 minutes, and lightly mash a few to thicken.",
            "Finish with the remaining garam masala, adjust salt, and serve over rice.",
        ),
        prep=10,
        cook=30,
        tags=("vegan", "vegetarian", "high-fiber", "meal-prep"),
        nutrition={
            "calories": 450,
            "protein_g": 15,
            "carbs_g": 78,
            "fat_g": 9,
            "fiber_g": 12,
            "sugar_g": 8,
            "sodium_mg": 480,
        },  # fmt: skip
        hook="properly browning the onions is what gives the masala depth",
    ),
    _Dish(
        name="Miso-Glazed Salmon Rice Bowls",
        cuisine="Japanese",
        meal_types=("lunch", "dinner"),
        description="Broiled salmon with a sweet-savory miso glaze over rice with quick-pickled cucumber and sesame.",
        ingredients=(
            _I("salmon fillet", 140, "g", "skin on"),
            _I("white miso", 1, "tbsp"),
            _I("mirin", 0.5, "tbsp"),
            _I("soy sauce", 0.5, "tsp"),
            _I("short-grain rice", 0.5, "cup", "uncooked"),
            _I("cucumber", 0.25, "whole", "thinly sliced"),
            _I("rice vinegar", 1, "tbsp"),
            _I("sesame seeds", 1, "tsp", "toasted"),
            _I("scallion", 1, "whole", "sliced"),
        ),
        steps=(
            "Cook the rice according to the package directions.",
            "Toss the cucumber with the rice vinegar and a pinch of salt and sugar; set aside to pickle.",
            "Whisk the miso, mirin and soy sauce together and brush it generously over the salmon.",
            "Broil the salmon on a lined tray for 7-9 minutes until the glaze is caramelized and the fish flakes.",
            "Divide the rice into bowls, top with the salmon and cucumber, and finish with sesame seeds and scallion.",
        ),
        prep=10,
        cook=20,
        tags=("high-protein", "omega-3", "dairy-free"),
        nutrition={
            "calories": 560,
            "protein_g": 34,
            "carbs_g": 62,
            "fat_g": 18,
            "fiber_g": 2,
            "sugar_g": 7,
            "sodium_mg": 890,
        },  # fmt: skip
        hook="the broiler caramelizes the miso in minutes without overcooking the fish",
    ),
    _Dish(
        name="Rigatoni alla Norma",
        cuisine="Italian",
        meal_types=("lunch", "dinner"),
        description="Sicilian pasta with silky fried eggplant, garlicky tomato sauce, basil and salted ricotta.",
        ingredients=(
            _I("rigatoni", 90, "g"),
            _I("eggplant", 0.25, "whole", "cut into 2 cm cubes"),
            _I("crushed tomatoes", 0.5, "cup"),
            _I("garlic", 1, "clove", "sliced"),
            _I("olive oil", 1, "tbsp"),
            _I("fresh basil", 4, "leaves"),
            _I("ricotta salata", 15, "g", "grated (or pecorino)"),
            _I("chili flakes", 0.125, "tsp"),
        ),
        steps=(
            "Salt the eggplant cubes and let them sit for 10 minutes, then pat dry.",
            "Fry the eggplant in the olive oil over medium-high heat until deeply golden, about 8 minutes; set aside.",
            "In the same pan, soften the garlic and chili flakes, add the tomatoes and simmer for 10 minutes.",
            "Meanwhile, boil the rigatoni in well-salted water until al dente; reserve a cup of pasta water.",
            "Toss the pasta with the sauce, eggplant and torn basil, loosening with pasta water as needed.",
            "Serve topped with the grated ricotta salata.",
        ),
        prep=15,
        cook=25,
        tags=("vegetarian", "comfort-food"),
        nutrition={
            "calories": 520,
            "protein_g": 16,
            "carbs_g": 76,
            "fat_g": 17,
            "fiber_g": 8,
            "sugar_g": 11,
            "sodium_mg": 610,
        },  # fmt: skip
        hook="salting and frying the eggplant first makes it creamy instead of spongy",
    ),
    _Dish(
        name="Ginger Garlic Pork & Green Bean Stir-Fry",
        cuisine="Chinese",
        meal_types=("lunch", "dinner"),
        description="Dry-fried green beans with savory ground pork, ginger and a hint of Sichuan pepper.",
        ingredients=(
            _I("ground pork", 100, "g"),
            _I("green beans", 120, "g", "trimmed"),
            _I("fresh ginger", 1, "tsp", "minced"),
            _I("garlic", 1, "clove", "minced"),
            _I("soy sauce", 1, "tsp"),
            _I("shaoxing wine", 1, "tsp"),
            _I("sichuan peppercorns", 0.125, "tsp", "ground"),
            _I("neutral oil", 1, "tbsp"),
            _I("jasmine rice", 0.5, "cup", "uncooked, to serve"),
        ),
        steps=(
            "Start the rice.",
            "Blister the green beans in the oil in a hot wok for 6-7 minutes until wrinkled; push to the side.",
            "Add the pork and break it up, cooking until browned and a little crisp.",
            "Add the ginger, garlic and Sichuan pepper and stir-fry for 30 seconds.",
            "Splash in the Shaoxing wine and soy sauce, toss everything together, and serve over rice.",
        ),
        prep=10,
        cook=15,
        tags=("high-protein", "quick", "dairy-free"),
        nutrition={
            "calories": 540,
            "protein_g": 25,
            "carbs_g": 52,
            "fat_g": 25,
            "fiber_g": 4,
            "sugar_g": 3,
            "sodium_mg": 620,
        },  # fmt: skip
        hook="dry-frying the beans gives that blistered, savory bite without a heavy sauce",
    ),
    _Dish(
        name="Shakshuka with Herbed Yogurt",
        cuisine="Middle Eastern",
        meal_types=("breakfast", "lunch"),
        description="Eggs gently poached in a spiced pepper-tomato sauce, finished with garlicky herbed yogurt.",
        ingredients=(
            _I("eggs", 2, "whole"),
            _I("red bell pepper", 0.25, "whole", "sliced"),
            _I("crushed tomatoes", 0.5, "cup"),
            _I("onion", 0.25, "whole", "sliced"),
            _I("garlic", 0.5, "clove", "minced"),
            _I("ground cumin", 0.25, "tsp"),
            _I("smoked paprika", 0.25, "tsp"),
            _I("greek yogurt", 2, "tbsp"),
            _I("fresh parsley", 1, "tbsp", "chopped"),
            _I("crusty bread", 1, "slice", "to serve"),
        ),
        steps=(
            "Soften the onion and pepper in a little olive oil over medium heat for 8 minutes.",
            "Add the garlic, cumin and paprika for 1 minute, then the tomatoes; simmer for 8 minutes until thick.",
            "Make wells in the sauce, crack in the eggs, cover, and cook on low for 5-7 minutes until the whites set.",
            "Stir half the parsley into the yogurt with a pinch of salt.",
            "Spoon the yogurt over the shakshuka, scatter the remaining parsley, and serve with bread.",
        ),
        prep=10,
        cook=25,
        tags=("vegetarian", "high-protein", "brunch"),
        nutrition={
            "calories": 360,
            "protein_g": 19,
            "carbs_g": 32,
            "fat_g": 17,
            "fiber_g": 6,
            "sugar_g": 11,
            "sodium_mg": 560,
        },  # fmt: skip
        hook="covering the pan lets the whites set while the yolks stay jammy",
    ),
    _Dish(
        name="Blueberry Oat Breakfast Bake",
        cuisine="American",
        meal_types=("breakfast", "snack"),
        description="A cinnamon-scented baked oatmeal with bursting blueberries and a crisp almond top.",
        ingredients=(
            _I("rolled oats", 0.5, "cup"),
            _I("milk", 0.4, "cup"),
            _I("eggs", 0.5, "whole"),
            _I("blueberries", 0.33, "cup"),
            _I("maple syrup", 1, "tbsp"),
            _I("ground cinnamon", 0.25, "tsp"),
            _I("baking powder", 0.25, "tsp"),
            _I("sliced almonds", 1, "tbsp"),
        ),
        steps=(
            "Heat the oven to 190°C (375°F) and grease a baking dish.",
            "Mix the oats, cinnamon, baking powder and a pinch of salt in a bowl.",
            "Whisk the milk, eggs and maple syrup, then stir into the oats.",
            "Fold in most of the blueberries, pour into the dish, and top with the rest plus the almonds.",
            "Bake for 30-35 minutes until set and golden; rest 5 minutes before slicing.",
        ),
        prep=10,
        cook=35,
        tags=("vegetarian", "meal-prep", "kid-friendly"),
        nutrition={
            "calories": 330,
            "protein_g": 11,
            "carbs_g": 50,
            "fat_g": 10,
            "fiber_g": 6,
            "sugar_g": 17,
            "sodium_mg": 180,
        },  # fmt: skip
        hook="baking the oats makes a sliceable breakfast that reheats well all week",
    ),
    _Dish(
        name="Herby White Bean & Tomato Bruschetta",
        cuisine="Italian",
        meal_types=("snack", "lunch"),
        description="Toasted sourdough piled with garlicky smashed white beans, marinated tomatoes and basil.",
        ingredients=(
            _I("sourdough bread", 1.5, "slice"),
            _I("cannellini beans", 0.33, "cup", "drained"),
            _I("cherry tomatoes", 0.5, "cup", "quartered"),
            _I("garlic", 0.5, "clove", "halved"),
            _I("olive oil", 1, "tbsp"),
            _I("fresh basil", 3, "leaves", "torn"),
            _I("red wine vinegar", 0.5, "tsp"),
        ),
        steps=(
            "Toss the tomatoes with half the olive oil, the vinegar and a pinch of salt; let them marinate.",
            "Smash the beans with the remaining oil, salt and pepper until rough and creamy.",
            "Toast the bread until crisp, then rub with the cut garlic.",
            "Spread the beans on the toast, spoon over the tomatoes and their juices, and finish with basil.",
        ),
        prep=10,
        cook=5,
        tags=("vegan", "vegetarian", "quick", "no-cook"),
        nutrition={
            "calories": 300,
            "protein_g": 10,
            "carbs_g": 42,
            "fat_g": 10,
            "fiber_g": 7,
            "sugar_g": 4,
            "sodium_mg": 390,
        },  # fmt: skip
        hook="rubbing raw garlic on hot toast gives flavor without overpowering the beans",
    ),
)


@dataclass
class DemoBrief:
    """The parts of the prompt the demo model reacts to."""

    meal_type: str | None = None
    cuisine: str | None = None
    difficulty: str | None = None
    max_minutes: int | None = None
    servings: int = 4
    must_use: list[str] = field(default_factory=list)
    avoid: list[str] = field(default_factory=list)
    dietary: list[str] = field(default_factory=list)
    avoid_recipes: list[str] = field(default_factory=list)
    pantry: list[str] = field(default_factory=list)


def _join(items: list[str]) -> str:
    if len(items) <= 2:
        return " and ".join(items)
    return f"{', '.join(items[:-1])} and {items[-1]}"


def _split(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


def parse_brief(prompt: str) -> DemoBrief:
    """Read the labelled `- Label: value` lines written by `build_recipe_prompt`."""
    fields: dict[str, str] = {}
    for line in prompt.splitlines():
        match = _FIELD_LINE.match(line.strip())
        if match:
            fields[match.group("label").strip()] = match.group("value")

    brief = DemoBrief()
    brief.meal_type = (fields.get(prompts.LABEL_MEAL_TYPE) or "").lower() or None
    brief.cuisine = fields.get(prompts.LABEL_CUISINE) or None
    brief.difficulty = (fields.get(prompts.LABEL_DIFFICULTY) or "").lower() or None
    if minutes := re.match(r"\d+", fields.get(prompts.LABEL_MAX_TIME, "")):
        brief.max_minutes = int(minutes.group())
    if servings := re.match(r"\d+", fields.get(prompts.LABEL_SERVINGS, "")):
        brief.servings = max(1, min(int(servings.group()), 24))
    brief.must_use = _split(fields.get(prompts.LABEL_MUST_USE, ""))
    brief.avoid = _split(fields.get(prompts.LABEL_MUST_AVOID, "")) + _split(
        fields.get(prompts.LABEL_AVOID_DISLIKED, "")
    )
    brief.dietary = [
        item.lower()
        for item in _split(fields.get(prompts.LABEL_DIETARY, ""))
        + _split(fields.get(prompts.LABEL_DIETARY_PROFILE, ""))
    ]
    brief.avoid_recipes = [
        name.lower() for name in _split(fields.get(prompts.LABEL_AVOID_RECIPES, ""))
    ]
    brief.pantry = _split(fields.get(prompts.LABEL_PANTRY, ""))
    return brief


def _mentions(name: str, terms: list[str]) -> bool:
    lowered = name.lower()
    return any(term.lower() in lowered or lowered in term.lower() for term in terms)


def _diet(dietary: list[str]) -> Literal["vegan", "vegetarian"] | None:
    if any("vegan" in d for d in dietary):
        return "vegan"
    if any("vegetarian" in d for d in dietary):
        return "vegetarian"
    return None


def _swaps_for(diet: str | None) -> dict[str, str]:
    if diet == "vegan":
        return _VEGAN_SWAPS
    if diet == "vegetarian":
        return _VEGETARIAN_SWAPS
    return {}


def _ingredient_names(dish: _Dish, diet: str | None) -> list[str]:
    swaps = _swaps_for(diet)
    return [swaps.get(ing.name, ing.name) for ing in dish.ingredients]


def _fits_diet(names: list[str], diet: str | None) -> bool:
    if diet == "vegan":
        return not any(_mentions(n, list(_ANIMAL_WORDS)) for n in names)
    if diet == "vegetarian":
        return not any(_mentions(n, list(_MEAT_WORDS)) for n in names)
    return True


def _swap_text(text: str, diet: str | None) -> str:
    if diet is None:
        return text
    for word, replacement in _TEXT_SWAPS.items():
        text = re.sub(
            re.escape(word),
            lambda m, r=replacement: r.capitalize() if m.group()[0].isupper() else r,
            text,
            flags=re.I,
        )
    return text


def choose_dish(brief: DemoBrief, rng: random.Random) -> _Dish:
    """Pick the template that best matches the brief, preferring ones the user doesn't have."""

    diet = _diet(brief.dietary)

    def score(dish: _Dish) -> float:
        value = rng.random()
        dish_ingredients = _ingredient_names(dish, diet)
        if brief.cuisine and dish.cuisine.lower() == brief.cuisine.lower():
            value += 8
        if brief.meal_type and brief.meal_type in dish.meal_types:
            value += 4
        if not _fits_diet(dish_ingredients, diet):
            value -= 20
        elif _fits_diet([ing.name for ing in dish.ingredients], diet):
            value += 1
        base_name = _swap_text(dish.name, diet).lower()
        if any(base_name in existing for existing in brief.avoid_recipes):
            value -= 10
        if brief.max_minutes and dish.prep + dish.cook <= brief.max_minutes:
            value += 2
        value += sum(
            1.5 for item in brief.must_use if _mentions(item, dish_ingredients)
        )
        value -= sum(3 for item in brief.avoid if _mentions(item, dish_ingredients))
        return value

    return max(_DISHES, key=score)


def _round_quantity(value: float) -> float:
    if value >= 10:
        return float(round(value / 5) * 5) or 5.0
    return max(0.25, round(value * 4) / 4)


def build_demo_recipe(brief: DemoBrief, dish: _Dish) -> dict:
    """Turn a template into a `RecipeLLM`-shaped dict adapted to the brief."""
    servings = brief.servings
    diet = _diet(brief.dietary)
    ingredients = [
        {
            "name": name,
            "quantity": _round_quantity(ing.per_serving * servings),
            "unit": ing.unit,
            "notes": ing.notes,
        }
        for ing, name in zip(dish.ingredients, _ingredient_names(dish, diet))
        if not (brief.avoid and _mentions(name, brief.avoid))
    ]
    existing = [ing["name"] for ing in ingredients]
    added = [item for item in brief.must_use if not _mentions(item, existing)]
    for item in added:
        ingredients.append(
            {
                "name": item.lower(),
                "quantity": _round_quantity(0.5 * servings),
                "unit": "cup",
                "notes": "chopped",
            }
        )

    steps = [_swap_text(step, diet) for step in dish.steps]
    if added:
        steps.insert(
            len(steps) - 1,
            f"Fold in the {' and '.join(a.lower() for a in added)} and cook for 2-3 minutes until warmed through.",
        )

    name = _swap_text(dish.name, diet)
    if added:
        name = f"{name} with {added[0].title()}"
    cuisine = brief.cuisine or dish.cuisine
    if brief.cuisine and brief.cuisine.lower() != dish.cuisine.lower():
        base = re.sub(rf"\b{re.escape(dish.cuisine)}\s+", "", name, flags=re.I)
        name = f"{brief.cuisine}-Style {base}"

    prep, cook = dish.prep, dish.cook
    if brief.max_minutes and prep + cook > brief.max_minutes:
        ratio = brief.max_minutes / (prep + cook)
        prep = max(5, int(prep * ratio))
        cook = max(5, brief.max_minutes - prep)

    tags = list(dish.tags)
    if diet and diet not in tags:
        tags.insert(0, diet)
    if diet == "vegan" and "vegetarian" not in tags:
        tags.insert(1, "vegetarian")
    if brief.meal_type and brief.meal_type not in tags:
        tags.append(brief.meal_type)

    nutrition = dict(dish.nutrition)
    nutrition["calories"] = int(nutrition["calories"])
    nutrition["sodium_mg"] = int(nutrition["sodium_mg"])

    return {
        "name": name,
        "description": _swap_text(dish.description, diet),
        "cuisine": cuisine,
        "ingredients": ingredients,
        "instructions": steps,
        "prep_time_minutes": prep,
        "cook_time_minutes": cook,
        "servings": servings,
        "tags": tags,
        "nutrition": nutrition,
        "source_urls": [],
    }


def build_demo_thinking(brief: DemoBrief, dish: _Dish, recipe: dict) -> str:
    """Write the reasoning the demo model "thinks" before answering."""
    meal = brief.meal_type or "meal"
    who = f"{brief.servings} {'person' if brief.servings == 1 else 'people'}"
    parts = [f"The brief is a {meal} for {who}."]
    if brief.cuisine:
        parts.append(
            f"It has to be {brief.cuisine}, so I'll lean on authentic flavors rather than a fusion shortcut."
        )
    else:
        parts.append(
            "No cuisine was specified, so I can pick whatever fits the rest of the brief best."
        )
    if brief.must_use:
        parts.append(
            f"They want to use up {_join(brief.must_use)}, which should be central, not a garnish."
        )
    if brief.avoid:
        parts.append(f"I need to keep {_join(brief.avoid[:5])} out of it entirely.")
    if brief.dietary:
        parts.append(
            f"Dietary needs: {', '.join(brief.dietary)}. I'll check every ingredient against that."
        )
    if brief.max_minutes:
        parts.append(
            f"There's a {brief.max_minutes}-minute ceiling, so nothing that needs a long braise or an overnight soak."
        )
    if brief.avoid_recipes:
        parts.append(
            "They already have a few recipes saved, so I'll steer away from anything that repeats one of those."
        )
    if brief.pantry:
        parts.append(
            f"The pantry has {_join(brief.pantry[:4])} on hand, which helps keep the shopping list short."
        )
    diet = _diet(brief.dietary)
    swaps = _swaps_for(diet)
    swapped = [ing.name for ing in dish.ingredients if ing.name in swaps]
    if swapped:
        parts.append(
            f"The classic version uses {_join(swapped)}, so I'll swap in "
            f"{_join(list(dict.fromkeys(swaps[name] for name in swapped)))} to keep it {diet}."
        )
    parts.append(
        f"{recipe['name']} feels right: {_swap_text(dish.hook, diet)}. "
        f"Total time is about {recipe['prep_time_minutes'] + recipe['cook_time_minutes']} minutes."
    )
    parts.append(
        f"I'll scale the quantities for {recipe['servings']} servings, keep the steps short and concrete, "
        "and estimate nutrition per serving. Writing it up now."
    )
    return " ".join(parts)


def _latest_user_prompt(messages: list[ModelMessage]) -> str:
    for message in reversed(messages):
        if isinstance(message, ModelRequest):
            for part in message.parts:
                if isinstance(part, UserPromptPart) and isinstance(part.content, str):
                    return part.content
    return ""


def _chunks(text: str, size: int) -> list[str]:
    return [text[i : i + size] for i in range(0, len(text), size)]


def _word_chunks(text: str, words_per_chunk: int = 3) -> list[str]:
    words = text.split(" ")
    return [
        " ".join(words[i : i + words_per_chunk])
        + (" " if i + words_per_chunk < len(words) else "")
        for i in range(0, len(words), words_per_chunk)
    ]


def _plan(messages: list[ModelMessage]) -> tuple[str, str]:
    brief = parse_brief(_latest_user_prompt(messages))
    rng = random.Random()
    dish = choose_dish(brief, rng)
    recipe = build_demo_recipe(brief, dish)
    return build_demo_thinking(brief, dish, recipe), json.dumps(recipe)


def _output_tool_name(info: AgentInfo) -> str:
    if not info.output_tools:
        raise RuntimeError("The demo model requires a tool-based structured output.")
    return info.output_tools[0].name


def build_demo_model(delay_scale: float = 1.0) -> FunctionModel:
    """Create the demo model; ``delay_scale=0`` removes all artificial latency."""

    async def pause(seconds: float) -> None:
        if delay_scale > 0:
            await asyncio.sleep(seconds * delay_scale)

    async def stream(
        messages: list[ModelMessage], info: AgentInfo
    ) -> AsyncIterator[DeltaThinkingCalls | DeltaToolCalls]:
        tool_name = _output_tool_name(info)
        thinking, args = _plan(messages)

        await pause(0.8)
        for chunk in _word_chunks(thinking):
            yield {0: DeltaThinkingPart(content=chunk)}
            await pause(0.06)

        await pause(0.4)
        tool_call_id = f"demo_{uuid.uuid4().hex[:12]}"
        for index, chunk in enumerate(_chunks(args, 16)):
            if index == 0:
                yield {
                    1: DeltaToolCall(
                        name=tool_name, json_args=chunk, tool_call_id=tool_call_id
                    )
                }
            else:
                yield {1: DeltaToolCall(json_args=chunk)}
            await pause(0.03)

    def respond(messages: list[ModelMessage], info: AgentInfo) -> ModelResponse:
        thinking, args = _plan(messages)
        return ModelResponse(
            parts=[
                ThinkingPart(content=thinking),
                ToolCallPart(tool_name=_output_tool_name(info), args=args),
            ],
            model_name=DEMO_MODEL_NAME,
        )

    return FunctionModel(respond, stream_function=stream, model_name=DEMO_MODEL_NAME)
