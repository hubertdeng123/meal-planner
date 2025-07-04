import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ExclamationCircleIcon } from '@heroicons/react/24/outline';
import authService from '../services/auth.service';
import type { UserCreate, UserPreferences, APIError } from '../types';

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
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUserDataSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(2);
  };

  const handlePreferencesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

  const toggleCuisine = (cuisine: string) => {
    const cuisines = preferences.food_preferences.cuisines;
    const updated = cuisines.includes(cuisine)
      ? cuisines.filter(c => c !== cuisine)
      : [...cuisines, cuisine];

    setPreferences({
      ...preferences,
      food_preferences: {
        ...preferences.food_preferences,
        cuisines: updated,
      },
    });
  };

  const toggleDietaryRestriction = (restriction: string) => {
    const restrictions = preferences.dietary_restrictions;
    const updated = restrictions.includes(restriction)
      ? restrictions.filter(r => r !== restriction)
      : [...restrictions, restriction];

    setPreferences({
      ...preferences,
      dietary_restrictions: updated,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {step === 1 ? 'Create your account' : 'Set your preferences'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {step === 1 ? (
              <>
                Or{' '}
                <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
                  sign in to existing account
                </Link>
              </>
            ) : (
              'Tell us about your food preferences'
            )}
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <ExclamationCircleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">{error}</h3>
              </div>
            </div>
          </div>
        )}

        {step === 1 ? (
          <form className="mt-8 space-y-6" onSubmit={handleUserDataSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
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
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Email address"
                />
              </div>
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700">
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
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Username"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
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
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Password"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Continue
              </button>
            </div>
          </form>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handlePreferencesSubmit}>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Favorite Cuisines</h3>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {CUISINES.map(cuisine => (
                    <label key={cuisine} className="inline-flex items-center">
                      <input
                        type="checkbox"
                        checked={preferences.food_preferences.cuisines.includes(cuisine)}
                        onChange={() => toggleCuisine(cuisine)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">{cuisine}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900">Dietary Restrictions</h3>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {DIETARY_RESTRICTIONS.map(restriction => (
                    <label key={restriction} className="inline-flex items-center">
                      <input
                        type="checkbox"
                        checked={preferences.dietary_restrictions.includes(restriction)}
                        onChange={() => toggleDietaryRestriction(restriction)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">{restriction}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating account...' : 'Complete Registration'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
