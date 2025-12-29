import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  SparklesIcon,
  BookOpenIcon,
  ChartBarIcon,
  HeartIcon,
  ArrowRightIcon,
  FireIcon,
} from '@heroicons/react/24/outline';
import recipeService from '../services/recipe.service';
import type { Recipe } from '../types';

export default function DashboardPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecipes();
  }, []);

  const loadRecipes = async () => {
    try {
      const data = await recipeService.getRecipes(0, 100); // Get up to 100 recipes for stats
      setRecipes(data);
    } catch (error) {
      console.error('Failed to load recipes:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats from recipes
  const totalRecipes = recipes.length;

  // Find favorite cuisine from tags
  const cuisineCounts = recipes.reduce(
    (acc, recipe) => {
      recipe.tags.forEach(tag => {
        acc[tag] = (acc[tag] || 0) + 1;
      });
      return acc;
    },
    {} as Record<string, number>
  );

  const favoriteCuisine = Object.entries(cuisineCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';

  // Calculate average cook time
  const avgCookTime =
    recipes.length > 0
      ? Math.round(
          recipes.reduce(
            (sum, r) => sum + (r.prep_time_minutes || 0) + (r.cook_time_minutes || 0),
            0
          ) / recipes.length
        )
      : 0;

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-semibold text-gray-900 tracking-tight">
          Welcome to Your
          <span className="text-orange-500"> Hungry Helper</span>
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Create personalized recipes tailored to your taste and dietary needs with AI-powered
          assistance.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Link to="/generate" className="group card card-hover p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-orange-100 rounded-xl group-hover:bg-orange-200 transition-colors duration-200">
                <SparklesIcon className="h-6 w-6 text-orange-500" />
              </div>
              <ArrowRightIcon className="h-5 w-5 text-gray-400 group-hover:text-orange-500 group-hover:translate-x-1 transition-all duration-200" />
            </div>
            <div className="mt-4">
              <h3 className="text-lg font-semibold text-gray-900 group-hover:text-orange-500 transition-colors duration-200">
                Generate New Recipe
              </h3>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                Let Hungry Helper create personalized recipes based on your preferences,
                ingredients, and dietary requirements.
              </p>
            </div>
          </div>
        </Link>

        <Link to="/recipes" className="group card card-hover p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-blue-100 rounded-xl group-hover:bg-blue-200 transition-colors duration-200">
                <BookOpenIcon className="h-6 w-6 text-blue-500" />
              </div>
              <ArrowRightIcon className="h-5 w-5 text-gray-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all duration-200" />
            </div>
            <div className="mt-4">
              <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-500 transition-colors duration-200">
                My Recipes
              </h3>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                Browse your saved recipes, rate your favorites, and find inspiration for your next
                meal.
              </p>
            </div>
          </div>
        </Link>
      </div>

      {/* Stats Dashboard */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-gray-900">Your Kitchen Dashboard</h2>
          <Link to="/recipes" className="btn-secondary text-sm">
            View All Recipes
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <ChartBarIcon className="h-5 w-5 text-orange-500" />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Recipes</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">{totalRecipes}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {totalRecipes === 0
                    ? 'Start creating recipes'
                    : `${totalRecipes} recipe${totalRecipes === 1 ? '' : 's'} saved`}
                </p>
              </div>
            </div>

            <div className="card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-pink-100 rounded-lg">
                  <HeartIcon className="h-5 w-5 text-pink-600" />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Most Popular Tag</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900 capitalize">
                  {favoriteCuisine}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {totalRecipes === 0
                    ? 'Cook more to see trends'
                    : `Appears in ${cuisineCounts[favoriteCuisine] || 0} recipe${cuisineCounts[favoriteCuisine] === 1 ? '' : 's'}`}
                </p>
              </div>
            </div>

            <div className="card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FireIcon className="h-5 w-5 text-blue-600" />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Avg. Cook Time</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {avgCookTime > 0 ? `${avgCookTime}m` : '-'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {totalRecipes === 0 ? 'No data yet' : 'Prep + cook time'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
