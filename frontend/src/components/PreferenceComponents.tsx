import { useState } from 'react';
import type { UserPreferences, IngredientRules } from '../types';

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
  'Sautéing',
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
] as const;

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

interface PreferenceComponentProps {
  preferences: UserPreferences;
  onChange: (preferences: UserPreferences) => void;
}

const toggleArrayItem = (array: string[], item: string) => {
  return array.includes(item) ? array.filter(i => i !== item) : [...array, item];
};

export function BasicPreferencesComponent({ preferences, onChange }: PreferenceComponentProps) {
  return (
    <div className="space-y-6">
      {/* Cuisines */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Cuisine crushes</label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {CUISINES.map(cuisine => (
            <label key={cuisine} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.food_preferences.cuisines.includes(cuisine)}
                onChange={() =>
                  onChange({
                    ...preferences,
                    food_preferences: {
                      ...preferences.food_preferences,
                      cuisines: toggleArrayItem(preferences.food_preferences.cuisines, cuisine),
                    },
                  })
                }
                className="rounded border-gray-300 text-[#f97316] focus:ring-[#f97316]/40"
              />
              <span className="text-sm text-gray-700">{cuisine}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Spice Level Preference */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Spice level</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {SPICE_LEVELS.map(level => (
            <label
              key={level.value}
              className="flex items-start space-x-3 cursor-pointer p-3 border rounded-lg hover:bg-slate-50 transition-colors"
            >
              <input
                type="radio"
                name="spice_level"
                value={level.value}
                checked={preferences.food_preferences.preferred_spice_level === level.value}
                onChange={() =>
                  onChange({
                    ...preferences,
                    food_preferences: {
                      ...preferences.food_preferences,
                      preferred_spice_level: level.value,
                    },
                  })
                }
                className="mt-1 border-gray-300 text-[#f97316] focus:ring-[#f97316]/40"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">{level.label}</span>
                <p className="text-xs text-gray-500">{level.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Flavor Profiles */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Flavor vibes</label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {FLAVOR_PROFILES.map(profile => (
            <label key={profile} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={(preferences.food_preferences.flavor_profiles || []).includes(profile)}
                onChange={() =>
                  onChange({
                    ...preferences,
                    food_preferences: {
                      ...preferences.food_preferences,
                      flavor_profiles: toggleArrayItem(
                        preferences.food_preferences.flavor_profiles || [],
                        profile
                      ),
                    },
                  })
                }
                className="rounded border-gray-300 text-[#f97316] focus:ring-[#f97316]/40"
              />
              <span className="text-sm text-gray-700">{profile}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Dietary Restrictions */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Dietary Restrictions & Preferences
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {DIETARY_RESTRICTIONS.map(restriction => (
            <label key={restriction} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.dietary_restrictions.includes(restriction)}
                onChange={() =>
                  onChange({
                    ...preferences,
                    dietary_restrictions: toggleArrayItem(
                      preferences.dietary_restrictions,
                      restriction
                    ),
                  })
                }
                className="rounded border-gray-300 text-[#f97316] focus:ring-[#f97316]/40"
              />
              <span className="text-sm text-gray-700">{restriction}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

export function IngredientRulesComponent({ preferences, onChange }: PreferenceComponentProps) {
  const [newIngredient, setNewIngredient] = useState('');
  const [newReason, setNewReason] = useState('');
  const [activeCategory, setActiveCategory] = useState<keyof IngredientRules>('preferred');

  const categories = [
    {
      key: 'preferred' as const,
      title: 'Preferred',
      color: 'green',
      description: 'Love to see more often',
    },
    {
      key: 'must_include' as const,
      title: 'Must Include',
      color: 'blue',
      description: 'Should be regular',
    },
    {
      key: 'disliked' as const,
      title: 'Disliked',
      color: 'yellow',
      description: 'Prefer to avoid',
    },
    {
      key: 'must_avoid' as const,
      title: 'Must Avoid',
      color: 'red',
      description: 'Cannot/will not eat',
    },
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
          {
            ingredient: ingredient.trim(),
            reason: reason.trim() || 'Personal preference',
          },
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
      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2">
        {categories.map(category => (
          <button
            key={category.key}
            onClick={() => setActiveCategory(category.key)}
            className={`px-3 py-2 rounded text-sm font-medium transition-all ${
              activeCategory === category.key
                ? 'bg-[#f97316]/10 text-[#ea580c] border-2 border-[#f97316]/30'
                : 'bg-slate-100 text-gray-600 border-2 border-transparent hover:bg-slate-200'
            }`}
          >
            {category.title}
          </button>
        ))}
      </div>

      {/* Active Category */}
      <div className="border rounded-lg p-4">
        <h3 className="font-medium text-gray-900 mb-2">
          {categories.find(c => c.key === activeCategory)?.title} Ingredients
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          {categories.find(c => c.key === activeCategory)?.description}
        </p>

        {/* Add New Ingredient */}
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

        {/* Current Items */}
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

        {/* Quick Add Common Ingredients */}
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
      {/* Protein Preferences */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Protein picks</label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {PROTEINS.map(protein => (
            <label key={protein} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.food_type_rules.protein_preferences.includes(protein)}
                onChange={() =>
                  onChange({
                    ...preferences,
                    food_type_rules: {
                      ...preferences.food_type_rules,
                      protein_preferences: toggleArrayItem(
                        preferences.food_type_rules.protein_preferences,
                        protein
                      ),
                    },
                  })
                }
                className="rounded border-gray-300 text-[#f97316] focus:ring-[#f97316]/40"
              />
              <span className="text-sm text-gray-700">{protein}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Cooking Methods */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Cooking methods you like
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {COOKING_METHODS.map(method => (
            <label key={method} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.food_type_rules.cooking_methods_preferred.includes(method)}
                onChange={() =>
                  onChange({
                    ...preferences,
                    food_type_rules: {
                      ...preferences.food_type_rules,
                      cooking_methods_preferred: toggleArrayItem(
                        preferences.food_type_rules.cooking_methods_preferred,
                        method
                      ),
                    },
                  })
                }
                className="rounded border-gray-300 text-[#f97316] focus:ring-[#f97316]/40"
              />
              <span className="text-sm text-gray-700">{method}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Meal Complexity */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Meal complexity</label>
        <div className="grid grid-cols-3 gap-3">
          {(['simple', 'medium', 'complex'] as const).map(complexity => (
            <label key={complexity} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="meal_complexity"
                value={complexity}
                checked={preferences.food_type_rules.meal_complexity_preference === complexity}
                onChange={() =>
                  onChange({
                    ...preferences,
                    food_type_rules: {
                      ...preferences.food_type_rules,
                      meal_complexity_preference: complexity,
                    },
                  })
                }
                className="border-gray-300 text-[#f97316] focus:ring-[#f97316]/40"
              />
              <span className="text-sm text-gray-700 capitalize">{complexity}</span>
            </label>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Simple: Basic recipes. Medium: Balanced complexity. Complex: Advanced techniques.
        </p>
      </div>
    </div>
  );
}

export function NutritionalRulesComponent({ preferences, onChange }: PreferenceComponentProps) {
  return (
    <div className="space-y-6">
      {/* Calorie Target */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Daily Calorie Target (optional)
        </label>
        <input
          type="number"
          placeholder="e.g., 2000"
          value={preferences.nutritional_rules.daily_calorie_target || ''}
          onChange={e =>
            onChange({
              ...preferences,
              nutritional_rules: {
                ...preferences.nutritional_rules,
                daily_calorie_target: e.target.value ? parseInt(e.target.value) : undefined,
              },
            })
          }
          className="input w-full"
        />
      </div>

      {/* Calorie Range */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Daily Calorie Range (optional)
        </label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Minimum</label>
            <input
              type="number"
              placeholder="e.g., 1800"
              value={preferences.nutritional_rules.daily_calorie_range?.min || ''}
              onChange={e =>
                onChange({
                  ...preferences,
                  nutritional_rules: {
                    ...preferences.nutritional_rules,
                    daily_calorie_range: {
                      min: e.target.value ? parseInt(e.target.value) : 0,
                      max: preferences.nutritional_rules.daily_calorie_range?.max || 0,
                    },
                  },
                })
              }
              className="input w-full"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Maximum</label>
            <input
              type="number"
              placeholder="e.g., 2200"
              value={preferences.nutritional_rules.daily_calorie_range?.max || ''}
              onChange={e =>
                onChange({
                  ...preferences,
                  nutritional_rules: {
                    ...preferences.nutritional_rules,
                    daily_calorie_range: {
                      min: preferences.nutritional_rules.daily_calorie_range?.min || 0,
                      max: e.target.value ? parseInt(e.target.value) : 0,
                    },
                  },
                })
              }
              className="input w-full"
            />
          </div>
        </div>
      </div>

      {/* Macro Targets */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Daily Macro Targets (grams, optional)
        </label>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Protein (g)</label>
            <input
              type="number"
              placeholder="120"
              min="0"
              value={preferences.nutritional_rules.macro_targets?.protein_g || ''}
              onChange={e =>
                onChange({
                  ...preferences,
                  nutritional_rules: {
                    ...preferences.nutritional_rules,
                    macro_targets: {
                      ...preferences.nutritional_rules.macro_targets,
                      protein_g: e.target.value ? parseInt(e.target.value) : undefined,
                      carbs_g: preferences.nutritional_rules.macro_targets?.carbs_g,
                      fat_g: preferences.nutritional_rules.macro_targets?.fat_g,
                    },
                  },
                })
              }
              className="input w-full"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Carbs (g)</label>
            <input
              type="number"
              placeholder="200"
              min="0"
              value={preferences.nutritional_rules.macro_targets?.carbs_g || ''}
              onChange={e =>
                onChange({
                  ...preferences,
                  nutritional_rules: {
                    ...preferences.nutritional_rules,
                    macro_targets: {
                      ...preferences.nutritional_rules.macro_targets,
                      protein_g: preferences.nutritional_rules.macro_targets?.protein_g,
                      carbs_g: e.target.value ? parseInt(e.target.value) : undefined,
                      fat_g: preferences.nutritional_rules.macro_targets?.fat_g,
                    },
                  },
                })
              }
              className="input w-full"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Fat (g)</label>
            <input
              type="number"
              placeholder="67"
              min="0"
              value={preferences.nutritional_rules.macro_targets?.fat_g || ''}
              onChange={e =>
                onChange({
                  ...preferences,
                  nutritional_rules: {
                    ...preferences.nutritional_rules,
                    macro_targets: {
                      ...preferences.nutritional_rules.macro_targets,
                      protein_g: preferences.nutritional_rules.macro_targets?.protein_g,
                      carbs_g: preferences.nutritional_rules.macro_targets?.carbs_g,
                      fat_g: e.target.value ? parseInt(e.target.value) : undefined,
                    },
                  },
                })
              }
              className="input w-full"
            />
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-1">Target grams per day for each macronutrient</p>
      </div>

      {/* Additional Nutritional Limits */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Max Sodium (mg/day)
          </label>
          <input
            type="number"
            placeholder="2300"
            value={preferences.nutritional_rules.max_sodium_mg || ''}
            onChange={e =>
              onChange({
                ...preferences,
                nutritional_rules: {
                  ...preferences.nutritional_rules,
                  max_sodium_mg: e.target.value ? parseInt(e.target.value) : undefined,
                },
              })
            }
            className="input w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Min Fiber (g/day)</label>
          <input
            type="number"
            placeholder="25"
            value={preferences.nutritional_rules.min_fiber_g || ''}
            onChange={e =>
              onChange({
                ...preferences,
                nutritional_rules: {
                  ...preferences.nutritional_rules,
                  min_fiber_g: e.target.value ? parseInt(e.target.value) : undefined,
                },
              })
            }
            className="input w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Max Sugar (g/day)</label>
          <input
            type="number"
            placeholder="50"
            value={preferences.nutritional_rules.max_sugar_g || ''}
            onChange={e =>
              onChange({
                ...preferences,
                nutritional_rules: {
                  ...preferences.nutritional_rules,
                  max_sugar_g: e.target.value ? parseInt(e.target.value) : undefined,
                },
              })
            }
            className="input w-full"
          />
        </div>
      </div>

      {/* Special Nutritional Needs */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Special Nutritional Needs
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {NUTRITIONAL_NEEDS.map(need => (
            <label key={need} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.nutritional_rules.special_nutritional_needs.includes(need)}
                onChange={() =>
                  onChange({
                    ...preferences,
                    nutritional_rules: {
                      ...preferences.nutritional_rules,
                      special_nutritional_needs: toggleArrayItem(
                        preferences.nutritional_rules.special_nutritional_needs,
                        need
                      ),
                    },
                  })
                }
                className="rounded border-gray-300 text-[#f97316] focus:ring-[#f97316]/40"
              />
              <span className="text-sm text-gray-700">{need}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SchedulingRulesComponent({ preferences, onChange }: PreferenceComponentProps) {
  return (
    <div className="space-y-6">
      {/* Preferred Cooking Days */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Best cooking days</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(
            day => (
              <label key={day} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.scheduling_rules.preferred_cooking_days.includes(day)}
                  onChange={() =>
                    onChange({
                      ...preferences,
                      scheduling_rules: {
                        ...preferences.scheduling_rules,
                        preferred_cooking_days: toggleArrayItem(
                          preferences.scheduling_rules.preferred_cooking_days,
                          day
                        ),
                      },
                    })
                  }
                  className="rounded border-gray-300 text-[#f97316] focus:ring-[#f97316]/40"
                />
                <span className="text-sm text-gray-700">{day}</span>
              </label>
            )
          )}
        </div>
      </div>

      {/* Time Limits */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Max Prep Time - Weekdays (minutes)
          </label>
          <input
            type="number"
            placeholder="e.g., 30"
            value={preferences.scheduling_rules.max_prep_time_weekdays || ''}
            onChange={e =>
              onChange({
                ...preferences,
                scheduling_rules: {
                  ...preferences.scheduling_rules,
                  max_prep_time_weekdays: e.target.value ? parseInt(e.target.value) : undefined,
                },
              })
            }
            className="input w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Max Prep Time - Weekends (minutes)
          </label>
          <input
            type="number"
            placeholder="e.g., 60"
            value={preferences.scheduling_rules.max_prep_time_weekends || ''}
            onChange={e =>
              onChange({
                ...preferences,
                scheduling_rules: {
                  ...preferences.scheduling_rules,
                  max_prep_time_weekends: e.target.value ? parseInt(e.target.value) : undefined,
                },
              })
            }
            className="input w-full"
          />
        </div>
      </div>

      {/* Batch Cooking */}
      <div>
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={preferences.scheduling_rules.batch_cooking_preference}
            onChange={e =>
              onChange({
                ...preferences,
                scheduling_rules: {
                  ...preferences.scheduling_rules,
                  batch_cooking_preference: e.target.checked,
                },
              })
            }
            className="rounded border-gray-300 text-[#f97316] focus:ring-[#f97316]/40"
          />
          <span className="text-sm font-medium text-gray-700">I prefer batch cooking</span>
        </label>
      </div>

      {/* Leftover Tolerance */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          How do you feel about leftovers?
        </label>
        <div className="grid grid-cols-3 gap-3">
          {(['low', 'medium', 'high'] as const).map(tolerance => (
            <label key={tolerance} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="leftover_tolerance"
                value={tolerance}
                checked={preferences.scheduling_rules.leftover_tolerance === tolerance}
                onChange={() =>
                  onChange({
                    ...preferences,
                    scheduling_rules: {
                      ...preferences.scheduling_rules,
                      leftover_tolerance: tolerance,
                    },
                  })
                }
                className="border-gray-300 text-[#f97316] focus:ring-[#f97316]/40"
              />
              <span className="text-sm text-gray-700 capitalize">{tolerance}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

export function DietaryRulesComponent({ preferences, onChange }: PreferenceComponentProps) {
  return (
    <div className="space-y-6">
      {/* Health Conditions */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Health Conditions (helps suggest appropriate recipes)
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {HEALTH_CONDITIONS.map(condition => (
            <label key={condition} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.dietary_rules.health_conditions.includes(condition)}
                onChange={() =>
                  onChange({
                    ...preferences,
                    dietary_rules: {
                      ...preferences.dietary_rules,
                      health_conditions: toggleArrayItem(
                        preferences.dietary_rules.health_conditions,
                        condition
                      ),
                    },
                  })
                }
                className="rounded border-gray-300 text-[#f97316] focus:ring-[#f97316]/40"
              />
              <span className="text-sm text-gray-700">{condition}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Ethical Choices */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Ethical Food Choices</label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            'Organic',
            'Local/Seasonal',
            'Fair Trade',
            'Sustainable Seafood',
            'Grass-fed',
            'Free-range',
          ].map(choice => (
            <label key={choice} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.dietary_rules.ethical_choices.includes(choice)}
                onChange={() =>
                  onChange({
                    ...preferences,
                    dietary_rules: {
                      ...preferences.dietary_rules,
                      ethical_choices: toggleArrayItem(
                        preferences.dietary_rules.ethical_choices,
                        choice
                      ),
                    },
                  })
                }
                className="rounded border-gray-300 text-[#f97316] focus:ring-[#f97316]/40"
              />
              <span className="text-sm text-gray-700">{choice}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Religious Dietary Laws */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Religious Dietary Laws
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {['Kosher', 'Halal', 'Hindu Vegetarian', 'Jain', 'Buddhist Vegetarian'].map(law => (
            <label key={law} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.dietary_rules.religious_dietary_laws.includes(law)}
                onChange={() =>
                  onChange({
                    ...preferences,
                    dietary_rules: {
                      ...preferences.dietary_rules,
                      religious_dietary_laws: toggleArrayItem(
                        preferences.dietary_rules.religious_dietary_laws,
                        law
                      ),
                    },
                  })
                }
                className="rounded border-gray-300 text-[#f97316] focus:ring-[#f97316]/40"
              />
              <span className="text-sm text-gray-700">{law}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
