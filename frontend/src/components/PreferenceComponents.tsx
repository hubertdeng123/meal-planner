import { useState } from 'react';
import type { UserPreferences, IngredientRules } from '../types';
import PreferenceCheckboxList from './ui/PreferenceCheckboxList';
import PreferenceRadioGroup from './ui/PreferenceRadioGroup';
import PreferenceNumberInput from './ui/PreferenceNumberInput';

const CUISINES = [
  'Italian',
  'Mexican',
  'Chinese',
  'Japanese',
  'Indian',
  'Thai',
  'French',
  'Mediterranean',
  'American',
  'Korean',
  'Vietnamese',
  'Greek',
  'Middle Eastern',
  'Spanish',
  'German',
  'British',
];

const DIETARY_RESTRICTIONS = [
  'Vegetarian',
  'Vegan',
  'Gluten-Free',
  'Dairy-Free',
  'Keto',
  'Paleo',
  'Low-Carb',
  'Nut-Free',
  'Kosher',
  'Halal',
  'Low-Sodium',
  'Diabetic',
  'Heart-Healthy',
];

const PROTEINS = [
  'Chicken',
  'Beef',
  'Pork',
  'Fish',
  'Seafood',
  'Turkey',
  'Lamb',
  'Tofu',
  'Tempeh',
  'Beans',
  'Lentils',
  'Eggs',
];

const COOKING_METHODS = [
  'Grilling',
  'Baking',
  'Roasting',
  'Stir-frying',
  'Steaming',
  'Sauteing',
  'Boiling',
  'Braising',
  'Slow cooking',
  'Pressure cooking',
  'Air frying',
  'Deep frying',
];

const COMMON_INGREDIENTS = [
  'Garlic',
  'Onion',
  'Tomato',
  'Bell peppers',
  'Mushrooms',
  'Spinach',
  'Broccoli',
  'Carrots',
  'Olive oil',
  'Coconut oil',
  'Herbs (basil, oregano)',
  'Spices (cumin, paprika)',
  'Ginger',
  'Lemon',
];

const SPICE_LEVELS = [
  { value: 'none', label: 'No Spice', description: 'Very mild, no heat' },
  { value: 'mild', label: 'Mild', description: 'Gentle warmth, kid-friendly' },
  { value: 'medium', label: 'Medium', description: 'Noticeable heat, comfortable for most' },
  { value: 'hot', label: 'Hot', description: 'Spicy, for those who enjoy heat' },
  { value: 'very_hot', label: 'Very Hot', description: 'Very spicy, for heat lovers' },
];

const FLAVOR_PROFILES = [
  'Savory',
  'Sweet',
  'Umami',
  'Fresh/Citrusy',
  'Rich/Creamy',
  'Smoky',
  'Tangy',
  'Earthy',
  'Aromatic',
  'Comfort Food',
  'Light & Clean',
  'Bold & Robust',
];

const NUTRITIONAL_NEEDS = [
  'High-protein',
  'Low-carb',
  'High-fiber',
  'Heart-healthy',
  'Weight-loss',
  'Muscle-building',
  'Anti-inflammatory',
  'Immune-boosting',
  'Energy-boosting',
];

const HEALTH_CONDITIONS = [
  'Diabetes',
  'Heart disease',
  'High blood pressure',
  'High cholesterol',
  'Digestive issues',
  'Arthritis',
  'Food allergies',
  'Celiac disease',
];

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const ETHICAL_CHOICES = [
  'Organic',
  'Local/Seasonal',
  'Fair Trade',
  'Sustainable Seafood',
  'Grass-fed',
  'Free-range',
];

const RELIGIOUS_DIETARY_LAWS = [
  'Kosher',
  'Halal',
  'Hindu Vegetarian',
  'Jain',
  'Buddhist Vegetarian',
];

interface PreferenceComponentProps {
  preferences: UserPreferences;
  onChange: (preferences: UserPreferences) => void;
}

