import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import recipeService, { type RecipeListParams } from '../services/recipe.service';
import type { Recipe, RecipeFacet } from '../types';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { SearchInput } from '../components/ui/SearchInput';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { SkeletonGrid } from '../components/ui/Skeletons';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Spinner } from '../components/ui/PageLoader';
import { RecipeCard } from '../components/recipe/RecipeCard';
import { BoltIcon, HeartIcon, RecipeBookIcon, SparklesIcon } from '../components/ui/AppIcons';
import { useToast } from '../contexts/ToastContext';
import { isQuick } from '../utils/recipe';

type SortKey = 'newest' | 'name' | 'quickest';

const SORTS: Record<SortKey, Pick<RecipeListParams, 'sort' | 'order'>> = {
  newest: { sort: 'created_at', order: 'desc' },
  name: { sort: 'name', order: 'asc' },
  quickest: { sort: 'total_minutes', order: 'asc' },
};

const PAGE_SIZE = 12;

export default function RecipesPage() {
  const { addToast } = useToast();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('newest');
  const [favorites, setFavorites] = useState(false);
  const [quickOnly, setQuickOnly] = useState(false);
  const [cuisine, setCuisine] = useState('');
  const [cuisines, setCuisines] = useState<RecipeFacet[]>([]);
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());
  const [pendingDelete, setPendingDelete] = useState<Recipe | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(searchInput.trim()), 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    const loadFacets = async () => {
      try {
        const facets = await recipeService.getFacets();
        if (!cancelled) setCuisines(facets.cuisines.filter(item => item.value).slice(0, 6));
      } catch {
        // Cuisine chips are an enhancement; the vault works without them.
      }
    };
    void loadFacets();
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchPage = useCallback(
    (pageNumber: number) =>
      recipeService.getRecipesPaginated({
        page: pageNumber,
        pageSize: PAGE_SIZE,
        q: searchQuery || undefined,
        cuisine: cuisine || undefined,
        favorites: favorites || undefined,
        ...SORTS[quickOnly ? 'quickest' : sortKey],
      }),
    [cuisine, favorites, quickOnly, searchQuery, sortKey]
  );

  const loadFirstPage = useCallback(async () => {
    setStatus('loading');
    try {
      const data = await fetchPage(1);
      setRecipes(Array.isArray(data?.items) ? data.items : []);
      setPage(1);
      setTotalPages(data?.total_pages ?? 0);
      setTotal(data?.total ?? 0);
      setStatus('ready');
    } catch (error) {
      console.error('Failed to load recipes:', error);
      setStatus('error');
    }
  }, [fetchPage]);

  useEffect(() => {
    void loadFirstPage();
  }, [loadFirstPage]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const data = await fetchPage(page + 1);
      setRecipes(prev => [
        ...prev,
        ...data.items.filter(item => !prev.some(r => r.id === item.id)),
      ]);
      setPage(page + 1);
      setTotalPages(data.total_pages);
    } catch (error) {
      console.error('Failed to load more recipes:', error);
      addToast('Could not load more recipes. Try again?', 'error');
    } finally {
      setLoadingMore(false);
    }
  };

  const handleDelete = async (recipe: Recipe) => {
    setPendingDelete(null);
    setDeletingIds(prev => new Set(prev).add(recipe.id));
    try {
      await recipeService.deleteRecipe(recipe.id);
      setRecipes(prev => prev.filter(item => item.id !== recipe.id));
      setTotal(prev => Math.max(0, prev - 1));
      addToast(`Deleted ${recipe.name}.`, 'success');
    } catch (error) {
      console.error('Failed to delete recipe:', error);
      addToast('Could not delete that recipe. Try again?', 'error');
    } finally {
      setDeletingIds(prev => {
        const next = new Set(prev);
        next.delete(recipe.id);
        return next;
      });
    }
  };

  const hasFilters = Boolean(searchQuery || favorites || quickOnly || cuisine);
  const clearFilters = () => {
    setSearchInput('');
    setSearchQuery('');
    setFavorites(false);
    setQuickOnly(false);
    setCuisine('');
  };

  // The server sorts by total time when "Quick" is on, so the quick recipes are always the
  // leading run of results and client-side trimming never hides one on a later page.
  const visible = quickOnly ? recipes.filter(isQuick) : recipes;
  const exhaustedQuick = quickOnly && visible.length < recipes.length;

  if (status === 'ready' && recipes.length === 0 && !hasFilters) {
    return (
      <EmptyState
        icon={<RecipeBookIcon />}
        title="No recipes yet...yet"
        description="Kick things off with your first recipe."
        action={
          <Link to="/generate" className="btn-primary">
            <SparklesIcon className="h-4 w-4" />
            Make a recipe
          </Link>
        }
      />
    );
  }

  const chipClass = (active: boolean) =>
    `chip flex-shrink-0 px-3.5 py-1.5 text-sm ${active ? 'chip-active' : ''}`;

  return (
    <div>
      <PageHeader
        title="Recipes"
        subtitle={
          status === 'ready'
            ? `${total} saved ${total === 1 ? 'recipe' : 'recipes'}, ready when you are.`
            : 'Everything you’ve cooked up so far.'
        }
        actions={
          <Link to="/generate" className="btn-primary">
            <SparklesIcon className="h-4 w-4" />
            New recipe, please
          </Link>
        }
      />

      <div className="mb-6 space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <SearchInput
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Search recipes"
            className="md:max-w-sm"
          />
          <SegmentedControl
            label="Sort recipes"
            value={quickOnly ? 'quickest' : sortKey}
            onChange={value => {
              setQuickOnly(false);
              setSortKey(value);
            }}
            options={[
              { value: 'newest', label: 'Newest' },
              { value: 'name', label: 'A–Z' },
              { value: 'quickest', label: 'Quickest' },
            ]}
            className="md:ml-auto"
          />
        </div>
        <div
          role="group"
          aria-label="Filters"
          className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
        >
          <button
            type="button"
            aria-pressed={favorites}
            onClick={() => setFavorites(value => !value)}
            className={chipClass(favorites)}
          >
            <HeartIcon className="h-3.5 w-3.5" />
            Favourites
          </button>
          <button
            type="button"
            aria-pressed={quickOnly}
            onClick={() => setQuickOnly(value => !value)}
            className={chipClass(quickOnly)}
          >
            <BoltIcon className="h-3.5 w-3.5" />
            Under 30 min
          </button>
          {cuisines.map(item => (
            <button
              key={item.value}
              type="button"
              aria-pressed={cuisine === item.value}
              onClick={() => setCuisine(value => (value === item.value ? '' : item.value))}
              className={chipClass(cuisine === item.value)}
            >
              {item.value}
              <span className="text-stone-400">{item.count}</span>
            </button>
          ))}
          {hasFilters && (
            <button type="button" onClick={clearFilters} className="btn-ghost btn-sm flex-shrink-0">
              Clear
            </button>
          )}
        </div>
      </div>

      {status === 'loading' ? (
        <SkeletonGrid variant="recipe" count={6} testId="recipes-loading" />
      ) : status === 'error' ? (
        <ErrorState
          title="Couldn't load your recipes"
          description="Something went wrong on our side. Your recipes are safe."
          onRetry={() => void loadFirstPage()}
        />
      ) : visible.length === 0 ? (
        <EmptyState
          variant="compact"
          title="Nothing matches"
          description="Try a different search, or clear the filters."
          action={
            <button type="button" className="btn-secondary" onClick={clearFilters}>
              Clear filters
            </button>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 stagger">
            {visible.map(recipe => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                deleting={deletingIds.has(recipe.id)}
                onDelete={() => setPendingDelete(recipe)}
              />
            ))}
          </div>
          {page < totalPages && !exhaustedQuick && (
            <div className="mt-10 flex justify-center">
              <button
                type="button"
                className="btn-secondary"
                onClick={loadMore}
                disabled={loadingMore}
              >
                {loadingMore && <Spinner className="h-4 w-4" />}
                Show more recipes
              </button>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        isOpen={Boolean(pendingDelete)}
        title={`Delete ${pendingDelete?.name ?? 'recipe'}?`}
        description="This permanently removes the recipe and your notes on it."
        confirmLabel="Delete"
        tone="danger"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && void handleDelete(pendingDelete)}
      />
    </div>
  );
}
