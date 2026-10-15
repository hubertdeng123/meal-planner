import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ClockIcon,
  UserGroupIcon,
  TrashIcon,
  BoltIcon,
  SparklesIcon,
  GlobeAltIcon,
} from '../components/ui/AppIcons';
import recipeService from '../services/recipe.service';
import type { Recipe } from '../types';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { ToolbarRow } from '../components/ui/ToolbarRow';
import { useToast } from '../contexts/ToastContext';

const DIETARY_BADGES: Record<string, { label: string; className: string }> = {
  vegetarian: {
    label: 'Vegetarian',
    className: 'border border-[#3F624D]/25 bg-[#ECF5F0] text-[#2F6F4E]',
  },
  vegan: {
    label: 'Vegan',
    className: 'border border-[#3F624D]/25 bg-[#ECF5F0] text-[#2F6F4E]',
  },
  'gluten-free': {
    label: 'Gluten-Free',
    className: 'border border-[#C84B31]/25 bg-[#F9F1EA] text-[#9A3412]',
  },
  'dairy-free': {
    label: 'Dairy-Free',
    className: 'border border-[#E7E0D6] bg-[#FAF7F2] text-[#57534E]',
  },
  'high-protein': {
    label: 'High-Protein',
    className: 'border border-[#C84B31]/25 bg-[#F9F1EA] text-[#9A3412]',
  },
  keto: {
    label: 'Keto',
    className: 'border border-[#C84B31]/25 bg-[#F9F1EA] text-[#9A3412]',
  },
  paleo: {
    label: 'Paleo',
    className: 'border border-[#C84B31]/25 bg-[#F9F1EA] text-[#9A3412]',
  },
};

const QUICK_FILTER_PRESETS = [
  { id: 'all', label: 'All Recipes' },
  { id: 'quick', label: 'Quick (<30m)' },
  { id: 'vegetarian', label: 'Vegetarian' },
  { id: 'vegan', label: 'Vegan' },
  { id: 'high-protein', label: 'High-Protein' },
  { id: 'gluten-free', label: 'Gluten-Free' },
];

function getDietaryBadges(tags: string[]): Array<{ label: string; className: string }> {
  const normalizedTags = tags.map(t => t.toLowerCase());
  const badges: Array<{ label: string; className: string }> = [];

  for (const [key, badge] of Object.entries(DIETARY_BADGES)) {
    if (normalizedTags.some(tag => tag.includes(key))) {
      badges.push(badge);
      if (badges.length >= 2) break;
    }
  }

  return badges;
}

