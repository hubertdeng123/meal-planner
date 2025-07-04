import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarIcon,
  PlusIcon,
  EyeIcon,
  TrashIcon,
  ClockIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import mealPlanningService from '../services/meal-planning.service';
import type { MealPlan } from '../types';

export default function MealPlanHistoryPage() {
  const navigate = useNavigate();
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadMealPlans();
  }, []);

  const loadMealPlans = async () => {
    try {
      setLoading(true);
      const plans = await mealPlanningService.getMealPlans();
      setMealPlans(plans);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load meal plans';
      setError(errorMessage);
      console.error('Failed to load meal plans:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePlan = async (planId: number) => {
    if (!confirm('Are you sure you want to delete this meal plan?')) {
      return;
    }

    try {
      await mealPlanningService.deleteMealPlan(planId);
      setMealPlans(plans => plans.filter(plan => plan.id !== planId));
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete meal plan';
      alert(`Failed to delete meal plan: ${errorMessage}`);
    }
  };

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const formatOptions: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
    };

    const startFormatted = start.toLocaleDateString('en-US', formatOptions);
    const endFormatted = end.toLocaleDateString('en-US', formatOptions);

    return `${startFormatted} - ${endFormatted}, ${start.getFullYear()}`;
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return '1 day ago';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    return `${Math.floor(diffInDays / 30)} months ago`;
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your meal plans...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <div className="text-center">
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-red-800">{error}</p>
          </div>
          <button onClick={loadMealPlans} className="mt-4 btn-secondary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <CalendarIcon className="mx-auto h-12 w-12 text-orange-500" />
        <h1 className="mt-4 text-3xl font-bold text-gray-900">Weekly Meal Plans</h1>
        <p className="mt-2 text-gray-600">View your past meal plans and create new ones</p>
      </div>

      {/* Meal Plans List or Empty State */}
      {mealPlans.length === 0 ? (
        // Enhanced Empty State
        <div className="text-center py-16">
          <div className="mx-auto max-w-md">
            {/* Large Calendar Icon with Background */}
            <div className="mx-auto flex items-center justify-center h-24 w-24 rounded-full bg-orange-100 mb-6">
              <CalendarIcon className="h-12 w-12 text-orange-600" />
            </div>

            {/* Main Message */}
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Start Your Meal Planning Journey
            </h3>
            <p className="text-gray-500 mb-8 leading-relaxed">
              Create your first weekly meal plan to get organized with cooking. We'll help you plan
              delicious meals, generate shopping lists, and make your week stress-free!
            </p>

            {/* Features Preview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 text-sm">
              <div className="flex flex-col items-center p-3 bg-gray-50 rounded-lg">
                <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center mb-2">
                  <span className="text-blue-600 font-semibold text-xs">AI</span>
                </div>
                <span className="text-gray-700 font-medium">AI-Generated Recipes</span>
              </div>
              <div className="flex flex-col items-center p-3 bg-gray-50 rounded-lg">
                <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center mb-2">
                  <CheckCircleIcon className="h-4 w-4 text-green-600" />
                </div>
                <span className="text-gray-700 font-medium">Smart Grocery Lists</span>
              </div>
              <div className="flex flex-col items-center p-3 bg-gray-50 rounded-lg">
                <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center mb-2">
                  <ClockIcon className="h-4 w-4 text-purple-600" />
                </div>
                <span className="text-gray-700 font-medium">Weekly Planning</span>
              </div>
            </div>

            {/* Call to Action */}
            <button
              onClick={() => navigate('/weekly-meal-plan/create')}
              className="btn-primary text-lg px-8 py-3 shadow-lg hover:shadow-xl transition-shadow"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Create Your First Weekly Plan
            </button>

            {/* Subtle Encouragement */}
            <p className="text-xs text-gray-400 mt-4">Takes just a few minutes to set up</p>
          </div>
        </div>
      ) : (
        <>
          {/* Create New Plan Button - Only show when there are existing plans */}
          <div className="mb-8">
            <button
              onClick={() => navigate('/weekly-meal-plan/create')}
              className="w-full sm:w-auto btn-primary flex items-center justify-center"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Create New Weekly Plan
            </button>
          </div>

          {/* Meal Plans List */}
          <div className="space-y-4">
            {mealPlans.map(plan => (
              <div
                key={plan.id}
                className="bg-white shadow-sm rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{plan.name}</h3>

                    <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                      <div className="flex items-center">
                        <CalendarIcon className="h-4 w-4 mr-1" />
                        {formatDateRange(plan.start_date, plan.end_date)}
                      </div>
                      <div className="flex items-center">
                        <ClockIcon className="h-4 w-4 mr-1" />
                        Created {getTimeAgo(plan.created_at)}
                      </div>
                    </div>

                    {/* Plan Status */}
                    <div className="flex items-center space-x-2">
                      <CheckCircleIcon className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-green-700">Plan completed</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => navigate(`/weekly-meal-plan/${plan.id}`)}
                      className="btn-secondary text-sm"
                      title="View Details"
                    >
                      <EyeIcon className="h-4 w-4 mr-1" />
                      View
                    </button>

                    <button
                      onClick={() => handleDeletePlan(plan.id)}
                      className="text-red-600 hover:text-red-800 p-1"
                      title="Delete Plan"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Stats - Only show when there are plans */}
          <div className="mt-8 bg-orange-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-orange-900 mb-2">
              Your Meal Planning Journey
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-orange-600">{mealPlans.length}</div>
                <div className="text-sm text-orange-700">Weeks Planned</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">{mealPlans.length * 7}</div>
                <div className="text-sm text-orange-700">Days Organized</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {mealPlans.length > 0 ? getTimeAgo(mealPlans[0].created_at) : 'Never'}
                </div>
                <div className="text-sm text-orange-700">Last Planned</div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
