import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExclamationCircleIcon,
  SparklesIcon,
} from '../components/ui/AppIcons';
import { AuthLayout } from '../components/AuthLayout';
import { Spinner } from '../components/ui/PageLoader';
import authService from '../services/auth.service';
import { useAuth } from '../hooks/useAuth';
import type { UserCreate, UserPreferences, APIError } from '../types';

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
const STEP_SUBTITLES = [
  'It takes less than a minute.',
  'Tell us your flavor compass (optional).',
  'Optional tweaks for extra finesse.',
];

const COMPLEXITY_OPTIONS = [
  { value: 'simple', label: 'Simple', hint: '15-30 min' },
  { value: 'medium', label: 'Medium', hint: '30-60 min' },
  { value: 'complex', label: 'Ambitious', hint: '60+ min' },
] as const;

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

  const completeRegistration = async () => {
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

  const renderStepper = () => (
    <ol className="mb-8 flex items-center gap-2" aria-label="Sign-up progress">
      {STEP_TITLES.map((title, index) => {
        const number = index + 1;
        const isDone = number < step;
        const isCurrent = number === step;
        return (
          <li key={title} className="flex flex-1 items-center gap-2">
            <span
              className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                isDone
                  ? 'bg-primary text-white'
                  : isCurrent
                    ? 'bg-stone-900 text-white'
                    : 'bg-stone-200 text-stone-500'
              }`}
              aria-current={isCurrent ? 'step' : undefined}
            >
              {isDone ? <CheckIcon className="h-3.5 w-3.5" /> : number}
            </span>
            {index < STEP_TITLES.length - 1 && (
              <span
                className={`h-px flex-1 transition-colors ${isDone ? 'bg-primary' : 'bg-stone-200'}`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );

  const chipClass = (selected: boolean) =>
    `relative flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all ${
      selected
        ? 'border-primary bg-primary-soft text-primary-ink'
        : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'
    }`;

  const renderAccountDetails = () => (
    <form onSubmit={handleUserDataSubmit} className="space-y-5">
      <div>
        <label htmlFor="email" className="label">
          Email address
        </label>
        <input
          type="email"
          id="email"
          name="email"
          autoComplete="email"
          required
          value={userData.email}
          onChange={handleUserDataChange}
          className="input py-3"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label htmlFor="username" className="label">
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
          className="input py-3"
          placeholder="homecook"
        />
      </div>

      <div>
        <label htmlFor="password" className="label">
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
          className="input py-3"
        />
        <p className="helper-text">Minimum 6 characters</p>
      </div>

      <button type="submit" className="btn-primary btn-lg w-full">
        Continue
        <ChevronRightIcon className="h-4 w-4" />
      </button>
    </form>
  );

  const renderBasicPreferences = () => (
    <div className="space-y-7">
      <fieldset>
        <legend className="label">
          What cuisines make you happy? <span className="font-normal text-stone-500">Pick any</span>
        </legend>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {TOP_CUISINES.map(cuisine => {
            const isSelected = preferences.food_preferences.cuisines.includes(cuisine);
            return (
              <label key={cuisine} className={chipClass(isSelected)}>
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
                {isSelected && <CheckIcon className="h-3.5 w-3.5" />}
                {cuisine}
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="label">
          Any dietary restrictions? <span className="font-normal text-stone-500">Optional</span>
        </legend>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {COMMON_DIETARY_RESTRICTIONS.map(restriction => {
            const isSelected = preferences.dietary_restrictions.includes(restriction);
            return (
              <label key={restriction} className={chipClass(isSelected)}>
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
                {isSelected && <CheckIcon className="h-3.5 w-3.5" />}
                {restriction}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={() => setStep(1)} className="btn-secondary btn-lg">
          <ChevronLeftIcon className="h-4 w-4" />
          Back
        </button>
        <button type="button" onClick={() => setStep(3)} className="btn-primary btn-lg flex-1">
          Continue
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      </div>

      <div className="text-center">
        <button
          type="button"
          onClick={completeRegistration}
          disabled={loading}
          className="text-sm font-medium text-stone-500 underline-offset-4 hover:text-stone-800 hover:underline"
        >
          {loading ? 'Setting things up...' : 'Skip for now, finish later'}
        </button>
      </div>
    </div>
  );

  const renderOptionalPreferences = () => (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-xl border border-primary/15 bg-primary-soft p-4">
        <SparklesIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
        <div>
          <p className="text-sm font-semibold text-primary-ink">
            You can customize everything later
          </p>
          <p className="mt-0.5 text-sm text-primary-ink opacity-80">
            We'll start with easy defaults. Fine-tune ingredients, nutrition, and schedule in
            Settings.
          </p>
        </div>
      </div>

      <fieldset>
        <legend className="label">How ambitious are you feeling?</legend>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {COMPLEXITY_OPTIONS.map(option => {
            const isSelected =
              preferences.food_type_rules.meal_complexity_preference === option.value;
            return (
              <label key={option.value} className={`${chipClass(isSelected)} flex-col py-3.5`}>
                <input
                  type="radio"
                  name="complexity"
                  checked={isSelected}
                  onChange={() =>
                    setPreferences(prev => ({
                      ...prev,
                      food_type_rules: {
                        ...prev.food_type_rules,
                        meal_complexity_preference: option.value,
                      },
                    }))
                  }
                  className="sr-only"
                />
                <span className="font-semibold">{option.label}</span>
                <span className="text-xs font-normal opacity-70">{option.hint}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => setStep(2)}
          className="btn-secondary btn-lg"
          disabled={loading}
        >
          <ChevronLeftIcon className="h-4 w-4" />
          Back
        </button>
        <button
          type="button"
          onClick={completeRegistration}
          disabled={loading}
          className="btn-primary btn-lg flex-1"
        >
          {loading ? (
            <>
              <Spinner className="h-4 w-4" />
              Setting things up...
            </>
          ) : (
            <>
              Create account
              <ChevronRightIcon className="h-4 w-4" />
            </>
          )}
        </button>
      </div>

      <button
        type="button"
        onClick={completeRegistration}
        disabled={loading}
        className="w-full rounded-xl border border-dashed border-stone-300 px-4 py-3 text-sm font-medium text-stone-600 transition-colors hover:border-stone-400 hover:bg-white"
      >
        Skip for now - I'll finish in Settings
      </button>
    </div>
  );

  return (
    <AuthLayout
      footer={
        <p>
          Already have an account?{' '}
          <Link to="/login" className="link">
            Sign in
          </Link>
        </p>
      }
    >
      {renderStepper()}

      <div className="mb-7">
        <p className="eyebrow mb-2">
          Step {step} of {STEP_TITLES.length}
        </p>
        <h1 className="font-display text-[2rem] font-semibold leading-tight text-stone-900">
          {STEP_TITLES[step - 1]}
        </h1>
        <p className="mt-1.5 text-stone-600">{STEP_SUBTITLES[step - 1]}</p>
      </div>

      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3.5 animate-shake">
          <ExclamationCircleIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div key={step} className="animate-slide-in-right">
        {step === 1 && renderAccountDetails()}
        {step === 2 && renderBasicPreferences()}
        {step === 3 && renderOptionalPreferences()}
      </div>
    </AuthLayout>
  );
}
