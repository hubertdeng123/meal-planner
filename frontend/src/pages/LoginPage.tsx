import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import authService from '../services/auth.service';
import { useAuth } from '../hooks/useAuth';
import type { UserLogin, APIError } from '../types';
import { ArrowRightIcon, ExclamationCircleIcon } from '../components/ui/AppIcons';
import { AuthLayout } from '../components/AuthLayout';
import { Spinner } from '../components/ui/PageLoader';

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
      login();
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
    <AuthLayout
      footer={
        <p>
          New here?{' '}
          <Link to="/register" className="link">
            Create an account
          </Link>
        </p>
      }
    >
      <div>
        <h1 className="font-display text-[2.25rem] font-semibold leading-tight text-stone-900">
          Welcome back!
        </h1>
        <p className="mt-2 text-stone-600">Sign in and let's get cooking</p>
      </div>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3.5 animate-shake">
            <ExclamationCircleIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div>
          <label htmlFor="email" className="label">
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
            className="input py-3"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="label">
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
            className="input py-3"
            placeholder="••••••••"
          />
        </div>

        <button type="submit" disabled={loading} className="btn-primary btn-lg w-full">
          {loading ? (
            <>
              <Spinner className="h-4 w-4" />
              Signing in...
            </>
          ) : (
            <>
              Sign in
              <ArrowRightIcon className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      <div className="mt-8 grid grid-cols-3 gap-2 text-center">
        {['Pantry-aware recipes', 'Weekly plans', 'Auto grocery lists'].map(item => (
          <div
            key={item}
            className="rounded-xl border border-stone-200/80 bg-white/70 px-2 py-3 text-xs font-medium text-stone-600"
          >
            {item}
          </div>
        ))}
      </div>
    </AuthLayout>
  );
}
