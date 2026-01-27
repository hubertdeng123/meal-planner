import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ExclamationCircleIcon,
  SparklesIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import authService from '../services/auth.service';
import { useAuth } from '../hooks/useAuth';
import type { UserCreate, UserPreferences, APIError } from '../types';

// Simplified lists - only show the most common/popular options
const TOP_CUISINES = [
  'Italian',
  'Mexican',
  'Chinese',
  'American',
  'Mediterranean',
  'Japanese',
  'Thai',
  'Indian',
];

const COMMON_DIETARY_RESTRICTIONS = [
  'Vegetarian',
  'Vegan',
  'Gluten-Free',
  'Dairy-Free',
  'Nut-Free',
];

const STEP_TITLES = ['Create your account', 'Taste profile', 'Fine-tune it'];

export default function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
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

    // Basic validation
    if (!userData.email || !userData.username || !userData.password) {
      setError('Please fill in all fields');
      return;
    }

    if (userData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setError('');
    setStep(2);
  };

  const handleSkipToRegistration = async () => {
    // Skip preferences and register with just account details
    setError('');
    setLoading(true);

    try {
      await authService.register(userData, preferences);
      await authService.login({ email: userData.email, password: userData.password });
      login();
      navigate('/dashboard');
    } catch (err: unknown) {
      const apiError = err as APIError;
      setError(apiError.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFinalSubmit = async () => {
    setError('');
    setLoading(true);

    try {
      await authService.register(userData, preferences);
      await authService.login({ email: userData.email, password: userData.password });
      login();
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
        <span className="text-sm font-medium text-stone-700">
          Step {step} of {STEP_TITLES.length}
        </span>
        <span className="text-sm text-stone-500">
          {Math.round((step / STEP_TITLES.length) * 100)}% Complete
        </span>
      </div>
      <div className="w-full bg-stone-200 rounded-full h-2">
        <div
          className="h-2 rounded-full transition-all duration-300"
          style={{
            width: `${(step / STEP_TITLES.length) * 100}%`,
            backgroundColor: 'var(--primary)',
          }}
        />
      </div>
      <h2 className="mt-4 text-2xl font-semibold text-stone-900">{STEP_TITLES[step - 1]}</h2>
      {step === 2 && (
        <p className="mt-2 text-sm text-stone-600">Tell us your flavor compass (optional)</p>
      )}
      {step === 3 && (
        <p className="mt-2 text-sm text-stone-600">Optional tweaks for extra finesse</p>
      )}
    </div>
  );

  const renderAccountDetails = () => (
    <form onSubmit={handleUserDataSubmit} className="space-y-6">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email Address
        </label>
        <input
          type="email"
          id="email"
          name="email"
          autoComplete="email"
          required
          value={userData.email}
          onChange={handleUserDataChange}
          className="mt-2 input"
        />
      </div>

      <div>
        <label htmlFor="username" className="block text-sm font-medium text-gray-700">
          Username
        </label>
        <input
          type="text"
          id="username"
          name="username"
          autoComplete="username"
          required
          value={userData.username}
          onChange={handleUserDataChange}
          className="mt-2 input"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Password
        </label>
        <input
          type="password"
          id="password"
          name="password"
          autoComplete="new-password"
          required
          value={userData.password}
          onChange={handleUserDataChange}
          className="mt-2 input"
        />
        <p className="mt-1 text-xs text-gray-500">Minimum 6 characters</p>
      </div>

      <button type="submit" className="w-full btn-primary flex items-center justify-center">
        Continue
        <ChevronRightIcon className="ml-2 h-5 w-5" />
      </button>
    </form>
  );

  const renderBasicPreferences = () => (
    <div className="space-y-8">
      {/* Cuisines */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-3">
          What cuisines make you happy? <span className="text-stone-500">(Pick any)</span>
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {TOP_CUISINES.map(cuisine => {
            const isSelected = preferences.food_preferences.cuisines.includes(cuisine);
            return (
              <label
                key={cuisine}
                className={`
                  relative flex items-center justify-center px-4 py-3 rounded-2xl border-2 cursor-pointer transition-all
                  ${isSelected ? '' : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'}
                `}
                style={
                  isSelected
                    ? {
                        borderColor: 'var(--primary)',
                        backgroundColor: 'var(--primary-soft)',
                        color: 'var(--primary-hover)',
                      }
                    : undefined
                }
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() =>
                    setPreferences(prev => ({
                      ...prev,
                      food_preferences: {
                        ...prev.food_preferences,
                        cuisines: toggleArrayItem(prev.food_preferences.cuisines, cuisine),
                      },
                    }))
                  }
                  className="sr-only"
                />
                {isSelected && (
                  <CheckCircleIcon
                    className="absolute top-2 right-2 h-5 w-5"
                    style={{ color: 'var(--primary)' }}
                  />
                )}
                <span className="text-sm font-medium">{cuisine}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Dietary Restrictions */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-3">
          Any dietary restrictions? <span className="text-stone-500">(Optional)</span>
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {COMMON_DIETARY_RESTRICTIONS.map(restriction => {
            const isSelected = preferences.dietary_restrictions.includes(restriction);
            return (
              <label
                key={restriction}
                className={`
                  relative flex items-center justify-center px-4 py-3 rounded-2xl border-2 cursor-pointer transition-all
                  ${isSelected ? '' : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'}
                `}
                style={
                  isSelected
                    ? {
                        borderColor: 'var(--primary)',
                        backgroundColor: 'var(--primary-soft)',
                        color: 'var(--primary-hover)',
                      }
                    : undefined
                }
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() =>
                    setPreferences(prev => ({
                      ...prev,
                      dietary_restrictions: toggleArrayItem(prev.dietary_restrictions, restriction),
                    }))
                  }
                  className="sr-only"
                />
                {isSelected && (
                  <CheckCircleIcon
                    className="absolute top-2 right-2 h-5 w-5"
                    style={{ color: 'var(--primary)' }}
                  />
                )}
                <span className="text-sm font-medium">{restriction}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        <button
          type="button"
          onClick={() => setStep(1)}
          className="btn-secondary flex items-center justify-center"
        >
          <ChevronLeftIcon className="mr-2 h-5 w-5" />
          Back
        </button>
        <button
          type="button"
          onClick={() => setStep(3)}
          className="flex-1 btn-primary flex items-center justify-center"
        >
          Continue
          <ChevronRightIcon className="ml-2 h-5 w-5" />
        </button>
      </div>

      {/* Skip option */}
      <div className="text-center pt-2">
        <button
          type="button"
          onClick={handleSkipToRegistration}
          disabled={loading}
          className="text-sm underline transition-colors"
          style={{ color: 'var(--primary)' }}
        >
          {loading ? 'Setting things up...' : 'Skip for now, finish later'}
        </button>
      </div>
    </div>
  );

  const renderOptionalPreferences = () => (
    <div className="space-y-6">
      {/* Info box */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
        <div className="flex items-start">
          <SparklesIcon className="h-5 w-5 text-emerald-600 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <p className="text-sm text-emerald-900 font-medium">
              You can customize all preferences later
            </p>
            <p className="text-sm text-emerald-700 mt-1">
              Skip this step and update later in Settings. We'll use easy defaults to get you
              started!
            </p>
          </div>
        </div>
      </div>

      {/* Meal Complexity Preference */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-3">
          How ambitious are you feeling?
        </label>
        <div className="grid grid-cols-3 gap-3">
          {(['simple', 'medium', 'complex'] as const).map(complexity => {
            const isSelected =
              preferences.food_type_rules.meal_complexity_preference === complexity;
            return (
              <label
                key={complexity}
                className={`
                  relative flex flex-col items-center justify-center px-4 py-4 rounded-2xl border-2 cursor-pointer transition-all
                  ${isSelected ? '' : 'border-stone-200 bg-white hover:border-stone-300'}
                `}
                style={
                  isSelected
                    ? { borderColor: 'var(--primary)', backgroundColor: 'var(--primary-soft)' }
                    : undefined
                }
              >
                <input
                  type="radio"
                  name="complexity"
                  checked={isSelected}
                  onChange={() =>
                    setPreferences(prev => ({
                      ...prev,
                      food_type_rules: {
                        ...prev.food_type_rules,
                        meal_complexity_preference: complexity,
                      },
                    }))
                  }
                  className="sr-only"
                />
                <span className="text-sm font-medium capitalize text-stone-900">{complexity}</span>
                <span className="text-xs text-stone-500 mt-1 text-center">
                  {complexity === 'simple' && '15-30 min'}
                  {complexity === 'medium' && '30-60 min'}
                  {complexity === 'complex' && '60+ min'}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-3 pt-4">
        <button
          type="button"
          onClick={handleFinalSubmit}
          disabled={loading}
          className="w-full btn-primary flex items-center justify-center"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
              Setting things up...
            </>
          ) : (
            <>
              Create account
              <ChevronRightIcon className="ml-2 h-5 w-5" />
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => setStep(2)}
          className="btn-secondary flex items-center justify-center"
          disabled={loading}
        >
          <ChevronLeftIcon className="mr-2 h-5 w-5" />
          Back
        </button>

        {/* Prominent Skip Button */}
        <button
          type="button"
          onClick={handleSkipToRegistration}
          disabled={loading}
          className="w-full py-3 px-4 rounded-2xl border-2 border-dashed border-stone-200 text-stone-600 hover:border-stone-300 hover:bg-white transition-all font-medium"
        >
          Skip for now - I'll finish in Settings
        </button>
      </div>
    </div>
  );

  return (
    <div className="app-shell flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/login" className="inline-flex items-center space-x-3 mb-6">
            <div className="h-12 w-12 rounded-lg gradient-primary sticker flex items-center justify-center">
              <SparklesIcon className="h-6 w-6 text-white" />
            </div>
            <h1 className="font-display text-3xl font-semibold text-gray-900">Hungry Helper</h1>
          </Link>
          <p className="text-gray-600">Start your account and line up some tasty wins</p>
        </div>

        {/* Main card */}
        <div className="card-premium panel-glow">
          {renderProgressBar()}

          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 flex items-start">
              <ExclamationCircleIcon className="h-5 w-5 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {step === 1 && renderAccountDetails()}
          {step === 2 && renderBasicPreferences()}
          {step === 3 && renderOptionalPreferences()}
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-stone-600 mt-6">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-semibold transition-colors"
            style={{ color: 'var(--primary)' }}
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
