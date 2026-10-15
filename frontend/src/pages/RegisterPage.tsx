import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ExclamationCircleIcon,
  SparklesIcon,
  HungryHelperLogo,
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckCircleIcon,
} from '../components/ui/AppIcons';
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

const STEP_META = [
  {
    title: 'Account Details',
    subtitle: 'Set up your personal kitchen credentials',
    shortLabel: 'Account',
  },
  {
    title: 'Taste Profile',
    subtitle: 'Tell us your favorite cuisines and dietary needs (optional)',
    shortLabel: 'Taste Profile',
  },
  {
    title: 'Dietary Rules & Pace',
    subtitle: 'Choose your ideal weeknight cooking rhythm (optional)',
    shortLabel: 'Dietary Rules',
  },
];

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

  const handleSkipToRegistration = async () => {
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

  const renderProgressBar = () => {
    const currentMeta = STEP_META[step - 1];
    return (
      <div className="mb-8 border-b border-[#E7E0D6] pb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#C84B31]">
            Step {step} of {STEP_META.length}
          </span>
          <span className="text-xs font-medium tabular-nums text-[#78716C]">
            {Math.round((step / STEP_META.length) * 100)}% Complete
          </span>
        </div>

        {/* Visual Step Progress Bar */}
        <div className="w-full bg-[#F3EFE6] rounded-full h-2 overflow-hidden">
          <div
            className="h-2 rounded-full bg-[#C84B31] transition-all duration-300"
            style={{
              width: `${(step / STEP_META.length) * 100}%`,
            }}
          />
        </div>

        {/* Step Pill Indicators */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          {STEP_META.map((item, idx) => {
            const stepNumber = idx + 1;
            const isCurrent = step === stepNumber;
            const isDone = step > stepNumber;
            return (
              <div
                key={item.shortLabel}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
                  isCurrent
                    ? 'border-[#C84B31]/40 bg-[#F9F1EA] text-[#1C1917]'
                    : isDone
                      ? 'border-[#3F624D]/30 bg-[#ECF5F0] text-[#2F6F4E]'
                      : 'border-[#E7E0D6] bg-[#FAF7F2] text-[#78716C]'
                }`}
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums ${
                    isCurrent
                      ? 'bg-[#C84B31] text-white'
                      : isDone
                        ? 'bg-[#2F6F4E] text-white'
                        : 'bg-[#E7E0D6] text-[#57534E]'
                  }`}
                >
                  {stepNumber}
                </span>
                <span className="truncate">{item.shortLabel}</span>
              </div>
            );
          })}
        </div>

        <div className="mt-6">
          <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[#1C1917]">
            {currentMeta.title}
          </h2>
          <p className="mt-1.5 text-sm text-[#57534E]">{currentMeta.subtitle}</p>
        </div>
      </div>
    );
  };

  const renderAccountDetails = () => (
    <form onSubmit={handleUserDataSubmit} className="space-y-5">
      <div>
        <label htmlFor="email" className="block text-sm font-semibold text-[#1C1917] mb-2">
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
          placeholder="you@example.com"
          className="input"
        />
      </div>

      <div>
        <label htmlFor="username" className="block text-sm font-semibold text-[#1C1917] mb-2">
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
          placeholder="How should we greet you?"
          className="input"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-semibold text-[#1C1917] mb-2">
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
          placeholder="Create a password"
          className="input"
        />
        <p className="mt-1.5 text-xs text-[#78716C]">Minimum 6 characters</p>
      </div>

      <div className="pt-2">
        <button type="submit" className="w-full btn-primary py-3 text-base">
          Continue to Taste Profile
          <ChevronRightIcon className="ml-1.5 h-5 w-5" />
        </button>
      </div>
    </form>
  );

  const renderBasicPreferences = () => (
    <div className="space-y-7">
      {/* Cuisines */}
      <div>
        <label className="block text-sm font-semibold text-[#1C1917] mb-3">
          What cuisines make you happy?{' '}
          <span className="font-normal text-[#78716C]">(Pick any)</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {TOP_CUISINES.map(cuisine => {
            const isSelected = preferences.food_preferences.cuisines.includes(cuisine);
            return (
              <label
                key={cuisine}
                className={`relative flex min-h-[48px] items-center justify-center rounded-2xl border px-4 py-3 cursor-pointer transition-all duration-150 ${
                  isSelected
                    ? 'border-[#C84B31] bg-[#F9F1EA] text-[#B83B22] shadow-xs'
                    : 'border-[#E7E0D6] bg-white text-[#1C1917] hover:border-[#D6CEC2] hover:bg-[#FAF7F2]'
                }`}
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
                  <CheckCircleIcon className="absolute top-2 right-2 h-4 w-4 text-[#C84B31]" />
                )}
                <span className="text-sm font-semibold">{cuisine}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Dietary Restrictions */}
      <div>
        <label className="block text-sm font-semibold text-[#1C1917] mb-3">
          Any dietary restrictions? <span className="font-normal text-[#78716C]">(Optional)</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {COMMON_DIETARY_RESTRICTIONS.map(restriction => {
            const isSelected = preferences.dietary_restrictions.includes(restriction);
            return (
              <label
                key={restriction}
                className={`relative flex min-h-[48px] items-center justify-center rounded-2xl border px-4 py-3 cursor-pointer transition-all duration-150 ${
                  isSelected
                    ? 'border-[#3F624D] bg-[#ECF5F0] text-[#2F6F4E] shadow-xs'
                    : 'border-[#E7E0D6] bg-white text-[#1C1917] hover:border-[#D6CEC2] hover:bg-[#FAF7F2]'
                }`}
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
                  <CheckCircleIcon className="absolute top-2 right-2 h-4 w-4 text-[#2F6F4E]" />
                )}
                <span className="text-sm font-semibold">{restriction}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <button
          type="button"
          onClick={() => setStep(1)}
          className="btn-secondary flex items-center justify-center py-3"
        >
          <ChevronLeftIcon className="mr-1.5 h-5 w-5" />
          Back
        </button>
        <button
          type="button"
          onClick={() => setStep(3)}
          className="flex-1 btn-primary flex items-center justify-center py-3"
        >
          Continue
          <ChevronRightIcon className="ml-1.5 h-5 w-5" />
        </button>
      </div>

      <div className="text-center pt-1">
        <button
          type="button"
          onClick={handleSkipToRegistration}
          disabled={loading}
          className="text-sm font-semibold text-[#C84B31] hover:text-[#B83B22] underline underline-offset-4 transition-colors"
        >
          {loading ? 'Setting things up...' : 'Skip for now, finish later'}
        </button>
      </div>
    </div>
  );

  const renderOptionalPreferences = () => (
    <div className="space-y-6">
      {/* Info box */}
      <div className="rounded-2xl border border-[#3F624D]/25 bg-[#ECF5F0] p-4">
        <div className="flex items-start gap-3">
          <SparklesIcon className="h-5 w-5 text-[#2F6F4E] mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-[#1C1917]">
              You can customize all preferences anytime
            </p>
            <p className="text-sm text-[#57534E] mt-1">
              Skip this step and fine-tune your full culinary profile in Settings whenever you like.
            </p>
          </div>
        </div>
      </div>

      {/* Meal Complexity Preference */}
      <div>
        <label className="block text-sm font-semibold text-[#1C1917] mb-3">
          How ambitious are you feeling on weeknights?
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(['simple', 'medium', 'complex'] as const).map(complexity => {
            const isSelected =
              preferences.food_type_rules.meal_complexity_preference === complexity;
            return (
              <label
                key={complexity}
                className={`relative flex flex-col items-center justify-center rounded-2xl border px-4 py-4 cursor-pointer transition-all duration-150 ${
                  isSelected
                    ? 'border-[#C84B31] bg-[#F9F1EA] shadow-xs'
                    : 'border-[#E7E0D6] bg-white hover:border-[#D6CEC2] hover:bg-[#FAF7F2]'
                }`}
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
                <span className="text-sm font-semibold capitalize text-[#1C1917]">
                  {complexity}
                </span>
                <span className="text-xs text-[#57534E] mt-1 text-center tabular-nums">
                  {complexity === 'simple' && '15–30 min'}
                  {complexity === 'medium' && '30–60 min'}
                  {complexity === 'complex' && '60+ min'}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-3 pt-3">
        <button
          type="button"
          onClick={handleFinalSubmit}
          disabled={loading}
          className="w-full btn-primary flex items-center justify-center py-3 text-base"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
              Setting things up...
            </>
          ) : (
            <>
              Create account
              <ChevronRightIcon className="ml-1.5 h-5 w-5" />
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => setStep(2)}
          className="btn-secondary flex items-center justify-center py-2.5"
          disabled={loading}
        >
          <ChevronLeftIcon className="mr-1.5 h-5 w-5" />
          Back
        </button>

        <button
          type="button"
          onClick={handleSkipToRegistration}
          disabled={loading}
          className="w-full py-3 px-4 rounded-2xl border border-dashed border-[#D6CEC2] bg-[#FAF7F2] text-sm font-semibold text-[#57534E] hover:border-[#78716C] hover:bg-white hover:text-[#1C1917] transition-all"
        >
          Skip for now — I'll finish in Settings
        </button>
      </div>
    </div>
  );

  return (
    <div className="app-shell flex min-h-screen items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full">
        {/* Editorial Brand Header */}
        <div className="text-center mb-8">
          <Link to="/login" className="inline-flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#C84B31] text-white shadow-xs">
              <HungryHelperLogo size={28} />
            </div>
            <span className="font-display text-3xl font-semibold text-[#1C1917]">
              Hungry Helper
            </span>
          </Link>
          <p className="text-sm sm:text-base text-[#57534E]">
            Your bespoke culinary concierge — set up your kitchen in three quick steps.
          </p>
        </div>

        {/* Main Onboarding Card */}
        <div className="surface p-6 sm:p-10">
          {renderProgressBar()}

          {error && (
            <div className="mb-6 rounded-2xl border border-[#B91C1C]/25 bg-[#FEE2E2]/70 p-4 flex items-start gap-3">
              <ExclamationCircleIcon className="h-5 w-5 text-[#B91C1C] mt-0.5 shrink-0" />
              <p className="text-sm font-medium text-[#B91C1C]">{error}</p>
            </div>
          )}

          {step === 1 && renderAccountDetails()}
          {step === 2 && renderBasicPreferences()}
          {step === 3 && renderOptionalPreferences()}
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-[#57534E] mt-6">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-semibold text-[#C84B31] hover:text-[#B83B22] transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
