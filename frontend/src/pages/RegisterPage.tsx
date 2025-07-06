import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ExclamationCircleIcon,
  SparklesIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import authService from '../services/auth.service';
import type { UserCreate, UserPreferences, APIError, IngredientRules } from '../types';

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

const STEP_TITLES = [
  'Account Details',
  'Basic Preferences',
  'Ingredient Rules',
  'Food & Cooking',
  'Nutrition Goals',
  'Schedule & Habits',
  'Dietary Rules',
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [userData, setUserData] = useState<UserCreate>({
    email: '',
    username: '',
    password: '',
  });

  const [preferences, setPreferences] = useState<UserPreferences>({
    food_preferences: {
      cuisines: [],
      favorite_ingredients: [],
      cooking_methods: [],
    },
    dietary_restrictions: [],
    ingredient_rules: {
      must_include: [],
      must_avoid: [],
      preferred: [],
      disliked: [],
    },
    food_type_rules: {
      protein_preferences: [],
      protein_frequency: {},
      cooking_methods_preferred: [],
      cooking_methods_avoided: [],
      meal_complexity_preference: 'medium',
      cuisine_rotation: {},
    },
    nutritional_rules: {
      special_nutritional_needs: [],
    },
    scheduling_rules: {
      preferred_cooking_days: [],
      batch_cooking_preference: false,
      leftover_tolerance: 'medium',
      meal_prep_style: 'daily',
    },
    dietary_rules: {
      strict_restrictions: [],
      flexible_restrictions: [],
      religious_dietary_laws: [],
      ethical_choices: [],
      health_conditions: [],
      allergy_severity: {},
    },
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUserDataSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(2);
  };

  const handleFinalSubmit = async () => {
    setError('');
    setLoading(true);

    try {
      await authService.register(userData, preferences);
      await authService.login({ email: userData.email, password: userData.password });
      navigate('/dashboard');
    } catch (err: unknown) {
      const apiError = err as APIError;
      setError(apiError.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUserDataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserData({
      ...userData,
      [e.target.name]: e.target.value,
    });
  };

  const toggleArrayItem = (array: string[], item: string) => {
    return array.includes(item) ? array.filter(i => i !== item) : [...array, item];
  };

  const renderProgressBar = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">
          Step {step} of {STEP_TITLES.length}
        </span>
        <span className="text-sm text-gray-500">
          {Math.round((step / STEP_TITLES.length) * 100)}% Complete
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-gradient-to-r from-orange-500 to-pink-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${(step / STEP_TITLES.length) * 100}%` }}
        />
      </div>
      <h2 className="mt-4 text-2xl font-semibold text-gray-900">{STEP_TITLES[step - 1]}</h2>
    </div>
  );

  const renderBasicPreferences = () => (
    <div className="space-y-6">
      {/* Cuisines */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Favorite Cuisines (select all that you enjoy)
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {CUISINES.map(cuisine => (
            <label key={cuisine} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.food_preferences.cuisines.includes(cuisine)}
                onChange={() =>
                  setPreferences(prev => ({
                    ...prev,
                    food_preferences: {
                      ...prev.food_preferences,
                      cuisines: toggleArrayItem(prev.food_preferences.cuisines, cuisine),
                    },
                  }))
                }
                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
              />
              <span className="text-sm text-gray-700">{cuisine}</span>
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
                  setPreferences(prev => ({
                    ...prev,
                    dietary_restrictions: toggleArrayItem(prev.dietary_restrictions, restriction),
                  }))
                }
                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
              />
              <span className="text-sm text-gray-700">{restriction}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  const renderIngredientRules = () => (
    <IngredientRulesEditor
      rules={preferences.ingredient_rules}
      onChange={ingredient_rules => setPreferences(prev => ({ ...prev, ingredient_rules }))}
    />
  );

  const renderFoodAndCooking = () => (
    <div className="space-y-6">
      {/* Protein Preferences */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Preferred Proteins</label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {PROTEINS.map(protein => (
            <label key={protein} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.food_type_rules.protein_preferences.includes(protein)}
                onChange={() =>
                  setPreferences(prev => ({
                    ...prev,
                    food_type_rules: {
                      ...prev.food_type_rules,
                      protein_preferences: toggleArrayItem(
                        prev.food_type_rules.protein_preferences,
                        protein
                      ),
                    },
                  }))
                }
                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
              />
              <span className="text-sm text-gray-700">{protein}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Cooking Methods */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Preferred Cooking Methods
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {COOKING_METHODS.map(method => (
            <label key={method} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.food_type_rules.cooking_methods_preferred.includes(method)}
                onChange={() =>
                  setPreferences(prev => ({
                    ...prev,
                    food_type_rules: {
                      ...prev.food_type_rules,
                      cooking_methods_preferred: toggleArrayItem(
                        prev.food_type_rules.cooking_methods_preferred,
                        method
                      ),
                    },
                  }))
                }
                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
              />
              <span className="text-sm text-gray-700">{method}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Meal Complexity */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Preferred Meal Complexity
        </label>
        <div className="grid grid-cols-3 gap-3">
          {(['simple', 'medium', 'complex'] as const).map(complexity => (
            <label key={complexity} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="meal_complexity"
                value={complexity}
                checked={preferences.food_type_rules.meal_complexity_preference === complexity}
                onChange={() =>
                  setPreferences(prev => ({
                    ...prev,
                    food_type_rules: {
                      ...prev.food_type_rules,
                      meal_complexity_preference: complexity,
                    },
                  }))
                }
                className="border-gray-300 text-orange-600 focus:ring-orange-500"
              />
              <span className="text-sm text-gray-700 capitalize">{complexity}</span>
            </label>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Simple: Basic recipes with few ingredients. Medium: Balanced complexity. Complex: Advanced
          techniques and more ingredients.
        </p>
      </div>
    </div>
  );

  const renderNutritionGoals = () => (
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
            setPreferences(prev => ({
              ...prev,
              nutritional_rules: {
                ...prev.nutritional_rules,
                daily_calorie_target: e.target.value ? parseInt(e.target.value) : undefined,
              },
            }))
          }
          className="input w-full"
        />
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
                  setPreferences(prev => ({
                    ...prev,
                    nutritional_rules: {
                      ...prev.nutritional_rules,
                      special_nutritional_needs: toggleArrayItem(
                        prev.nutritional_rules.special_nutritional_needs,
                        need
                      ),
                    },
                  }))
                }
                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
              />
              <span className="text-sm text-gray-700">{need}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Sodium Limit */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Maximum Sodium per Day (mg, optional)
        </label>
        <input
          type="number"
          placeholder="e.g., 2300"
          value={preferences.nutritional_rules.max_sodium_mg || ''}
          onChange={e =>
            setPreferences(prev => ({
              ...prev,
              nutritional_rules: {
                ...prev.nutritional_rules,
                max_sodium_mg: e.target.value ? parseInt(e.target.value) : undefined,
              },
            }))
          }
          className="input w-full"
        />
      </div>
    </div>
  );

  const renderSchedulingRules = () => (
    <div className="space-y-6">
      {/* Preferred Cooking Days */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Preferred Cooking Days
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(
            day => (
              <label key={day} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.scheduling_rules.preferred_cooking_days.includes(day)}
                  onChange={() =>
                    setPreferences(prev => ({
                      ...prev,
                      scheduling_rules: {
                        ...prev.scheduling_rules,
                        preferred_cooking_days: toggleArrayItem(
                          prev.scheduling_rules.preferred_cooking_days,
                          day
                        ),
                      },
                    }))
                  }
                  className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
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
              setPreferences(prev => ({
                ...prev,
                scheduling_rules: {
                  ...prev.scheduling_rules,
                  max_prep_time_weekdays: e.target.value ? parseInt(e.target.value) : undefined,
                },
              }))
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
              setPreferences(prev => ({
                ...prev,
                scheduling_rules: {
                  ...prev.scheduling_rules,
                  max_prep_time_weekends: e.target.value ? parseInt(e.target.value) : undefined,
                },
              }))
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
              setPreferences(prev => ({
                ...prev,
                scheduling_rules: {
                  ...prev.scheduling_rules,
                  batch_cooking_preference: e.target.checked,
                },
              }))
            }
            className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
          />
          <span className="text-sm font-medium text-gray-700">
            I prefer batch cooking (cooking larger quantities at once)
          </span>
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
                  setPreferences(prev => ({
                    ...prev,
                    scheduling_rules: {
                      ...prev.scheduling_rules,
                      leftover_tolerance: tolerance,
                    },
                  }))
                }
                className="border-gray-300 text-orange-600 focus:ring-orange-500"
              />
              <span className="text-sm text-gray-700 capitalize">{tolerance}</span>
            </label>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Low: Prefer fresh meals. Medium: Okay with 1-2 day leftovers. High: Happy with meal prep
          and longer storage.
        </p>
      </div>
    </div>
  );

  const renderDietaryRules = () => (
    <div className="space-y-6">
      {/* Health Conditions */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Health Conditions (helps us suggest appropriate recipes)
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {HEALTH_CONDITIONS.map(condition => (
            <label key={condition} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.dietary_rules.health_conditions.includes(condition)}
                onChange={() =>
                  setPreferences(prev => ({
                    ...prev,
                    dietary_rules: {
                      ...prev.dietary_rules,
                      health_conditions: toggleArrayItem(
                        prev.dietary_rules.health_conditions,
                        condition
                      ),
                    },
                  }))
                }
                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
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
                  setPreferences(prev => ({
                    ...prev,
                    dietary_rules: {
                      ...prev.dietary_rules,
                      ethical_choices: toggleArrayItem(prev.dietary_rules.ethical_choices, choice),
                    },
                  }))
                }
                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
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
                  setPreferences(prev => ({
                    ...prev,
                    dietary_rules: {
                      ...prev.dietary_rules,
                      religious_dietary_laws: toggleArrayItem(
                        prev.dietary_rules.religious_dietary_laws,
                        law
                      ),
                    },
                  }))
                }
                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
              />
              <span className="text-sm text-gray-700">{law}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <form onSubmit={handleUserDataSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={userData.email}
                onChange={handleUserDataChange}
                className="input"
                placeholder="Enter your email"
              />
            </div>
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                value={userData.username}
                onChange={handleUserDataChange}
                className="input"
                placeholder="Choose a username"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={userData.password}
                onChange={handleUserDataChange}
                className="input"
                placeholder="Create a secure password"
              />
            </div>
          </form>
        );
      case 2:
        return renderBasicPreferences();
      case 3:
        return renderIngredientRules();
      case 4:
        return renderFoodAndCooking();
      case 5:
        return renderNutritionGoals();
      case 6:
        return renderSchedulingRules();
      case 7:
        return renderDietaryRules();
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full space-y-8">
        {/* Logo and Header */}
        <div className="text-center space-y-6">
          <div className="mx-auto w-16 h-16 gradient-primary rounded-2xl flex items-center justify-center">
            <SparklesIcon className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">Join Hungry Helper</h1>
            <p className="mt-2 text-gray-600">
              {step === 1
                ? 'Create your account to get started'
                : 'Tell us about your preferences for personalized recipes'}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        {step > 1 && renderProgressBar()}

        {/* Error Message */}
        {error && (
          <div className="rounded-lg bg-red-50 p-4 ring-1 ring-red-200">
            <div className="flex">
              <div className="flex-shrink-0">
                <ExclamationCircleIcon className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="card p-8 max-h-[70vh] overflow-y-auto">{renderStepContent()}</div>

        {/* Navigation */}
        <div className="flex justify-between">
          {step > 1 ? (
            <button onClick={() => setStep(step - 1)} className="btn-secondary flex items-center">
              <ChevronLeftIcon className="h-4 w-4 mr-1" />
              Back
            </button>
          ) : (
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link
                  to="/login"
                  className="font-medium text-orange-500 hover:text-orange-600 transition-colors duration-200"
                >
                  Sign in
                </Link>
              </p>
            </div>
          )}

          {step < STEP_TITLES.length ? (
            <button
              onClick={() => {
                if (step === 1) {
                  // Validate form first
                  const form = document.querySelector('form');
                  if (form?.reportValidity()) {
                    setStep(step + 1);
                  }
                } else {
                  setStep(step + 1);
                }
              }}
              className="btn-primary flex items-center"
            >
              Next
              <ChevronRightIcon className="h-4 w-4 ml-1" />
            </button>
          ) : (
            <button
              onClick={handleFinalSubmit}
              disabled={loading}
              className="btn-primary flex items-center px-8"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Creating Account...
                </>
              ) : (
                'Complete Registration'
              )}
            </button>
          )}
        </div>

        {/* Skip Option */}
        {step > 2 && step < STEP_TITLES.length && (
          <div className="text-center">
            <button
              onClick={() => setStep(STEP_TITLES.length)}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Skip remaining steps (you can set these later)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function IngredientRulesEditor({
  rules,
  onChange,
}: {
  rules: IngredientRules;
  onChange: (rules: IngredientRules) => void;
}) {
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
      ...rules,
      [category]: [
        ...rules[category],
        {
          ingredient: ingredient.trim(),
          reason: reason.trim() || 'Personal preference',
        },
      ],
    });
  };

  const removeIngredientRule = (category: keyof IngredientRules, index: number) => {
    onChange({
      ...rules,
      [category]: rules[category].filter((_, i) => i !== index),
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
                ? 'bg-orange-100 text-orange-800 border-2 border-orange-300'
                : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
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
          {(rules?.[activeCategory] || []).map((item, index) => (
            <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
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
          {(rules?.[activeCategory] || []).length === 0 && (
            <p className="text-gray-500 text-sm italic">No ingredients added yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