export default function RecipesPage() {
  const navigate = useNavigate();
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
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [chefCraving, setChefCraving] = useState('');
  const pageSize = 9;

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setSearchQuery(searchInput.trim());
    }, 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const loadRecipes = useCallback(async () => {
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
  }, [addToast, order, page, pageSize, searchQuery, sort]);

  useEffect(() => {
    void loadRecipes();
  }, [loadRecipes]);

  const dynamicTags = useMemo(() => {
    const presetIds = new Set(QUICK_FILTER_PRESETS.map(p => p.id));
    const discovered = new Set<string>();
    for (const recipe of recipes) {
      for (const rawTag of recipe.tags || []) {
        const lower = rawTag.trim().toLowerCase();
        if (lower && !presetIds.has(lower) && discovered.size < 6) {
          discovered.add(lower);
        }
      }
    }
    return Array.from(discovered);
  }, [recipes]);

  const filteredRecipes = useMemo(() => {
    if (activeFilter === 'all') return recipes;
    return recipes.filter(recipe => {
      const totalMinutes = (recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0);
      const lowerTags = (recipe.tags || []).map(t => t.toLowerCase());
      if (activeFilter === 'quick') {
        return totalMinutes > 0 && totalMinutes <= 30;
      }
      if (activeFilter === 'high-protein') {
        return (
          lowerTags.some(t => t.includes('protein')) ||
          (recipe.nutrition?.protein_g !== undefined && recipe.nutrition.protein_g >= 25)
        );
      }
      return lowerTags.some(t => t.includes(activeFilter));
    });
  }, [recipes, activeFilter]);

  const handleDelete = async (recipeId: number, event: React.MouseEvent) => {
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

  const handleChefPromptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = chefCraving.trim();
    if (trimmed) {
      navigate(`/generate?use=${encodeURIComponent(trimmed)}`);
    } else {
      navigate('/generate');
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
        badge={<span className="eyebrow">Personal Cookbook</span>}
        title="Recipe Vault"
        subtitle="Browse, filter, and cook from your curated collection of recipes."
        actions={
          <Link to="/generate" className="btn-primary">
            New recipe, please
          </Link>
        }
      />

      {/* Editorial AI Chef Prompt Banner */}
      <div className="surface-warm p-4 sm:p-5 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="icon-container-premium icon-container-sm icon-container-orange flex-shrink-0">
            <SparklesIcon className="h-4 w-4 text-[#C84B31]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#1C1917]">
              Craving something specific or cooking from the fridge?
            </p>
            <p className="text-xs text-[#57534E]">
              Enter an ingredient or craving to jump straight into the AI Chef Studio.
            </p>
          </div>
        </div>
        <form
          onSubmit={handleChefPromptSubmit}
          className="flex items-center gap-2 sm:w-auto w-full"
        >
          <input
            type="text"
            value={chefCraving}
            onChange={e => setChefCraving(e.target.value)}
            placeholder="e.g. mushrooms, lemon..."
            className="input py-2 text-xs sm:w-52 bg-white"
            aria-label="Ingredient or craving for AI Chef"
          />
          <button type="submit" className="btn-secondary py-2 px-4 text-xs whitespace-nowrap">
            Open AI Studio
          </button>
        </form>
      </div>

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

      {/* Quick Dietary & Tag Filter Bar */}
      <div
        className="mt-4 flex items-center gap-2 overflow-x-auto pb-1"
        role="group"
        aria-label="Quick recipe filters"
      >
        {QUICK_FILTER_PRESETS.map(filter => {
          const isActive = activeFilter === filter.id;
          return (
            <button
              key={filter.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => setActiveFilter(filter.id)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
                isActive
                  ? 'border-[#C84B31] bg-[#F9F1EA] text-[#9A3412] shadow-2xs'
                  : 'border-[#E7E0D6] bg-white text-[#57534E] hover:border-[#D6CEC2] hover:bg-[#FAF7F2] hover:text-[#1C1917]'
              }`}
            >
              {filter.id === 'quick' && <BoltIcon className="h-3.5 w-3.5 text-[#2F6F4E]" />}
              {filter.label}
            </button>
          );
        })}
        {dynamicTags.map(tag => {
          const isActive = activeFilter === tag;
          return (
            <button
              key={tag}
              type="button"
              aria-pressed={isActive}
              onClick={() => setActiveFilter(isActive ? 'all' : tag)}
              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all duration-150 ${
                isActive
                  ? 'border-[#3F624D] bg-[#ECF5F0] text-[#2F6F4E]'
                  : 'border-[#E7E0D6] bg-[#FAF7F2] text-[#57534E] hover:border-[#D6CEC2] hover:text-[#1C1917]'
              }`}
            >
              #{tag}
            </button>
          );
        })}
      </div>

      {filteredRecipes.length === 0 ? (
        <EmptyState
          className="mt-8"
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
                setActiveFilter('all');
              }}
            >
              Clear filters
            </button>
          }
        />
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredRecipes.map((recipe, index) => {
            const totalMinutes = (recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0);
            const isQuick = totalMinutes > 0 && totalMinutes <= 30;
            const dietaryBadges = getDietaryBadges(recipe.tags || []);

            return (
              <div
                key={recipe.id}
                className="card card-hover group flex flex-col justify-between p-6 relative opacity-0 animate-slide-in-up"
                style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'forwards' }}
              >
                {/* Top bar: Dietary/Quick badges on left, Delete button on right */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex flex-wrap items-center gap-1.5 min-h-[24px]">
                    {isQuick && (
                      <span className="inline-flex items-center rounded-full border border-[#3F624D]/25 bg-[#ECF5F0] px-2.5 py-0.5 text-xs font-semibold text-[#2F6F4E]">
                        <BoltIcon className="h-3 w-3 mr-1 text-[#2F6F4E]" />
                        Quick
                      </span>
                    )}
                    {dietaryBadges.map(badge => (
                      <span
                        key={badge.label}
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    ))}
                    {!isQuick && dietaryBadges.length === 0 && (
                      <span className="eyebrow text-[11px]">
                        {recipe.source || 'Kitchen Vault'}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={e => handleDelete(recipe.id, e)}
                    disabled={deletingIds.has(recipe.id)}
                    className="icon-button-danger -mt-1 -mr-1 flex-shrink-0 disabled:opacity-50"
                    title="Delete recipe"
                    aria-label="Delete recipe"
                  >
                    {deletingIds.has(recipe.id) ? (
                      <div className="animate-spin h-4 w-4 border-2 border-[#B91C1C] border-t-transparent rounded-full"></div>
                    ) : (
                      <TrashIcon className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {/* Clickable Recipe Body & Footer */}
                <Link
                  to={`/recipes/${recipe.id}`}
                  className="flex flex-1 flex-col justify-between focus:outline-none"
                >
                  <div>
                    <h3 className="font-display text-xl font-semibold text-[#1C1917] group-hover:text-[#C84B31] transition-colors">
                      {recipe.name}
                    </h3>
                    {recipe.description && (
                      <p className="mt-2 text-sm text-[#57534E] line-clamp-2 leading-relaxed">
                        {recipe.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-5 border-t border-[#E7E0D6] pt-4">
                    <div className="flex items-center gap-4 text-xs font-medium text-[#57534E] tabular-nums">
                      <div className="inline-flex items-center gap-1.5">
                        <ClockIcon className="h-4 w-4 text-[#78716C]" />
                        <span>{totalMinutes} min</span>
                      </div>
                      <div className="inline-flex items-center gap-1.5">
                        <UserGroupIcon className="h-4 w-4 text-[#78716C]" />
                        <span>{recipe.servings} servings</span>
                      </div>
                    </div>

                    {recipe.source_urls && recipe.source_urls.length > 0 && (
                      <div className="mt-2.5 flex items-center text-xs font-medium text-[#9A3412]">
                        <GlobeAltIcon className="h-3.5 w-3.5 mr-1 text-[#C84B31]" />
                        <span>
                          {recipe.source_urls.length === 1
                            ? 'Web-inspired recipe'
                            : `Inspired by ${recipe.source_urls.length} sources`}
                        </span>
                      </div>
                    )}

                    {recipe.tags && recipe.tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {recipe.tags.slice(0, 3).map(tag => (
                          <span
                            key={tag}
                            className="inline-flex items-center rounded-full border border-[#E7E0D6] bg-[#FAF7F2] px-2.5 py-0.5 text-xs font-medium text-[#57534E]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
              </div>
            );
          })}
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
          <span className="text-sm font-medium text-[#57534E] tabular-nums">
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
