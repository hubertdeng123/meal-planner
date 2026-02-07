import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ClockIcon, UserGroupIcon, TrashIcon, BoltIcon } from '../components/ui/AppIcons';
import recipeService from '../services/recipe.service';
import type { Recipe } from '../types';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { ToolbarRow } from '../components/ui/ToolbarRow';
import { useToast } from '../contexts/ToastContext';

// Dietary tags that should show as badges
const DIETARY_BADGES: Record<string, { label: string; className: string }> = {
  vegetarian: { label: 'Vegetarian', className: 'bg-green-100 text-green-700' },
  vegan: { label: 'Vegan', className: 'bg-green-100 text-green-700' },
  'gluten-free': { label: 'GF', className: 'bg-amber-100 text-amber-700' },
  'dairy-free': { label: 'DF', className: 'bg-blue-100 text-blue-700' },
  keto: { label: 'Keto', className: 'bg-purple-100 text-purple-700' },
  paleo: { label: 'Paleo', className: 'bg-orange-100 text-orange-700' },
};

function getDietaryBadges(tags: string[]): Array<{ label: string; className: string }> {
  const normalizedTags = tags.map(t => t.toLowerCase());
  const badges: Array<{ label: string; className: string }> = [];

  for (const [key, badge] of Object.entries(DIETARY_BADGES)) {
    if (normalizedTags.some(tag => tag.includes(key))) {
      badges.push(badge);
      if (badges.length >= 2) break; // Max 2 dietary badges
    }
  }

  return badges;
}

export default function RecipesPage() {
  const { addToast } = useToast();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sort, setSort] = useState<'created_at' | 'name'>('created_at');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const pageSize = 9;

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setSearchQuery(searchInput.trim());
    }, 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    loadRecipes();
  }, [page, searchQuery, sort, order]);

  const loadRecipes = async () => {
    setLoading(true);
    try {
      const data = await recipeService.getRecipesPaginated({
        page,
        pageSize,
        q: searchQuery || undefined,
        sort,
        order,
      });
      setRecipes(Array.isArray(data?.items) ? data.items : []);
      setTotalPages(typeof data?.total_pages === 'number' ? data.total_pages : 0);
    } catch (error) {
      console.error('Failed to load recipes:', error);
      addToast('Could not load recipes. Try again?', 'error');
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
      addToast('Could not delete that recipe. Try again?', 'error');
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

  if (recipes.length === 0 && !searchQuery) {
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
      <PageHeader
        title="Recipe Vault"
        subtitle="Browse and manage your saved recipes"
        actions={
          <Link to="/generate" className="btn-primary">
            New recipe, please
          </Link>
        }
      />

      <ToolbarRow controlsClassName="md:grid-cols-[1fr_auto_auto]">
        <input
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          className="input"
          placeholder="Search by recipe name"
        />
        <select
          className="input"
          value={sort}
          onChange={e => setSort(e.target.value as 'created_at' | 'name')}
        >
          <option value="created_at">Sort by newest</option>
          <option value="name">Sort by name</option>
        </select>
        <button
          className="btn-secondary"
          onClick={() => setOrder(prev => (prev === 'desc' ? 'asc' : 'desc'))}
        >
          {order === 'desc' ? 'Descending' : 'Ascending'}
        </button>
      </ToolbarRow>

      {recipes.length === 0 ? (
        <EmptyState
          title="No recipes matched"
          description="Try another search or clear filters."
          action={
            <button
              className="btn-secondary"
              onClick={() => {
                setSearchInput('');
                setSearchQuery('');
                setSort('created_at');
                setOrder('desc');
              }}
            >
              Clear filters
            </button>
          }
        />
      ) : (
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
                {/* Quick badges row */}
                {(() => {
                  const totalTime =
                    (recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0);
                  const isQuick = totalTime > 0 && totalTime <= 30;
                  const dietaryBadges = getDietaryBadges(recipe.tags);

                  if (isQuick || dietaryBadges.length > 0) {
                    return (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {isQuick && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                            <BoltIcon className="h-3 w-3 mr-0.5" />
                            Quick
                          </span>
                        )}
                        {dietaryBadges.map(badge => (
                          <span
                            key={badge.label}
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                        ))}
                      </div>
                    );
                  }
                  return null;
                })()}

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
      )}

      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-3">
          <button
            className="btn-secondary"
            disabled={page === 1}
            onClick={() => setPage(prev => Math.max(1, prev - 1))}
          >
            Previous
          </button>
          <span className="text-sm text-stone-600">
            Page {page} of {totalPages}
          </span>
          <button
            className="btn-secondary"
            disabled={page === totalPages}
            onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
