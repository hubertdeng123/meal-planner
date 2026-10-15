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
    <div className="app-shell flex min-h-screen flex-col justify-center py-12 px-4 sm:px-6 lg:px-10">
      <div className="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        {/* Left Editorial Column */}
        <div className="space-y-8 lg:pr-6">
          <div className="inline-flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#C84B31] text-white shadow-xs">
              <HungryHelperLogo size={26} />
            </div>
            <div>
              <span className="font-display text-xl font-semibold tracking-tight text-[#1C1917]">
                Hungry Helper
              </span>
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#78716C]">
                The Editorial Kitchen Companion
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <span className="badge">Dinner, simplified</span>
            <h1 className="font-display text-4xl sm:text-5xl font-semibold text-[#1C1917] leading-[1.1] tracking-tight">
              Dinner plans, minus the drama.
            </h1>
            <p className="text-base sm:text-lg text-[#57534E] leading-relaxed max-w-lg">
              Thoughtful recipes tailored to your pantry, a calm weekly planner, and a grocery list
              that organizes itself by aisle.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-[#E7E0D6] bg-white p-5 shadow-2xs">
              <div className="flex items-start gap-3.5">
                <div className="icon-container-premium icon-container-orange shrink-0">
                  <CalendarMealIcon size={22} />
                </div>
                <div>
                  <p className="font-display text-base font-semibold text-[#1C1917]">
                    Your weekly rhythm
                  </p>
                  <p className="mt-1 text-sm text-[#57534E] leading-relaxed">
                    Balanced meal schedules that adapt to busy weeknights.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[#E7E0D6] bg-white p-5 shadow-2xs">
              <div className="flex items-start gap-3.5">
                <div className="icon-container-premium icon-container-emerald shrink-0">
                  <GroceryBagIcon size={22} />
                </div>
                <div>
                  <p className="font-display text-base font-semibold text-[#1C1917]">
                    Market-ready lists
                  </p>
                  <p className="mt-1 text-sm text-[#57534E] leading-relaxed">
                    Merged ingredient quantities sorted cleanly by store aisle.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#E7E0D6] bg-[#F3EFE6]/70 p-5">
            <p className="eyebrow mb-3">Inside your kitchen studio</p>
            <div className="grid gap-2.5 sm:grid-cols-3">
              <div className="flex items-center gap-2.5 rounded-xl border border-[#E7E0D6] bg-white px-3 py-2.5">
                <OrangeCheckIcon size={18} />
                <span className="text-xs font-medium text-[#1C1917]">Pantry-first AI recipes</span>
              </div>
              <div className="flex items-center gap-2.5 rounded-xl border border-[#E7E0D6] bg-white px-3 py-2.5">
                <SuccessCheckIcon size={18} />
                <span className="text-xs font-medium text-[#1C1917]">Nutrition snapshots</span>
              </div>
              <div className="flex items-center gap-2.5 rounded-xl border border-[#E7E0D6] bg-white px-3 py-2.5">
                <AmberCheckIcon size={18} />
                <span className="text-xs font-medium text-[#1C1917]">1-click grocery sync</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sign-In Card */}
        <div className="w-full max-w-md mx-auto lg:max-w-none">
          <div className="surface p-8 sm:p-10">
            <div className="text-center space-y-3">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[#C84B31]/20 bg-[#F9F1EA] text-[#C84B31]">
                <HungryHelperLogo size={32} />
              </div>
              <div>
                <h2 className="font-display text-3xl font-semibold text-[#1C1917]">
                  Welcome back!
                </h2>
                <p className="mt-1.5 text-sm text-[#57534E]">Sign in and let's get cooking</p>
              </div>
            </div>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              {error && (
                <div className="rounded-2xl border border-[#B91C1C]/25 bg-[#FEE2E2]/70 p-4">
                  <div className="flex items-start gap-3">
                    <ExclamationCircleIcon className="h-5 w-5 shrink-0 text-[#B91C1C] mt-0.5" />
                    <p className="text-sm font-medium text-[#B91C1C]">{error}</p>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-semibold text-[#1C1917] mb-2"
                  >
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
                    placeholder="you@example.com"
                  />
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-semibold text-[#1C1917] mb-2"
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

              <div className="pt-2 space-y-4">
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

                <div className="border-t border-[#E7E0D6] pt-4 text-center">
                  <p className="text-sm text-[#57534E]">
                    New here?{' '}
                    <Link
                      to="/register"
                      className="font-semibold text-[#C84B31] hover:text-[#B83B22] transition-colors"
                    >
                      Create an account
                    </Link>
                  </p>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
