import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ClockIcon, UserGroupIcon, TrashIcon } from '@heroicons/react/24/outline';
import recipeService from '../services/recipe.service';
import type { Recipe } from '../types';

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadRecipes();
  }, []);

  const loadRecipes = async () => {
    try {
      const data = await recipeService.getRecipes();
      setRecipes(data);
    } catch (error) {
      console.error('Failed to load recipes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (recipeId: number, event: React.MouseEvent) => {
    // Prevent the link navigation
    event.preventDefault();
    event.stopPropagation();

    setDeletingIds(prev => new Set(prev).add(recipeId));

    try {
      await recipeService.deleteRecipe(recipeId);
      setRecipes(prev => prev.filter(recipe => recipe.id !== recipeId));
    } catch (error) {
      console.error('Failed to delete recipe:', error);
      alert('Failed to delete recipe. Please try again.');
    } finally {
      setDeletingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(recipeId);
        return newSet;
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div
          className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"
          data-testid="loading-spinner"
        ></div>
      </div>
    );
  }

  if (recipes.length === 0) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold text-gray-900">No recipes yet</h2>
        <p className="mt-2 text-gray-600">Start by generating your first recipe!</p>
        <Link
          to="/generate"
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
        >
          Generate Recipe
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">My Recipes</h1>
          <p className="mt-2 text-sm text-gray-700">Browse and manage your saved recipes</p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <Link
            to="/generate"
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
          >
            Generate New Recipe
          </Link>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {recipes.map(recipe => (
          <div
            key={recipe.id}
            className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden relative"
          >
            {/* Delete Button */}
            <button
              onClick={e => handleDelete(recipe.id, e)}
              disabled={deletingIds.has(recipe.id)}
              className="absolute top-3 right-3 z-10 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200 disabled:opacity-50"
              title="Delete recipe"
            >
              {deletingIds.has(recipe.id) ? (
                <div className="animate-spin h-4 w-4 border-2 border-red-600 border-t-transparent rounded-full"></div>
              ) : (
                <TrashIcon className="h-4 w-4" />
              )}
            </button>

            {/* Clickable Content */}
            <Link to={`/recipes/${recipe.id}`} className="group block p-6 pr-12">
              <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600">
                {recipe.name}
              </h3>
              <p className="mt-2 text-sm text-gray-600 line-clamp-2">{recipe.description}</p>
              <div className="mt-4 flex items-center text-sm text-gray-500 space-x-4">
                <div className="flex items-center">
                  <ClockIcon className="h-4 w-4 mr-1" />
                  {(recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0)} min
                </div>
                <div className="flex items-center">
                  <UserGroupIcon className="h-4 w-4 mr-1" />
                  {recipe.servings} servings
                </div>
              </div>
              <div className="mt-3">
                {recipe.source_urls && recipe.source_urls.length > 0 && (
                  <div className="flex items-center text-xs text-blue-600 mb-2">
                    <svg
                      className="h-3 w-3 mr-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                      />
                    </svg>
                    <span>
                      {recipe.source_urls.length === 1
                        ? 'Web-inspired recipe'
                        : `Inspired by ${recipe.source_urls.length} sources`}
                    </span>
                  </div>
                )}
                {recipe.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {recipe.tags.slice(0, 3).map(tag => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
