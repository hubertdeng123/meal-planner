import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ClockIcon, UserGroupIcon, TrashIcon } from '@heroicons/react/24/outline';
import recipeService from '../services/recipe.service';
import type { Recipe } from '../types';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';

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
      alert('Could not delete that recipe. Try again?');
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
          className="animate-spin rounded-full h-12 w-12 border-b-2"
          style={{ borderBottomColor: 'var(--primary)' }}
          data-testid="loading-spinner"
        ></div>
      </div>
    );
  }

  if (recipes.length === 0) {
    return (
      <EmptyState
        title="No recipes yet...yet"
        description="Kick things off with your first recipe."
        action={
          <Link to="/generate" className="btn-primary">
            Make a recipe
          </Link>
        }
      />
    );
  }

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <PageHeader title="Recipe Vault" subtitle="Browse and manage your saved recipes" />
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <Link to="/generate" className="btn-primary">
            New recipe, please
          </Link>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {recipes.map((recipe, index) => (
          <div
            key={recipe.id}
            className="card card-hover overflow-hidden relative opacity-0 animate-slide-in-up"
            style={{ animationDelay: `${index * 75}ms`, animationFillMode: 'forwards' }}
          >
            {/* Delete Button */}
            <button
              onClick={e => handleDelete(recipe.id, e)}
              disabled={deletingIds.has(recipe.id)}
              className="icon-button-danger absolute top-3 right-3 z-10 disabled:opacity-50"
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
              <h3
                className="text-lg font-semibold text-stone-900 transition-colors"
                style={{ '--hover-color': 'var(--primary)' } as React.CSSProperties}
              >
                <span className="group-hover:text-primary" style={{ color: 'inherit' }}>
                  {recipe.name}
                </span>
              </h3>
              <p className="mt-2 text-sm text-stone-600 line-clamp-2">{recipe.description}</p>
              <div className="mt-4 flex items-center text-sm text-stone-500 space-x-4">
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
                  <div
                    className="flex items-center text-xs mb-2"
                    style={{ color: 'var(--primary)' }}
                  >
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
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: 'var(--primary-soft)',
                          color: 'var(--primary-hover)',
                        }}
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