export function BasicPreferencesComponent({ preferences, onChange }: PreferenceComponentProps) {
  return (
    <div className="space-y-6">
      <PreferenceCheckboxList
        label="Cuisine crushes"
        items={CUISINES}
        selectedItems={preferences.food_preferences.cuisines}
        onChange={cuisines =>
          onChange({
            ...preferences,
            food_preferences: { ...preferences.food_preferences, cuisines },
          })
        }
      />

      <PreferenceRadioGroup
        label="Spice level"
        name="spice_level"
        options={SPICE_LEVELS}
        value={preferences.food_preferences.preferred_spice_level}
        onChange={value =>
          onChange({
            ...preferences,
            food_preferences: {
              ...preferences.food_preferences,
              preferred_spice_level:
                value as UserPreferences['food_preferences']['preferred_spice_level'],
            },
          })
        }
        columns={2}
        showDescriptions
      />

      <PreferenceCheckboxList
        label="Flavor vibes"
        items={FLAVOR_PROFILES}
        selectedItems={preferences.food_preferences.flavor_profiles || []}
        onChange={flavor_profiles =>
          onChange({
            ...preferences,
            food_preferences: { ...preferences.food_preferences, flavor_profiles },
          })
        }
      />

      <PreferenceCheckboxList
        label="Dietary Restrictions & Preferences"
        items={DIETARY_RESTRICTIONS}
        selectedItems={preferences.dietary_restrictions}
        onChange={dietary_restrictions => onChange({ ...preferences, dietary_restrictions })}
      />
    </div>
  );
}

