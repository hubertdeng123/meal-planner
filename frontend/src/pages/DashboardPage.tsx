import { Link } from 'react-router-dom';
import {
  SparklesIcon,
  BookOpenIcon,
  ChartBarIcon,
  CalendarIcon,
  HeartIcon,
  ArrowRightIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-semibold text-gray-900 tracking-tight">
          Welcome to Your
          <span className="text-orange-500"> Meal Assistant</span>
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Plan delicious meals, track nutrition, and let AI create personalized recipes tailored to
          your taste and dietary needs.
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
                Let AI create personalized recipes based on your preferences, ingredients, and
                dietary requirements.
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

        <Link to="/meal-planning" className="group card card-hover p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-purple-100 rounded-xl group-hover:bg-purple-200 transition-colors duration-200">
                <CalendarDaysIcon className="h-6 w-6 text-purple-500" />
              </div>
              <ArrowRightIcon className="h-5 w-5 text-gray-400 group-hover:text-purple-500 group-hover:translate-x-1 transition-all duration-200" />
            </div>
            <div className="mt-4">
              <h3 className="text-lg font-semibold text-gray-900 group-hover:text-purple-500 transition-colors duration-200">
                Weekly Meal Planner
              </h3>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                Plan your weekly meals, balance nutrition, and organize your cooking schedule.
              </p>
            </div>
          </div>
        </Link>
      </div>

      {/* Secondary Actions */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-1">
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
          <button className="btn-secondary text-sm">View Details</button>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-orange-100 rounded-lg">
                <ChartBarIcon className="h-5 w-5 text-orange-500" />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Recipes</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">0</p>
              <p className="text-xs text-gray-500 mt-1">Start creating recipes</p>
            </div>
          </div>

          <div className="card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CalendarIcon className="h-5 w-5 text-blue-500" />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">This Week's Meals</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">0</p>
              <p className="text-xs text-gray-500 mt-1">Plan your week</p>
            </div>
          </div>

          <div className="card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-pink-100 rounded-lg">
                <HeartIcon className="h-5 w-5 text-pink-600" />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Favorite Cuisine</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">-</p>
              <p className="text-xs text-gray-500 mt-1">Cook more to see trends</p>
            </div>
          </div>

          <div className="card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-green-100 rounded-lg">
                <SparklesIcon className="h-5 w-5 text-green-600" />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">AI Suggestions</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">3</p>
              <p className="text-xs text-gray-500 mt-1">New recipes ready</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
