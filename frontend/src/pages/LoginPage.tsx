import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import authService from '../services/auth.service';
import { useAuth } from '../hooks/useAuth';
import type { UserLogin, APIError } from '../types';
import {
  ExclamationCircleIcon,
  HungryHelperLogo,
  CalendarMealIcon,
  GroceryBagIcon,
  SuccessCheckIcon,
  OrangeCheckIcon,
  AmberCheckIcon,
} from '../components/ui/AppIcons';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState<UserLogin>({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await authService.login(formData);
      login(); // Update the auth context state
      navigate('/dashboard');
    } catch (err: unknown) {
      const apiError = err as APIError;
      setError(apiError.response?.data?.detail || "Couldn't sign you in. Try again?");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="app-shell relative overflow-hidden py-12 px-4 sm:px-6 lg:px-10">
      <div
        className="pointer-events-none absolute -top-16 -left-24 h-72 w-72 rounded-full blur-3xl"
        style={{ backgroundColor: 'var(--primary-soft)' }}
      />
      <div className="pointer-events-none absolute top-20 right-10 h-64 w-64 rounded-full bg-emerald-200/40 blur-3xl" />
      <div className="pointer-events-none absolute bottom-8 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-amber-200/40 blur-3xl" />

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-10 lg:flex-row lg:items-center">
        <div className="flex-1 space-y-6 lg:pr-6">
          <span className="badge">Dinner, but easy</span>
          <div className="space-y-5 animate-slide-in-up-subtle">
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-stone-900 leading-[1.1] tracking-tight">
              Dinner plans, minus the drama.
            </h1>
            <p className="text-base sm:text-lg text-stone-500 leading-relaxed max-w-md">
              A few taps, a solid plan, and a grocery list that behaves. That's the whole vibe.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div
              className="card p-5 soft-hover animate-slide-in-up-subtle"
              style={{ animationDelay: '100ms' }}
            >
              <div className="flex items-start gap-4">
                <div className="icon-container-premium icon-container-orange flex-shrink-0">
                  <CalendarMealIcon size={24} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-stone-900 mb-1">Your weekly groove</p>
                  <p className="text-sm text-stone-600 leading-relaxed">
                    Gentle nudges so dinner decisions stay chill.
                  </p>
                </div>
              </div>
            </div>
            <div
              className="card p-5 soft-hover animate-slide-in-up-subtle"
              style={{ animationDelay: '200ms' }}
            >
              <div className="flex items-start gap-4">
                <div className="icon-container-premium icon-container-emerald flex-shrink-0">
                  <GroceryBagIcon size={24} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-stone-900 mb-1">Grocery ready</p>
                  <p className="text-sm text-stone-600 leading-relaxed">
                    Lists that know what you need and skip the chaos.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="chip">15-min meal mode</span>
            <span className="chip">Auto grocery lists</span>
            <span className="chip">Nutrition nudges</span>
          </div>
        </div>

        <div className="w-full max-w-md">
          <div className="glass-panel panel-glow p-8 lg:p-10 animate-slide-in-up-subtle">
            {/* Logo and Header */}
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 gradient-primary rounded-2xl flex items-center justify-center shadow-lg">
                <HungryHelperLogo size={40} />
              </div>
              <div>
                <h2 className="font-display text-3xl font-semibold text-stone-900">
                  Welcome back!
                </h2>
                <p className="mt-2 text-stone-500">Sign in and let's get cooking</p>
              </div>
            </div>

            {/* Login Form */}
            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="rounded-2xl bg-red-50 p-4 ring-1 ring-red-200">
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

              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-stone-700 mb-2">
                    Email address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="input"
                    placeholder="Enter your email"
                  />
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-stone-700 mb-2"
                  >
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="input"
                    placeholder="Enter your password"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full py-3 text-base"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Signing in...
                    </div>
                  ) : (
                    'Sign in'
                  )}
                </button>

                <div className="text-center">
                  <p className="text-sm text-stone-600">
                    New here?{' '}
                    <Link
                      to="/register"
                      className="font-semibold transition-colors duration-200"
                      style={{ color: 'var(--primary)' }}
                      onMouseOver={e => (e.currentTarget.style.color = 'var(--primary-hover)')}
                      onMouseOut={e => (e.currentTarget.style.color = 'var(--primary)')}
                    >
                      Create an account
                    </Link>
                  </p>
                </div>
              </div>
            </form>
          </div>

          {/* Features Preview */}
          <div className="mt-6 card p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-500 text-center mb-4">
              What's waiting inside
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-2.5 rounded-xl transition-colors hover:bg-stone-50">
                <div className="flex-shrink-0">
                  <OrangeCheckIcon size={24} />
                </div>
                <p className="text-sm text-stone-700">Recipes that fit your pantry and mood</p>
              </div>
              <div className="flex items-center gap-3 p-2.5 rounded-xl transition-colors hover:bg-stone-50">
                <div className="flex-shrink-0">
                  <SuccessCheckIcon size={24} />
                </div>
                <p className="text-sm text-stone-700">Friendly nutrition snapshots</p>
              </div>
              <div className="flex items-center gap-3 p-2.5 rounded-xl transition-colors hover:bg-stone-50">
                <div className="flex-shrink-0">
                  <AmberCheckIcon size={24} />
                </div>
                <p className="text-sm text-stone-700">Grocery lists that build themselves</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