export function IngredientRulesComponent({ preferences, onChange }: PreferenceComponentProps) {
  const [newIngredient, setNewIngredient] = useState('');
  const [newReason, setNewReason] = useState('');
  const [activeCategory, setActiveCategory] = useState<keyof IngredientRules>('preferred');

  const categories = [
    { key: 'preferred' as const, title: 'Preferred', description: 'Love to see more often' },
    { key: 'must_include' as const, title: 'Must Include', description: 'Should be regular' },
    { key: 'disliked' as const, title: 'Disliked', description: 'Prefer to avoid' },
    { key: 'must_avoid' as const, title: 'Must Avoid', description: 'Cannot/will not eat' },
  ];

  const addIngredientRule = (
    category: keyof IngredientRules,
    ingredient: string,
    reason: string
  ) => {
    if (!ingredient.trim()) return;
    onChange({
      ...preferences,
      ingredient_rules: {
        ...preferences.ingredient_rules,
        [category]: [
          ...preferences.ingredient_rules[category],
          { ingredient: ingredient.trim(), reason: reason.trim() || 'Personal preference' },
        ],
      },
    });
  };

  const removeIngredientRule = (category: keyof IngredientRules, index: number) => {
    onChange({
      ...preferences,
      ingredient_rules: {
        ...preferences.ingredient_rules,
        [category]: preferences.ingredient_rules[category].filter((_, i) => i !== index),
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {categories.map(category => (
          <button
            key={category.key}
            onClick={() => setActiveCategory(category.key)}
            className={`px-3 py-2 rounded text-sm font-medium transition-all ${
              activeCategory === category.key
                ? 'bg-primary-soft text-primary-hover border-2 border-primary/30'
                : 'bg-slate-100 text-gray-600 border-2 border-transparent hover:bg-slate-200'
            }`}
          >
            {category.title}
          </button>
        ))}
      </div>

      <div className="border rounded-lg p-4">
        <h3 className="font-medium text-gray-900 mb-2">
          {categories.find(c => c.key === activeCategory)?.title} Ingredients
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          {categories.find(c => c.key === activeCategory)?.description}
        </p>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="Ingredient name"
            value={newIngredient}
            onChange={e => setNewIngredient(e.target.value)}
            className="flex-1 input text-sm"
          />
          <input
            type="text"
            placeholder="Reason (optional)"
            value={newReason}
            onChange={e => setNewReason(e.target.value)}
            className="flex-1 input text-sm"
          />
          <button
            onClick={() => {
              addIngredientRule(activeCategory, newIngredient, newReason);
              setNewIngredient('');
              setNewReason('');
            }}
            disabled={!newIngredient.trim()}
            className="btn-primary text-sm px-3 py-2 disabled:opacity-50"
          >
            Add
          </button>
        </div>

        <div className="space-y-2 max-h-48 overflow-y-auto">
          {(preferences.ingredient_rules?.[activeCategory] || []).map((item, index) => (
            <div key={index} className="flex items-center justify-between bg-slate-50 p-2 rounded">
              <div>
                <span className="font-medium text-sm">{item.ingredient}</span>
                {item.reason && <span className="text-gray-500 text-sm ml-2">({item.reason})</span>}
              </div>
              <button
                onClick={() => removeIngredientRule(activeCategory, index)}
                className="text-red-500 hover:text-red-700 text-sm"
              >
                Remove
              </button>
            </div>
          ))}
          {(preferences.ingredient_rules?.[activeCategory] || []).length === 0 && (
            <p className="text-gray-500 text-sm italic">Nothing here yet</p>
          )}
        </div>

        <div className="mt-4">
          <h4 className="font-medium text-gray-900 mb-2">Quick picks:</h4>
          <div className="flex flex-wrap gap-1">
            {COMMON_INGREDIENTS.slice(0, 8).map(ingredient => (
              <button
                key={ingredient}
                onClick={() => addIngredientRule(activeCategory, ingredient, 'Common ingredient')}
                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-xs text-gray-700 transition-colors"
              >
                + {ingredient}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function FoodTypeRulesComponent({ preferences, onChange }: PreferenceComponentProps) {
  return (
    <div className="space-y-6">
      <PreferenceCheckboxList
        label="Protein picks"
        items={PROTEINS}
        selectedItems={preferences.food_type_rules.protein_preferences}
        onChange={protein_preferences =>
          onChange({
            ...preferences,
            food_type_rules: { ...preferences.food_type_rules, protein_preferences },
          })
        }
      />

      <PreferenceCheckboxList
        label="Cooking methods you like"
        items={COOKING_METHODS}
        selectedItems={preferences.food_type_rules.cooking_methods_preferred}
        onChange={cooking_methods_preferred =>
          onChange({
            ...preferences,
            food_type_rules: { ...preferences.food_type_rules, cooking_methods_preferred },
          })
        }
      />

      <div>
        <PreferenceRadioGroup
          label="Meal complexity"
          name="meal_complexity"
          options={[
            { value: 'simple', label: 'Simple' },
            { value: 'medium', label: 'Medium' },
            { value: 'complex', label: 'Complex' },
          ]}
          value={preferences.food_type_rules.meal_complexity_preference}
          onChange={value =>
            onChange({
              ...preferences,
              food_type_rules: {
                ...preferences.food_type_rules,
                meal_complexity_preference:
                  value as UserPreferences['food_type_rules']['meal_complexity_preference'],
              },
            })
          }
        />
        <p className="text-xs text-gray-500 mt-2">
          Simple: Basic recipes. Medium: Balanced complexity. Complex: Advanced techniques.
        </p>
      </div>
    </div>
  );
}

export function NutritionalRulesComponent({ preferences, onChange }: PreferenceComponentProps) {
  const updateNutritionalRules = (updates: Partial<typeof preferences.nutritional_rules>) => {
    onChange({
      ...preferences,
      nutritional_rules: { ...preferences.nutritional_rules, ...updates },
    });
  };

  return (
    <div className="space-y-6">
      <PreferenceNumberInput
        label="Daily Calorie Target (optional)"
        placeholder="e.g., 2000"
        value={preferences.nutritional_rules.daily_calorie_target}
        onChange={daily_calorie_target => updateNutritionalRules({ daily_calorie_target })}
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Daily Calorie Range (optional)
        </label>
        <div className="grid grid-cols-2 gap-3">
          <PreferenceNumberInput
            label="Minimum"
            placeholder="e.g., 1800"
            value={preferences.nutritional_rules.daily_calorie_range?.min}
            onChange={min =>
              updateNutritionalRules({
                daily_calorie_range: {
                  min: min || 0,
                  max: preferences.nutritional_rules.daily_calorie_range?.max || 0,
                },
              })
            }
          />
          <PreferenceNumberInput
            label="Maximum"
            placeholder="e.g., 2200"
            value={preferences.nutritional_rules.daily_calorie_range?.max}
            onChange={max =>
              updateNutritionalRules({
                daily_calorie_range: {
                  min: preferences.nutritional_rules.daily_calorie_range?.min || 0,
                  max: max || 0,
                },
              })
            }
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Daily Macro Targets (grams, optional)
        </label>
        <div className="grid grid-cols-3 gap-3">
          <PreferenceNumberInput
            label="Protein (g)"
            placeholder="120"
            value={preferences.nutritional_rules.macro_targets?.protein_g}
            onChange={protein_g =>
              updateNutritionalRules({
                macro_targets: { ...preferences.nutritional_rules.macro_targets, protein_g },
              })
            }
          />
          <PreferenceNumberInput
            label="Carbs (g)"
            placeholder="200"
            value={preferences.nutritional_rules.macro_targets?.carbs_g}
            onChange={carbs_g =>
              updateNutritionalRules({
                macro_targets: { ...preferences.nutritional_rules.macro_targets, carbs_g },
              })
            }
          />
          <PreferenceNumberInput
            label="Fat (g)"
            placeholder="67"
            value={preferences.nutritional_rules.macro_targets?.fat_g}
            onChange={fat_g =>
              updateNutritionalRules({
                macro_targets: { ...preferences.nutritional_rules.macro_targets, fat_g },
              })
            }
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">Target grams per day for each macronutrient</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <PreferenceNumberInput
          label="Max Sodium (mg/day)"
          placeholder="2300"
          value={preferences.nutritional_rules.max_sodium_mg}
          onChange={max_sodium_mg => updateNutritionalRules({ max_sodium_mg })}
        />
        <PreferenceNumberInput
          label="Min Fiber (g/day)"
          placeholder="25"
          value={preferences.nutritional_rules.min_fiber_g}
          onChange={min_fiber_g => updateNutritionalRules({ min_fiber_g })}
        />
        <PreferenceNumberInput
          label="Max Sugar (g/day)"
          placeholder="50"
          value={preferences.nutritional_rules.max_sugar_g}
          onChange={max_sugar_g => updateNutritionalRules({ max_sugar_g })}
        />
      </div>

      <PreferenceCheckboxList
        label="Special Nutritional Needs"
        items={NUTRITIONAL_NEEDS}
        selectedItems={preferences.nutritional_rules.special_nutritional_needs}
        onChange={special_nutritional_needs =>
          updateNutritionalRules({ special_nutritional_needs })
        }
      />
    </div>
  );
}

export function SchedulingRulesComponent({ preferences, onChange }: PreferenceComponentProps) {
  const updateSchedulingRules = (updates: Partial<typeof preferences.scheduling_rules>) => {
    onChange({
      ...preferences,
      scheduling_rules: { ...preferences.scheduling_rules, ...updates },
    });
  };

  return (
    <div className="space-y-6">
      <PreferenceCheckboxList
        label="Best cooking days"
        items={DAYS_OF_WEEK}
        selectedItems={preferences.scheduling_rules.preferred_cooking_days}
        onChange={preferred_cooking_days => updateSchedulingRules({ preferred_cooking_days })}
        columns={4}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PreferenceNumberInput
          label="Max Prep Time - Weekdays (minutes)"
          placeholder="e.g., 30"
          value={preferences.scheduling_rules.max_prep_time_weekdays}
          onChange={max_prep_time_weekdays => updateSchedulingRules({ max_prep_time_weekdays })}
        />
        <PreferenceNumberInput
          label="Max Prep Time - Weekends (minutes)"
          placeholder="e.g., 60"
          value={preferences.scheduling_rules.max_prep_time_weekends}
          onChange={max_prep_time_weekends => updateSchedulingRules({ max_prep_time_weekends })}
        />
      </div>

      <div>
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={preferences.scheduling_rules.batch_cooking_preference}
            onChange={e => updateSchedulingRules({ batch_cooking_preference: e.target.checked })}
            className="rounded border-gray-300 text-primary focus:ring-primary-soft"
          />
          <span className="text-sm font-medium text-gray-700">I prefer batch cooking</span>
        </label>
      </div>

      <PreferenceRadioGroup
        label="How do you feel about leftovers?"
        name="leftover_tolerance"
        options={[
          { value: 'low', label: 'Low' },
          { value: 'medium', label: 'Medium' },
          { value: 'high', label: 'High' },
        ]}
        value={preferences.scheduling_rules.leftover_tolerance}
        onChange={value =>
          updateSchedulingRules({
            leftover_tolerance: value as UserPreferences['scheduling_rules']['leftover_tolerance'],
          })
        }
      />
    </div>
  );
}

export function DietaryRulesComponent({ preferences, onChange }: PreferenceComponentProps) {
  const updateDietaryRules = (updates: Partial<typeof preferences.dietary_rules>) => {
    onChange({
      ...preferences,
      dietary_rules: { ...preferences.dietary_rules, ...updates },
    });
  };

  return (
    <div className="space-y-6">
      <PreferenceCheckboxList
        label="Health Conditions (helps suggest appropriate recipes)"
        items={HEALTH_CONDITIONS}
        selectedItems={preferences.dietary_rules.health_conditions}
        onChange={health_conditions => updateDietaryRules({ health_conditions })}
      />

      <PreferenceCheckboxList
        label="Ethical Food Choices"
        items={ETHICAL_CHOICES}
        selectedItems={preferences.dietary_rules.ethical_choices}
        onChange={ethical_choices => updateDietaryRules({ ethical_choices })}
      />

      <PreferenceCheckboxList
        label="Religious Dietary Laws"
        items={RELIGIOUS_DIETARY_LAWS}
        selectedItems={preferences.dietary_rules.religious_dietary_laws}
        onChange={religious_dietary_laws => updateDietaryRules({ religious_dietary_laws })}
      />
    </div>
  );
}
