import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ExclamationCircleIcon, SparklesIcon } from '@heroicons/react/24/outline';
import authService from '../services/auth.service';
import { useAuth } from '../hooks/useAuth';
import type { UserLogin, APIError } from '../types';

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
      setError(apiError.response?.data?.detail || 'Login failed. Please try again.');
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
    <div className="min-h-screen gradient-bg flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Logo and Header */}
        <div className="text-center space-y-6">
          <div className="mx-auto w-16 h-16 gradient-primary rounded-2xl flex items-center justify-center">
            <SparklesIcon className="h-8 w-8 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-semibold text-gray-900">Welcome back</h2>
            <p className="mt-2 text-gray-600">Sign in to your Meal Assistant account</p>
          </div>
        </div>

        {/* Login Form */}
        <form className="space-y-6" onSubmit={handleSubmit}>
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

          <div className="space-y-4">
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
                value={formData.email}
                onChange={handleChange}
                className="input"
                placeholder="Enter your email"
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
            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
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
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
                <Link
                  to="/register"
                  className="font-medium text-orange-500 hover:text-orange-600 transition-colors duration-200"
                >
                  Create one now
                </Link>
              </p>
            </div>
          </div>
        </form>

        {/* Features Preview */}
        <div className="mt-8 card p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 text-center">
            What you'll get with Meal Assistant
          </h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-orange-500 rounded-full" />
              <p className="text-sm text-gray-600">Personalized AI-generated recipes</p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
              <p className="text-sm text-gray-600">Smart nutrition tracking</p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <p className="text-sm text-gray-600">Automated grocery lists</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
