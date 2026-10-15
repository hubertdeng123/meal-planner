import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingCartIcon,
  PlusIcon,
  TrashIcon,
  CalendarIcon,
  ArrowRightIcon,
} from '../components/ui/AppIcons';
import groceryService from '../services/grocery.service';
import recipeService from '../services/recipe.service';
import type { GroceryList, Recipe } from '../types';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { ModalShell } from '../components/ui/ModalShell';
import { ToolbarRow } from '../components/ui/ToolbarRow';
import { KitchenSubNav } from '../components/ui/KitchenSubNav';
import { useToast } from '../contexts/ToastContext';
import { formatLocalDate } from '../utils/date';

export default function GroceryListsPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [groceryLists, setGroceryLists] = useState<GroceryList[]>([]);
  const [totalLists, setTotalLists] = useState(0);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRecipes, setSelectedRecipes] = useState<number[]>([]);
  const [creating, setCreating] = useState(false);
  const [creatingEmpty, setCreatingEmpty] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'created_at' | 'name'>('created_at');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [listToDelete, setListToDelete] = useState<GroceryList | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const pageSize = 9;

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setSearchQuery(searchInput.trim());
    }, 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [groceryListsData, recipesData] = await Promise.all([
        groceryService.getGroceryListsPaginated({
          page,
          pageSize,
          q: searchQuery || undefined,
          sort: sortBy,
          order: sortOrder,
        }),
        recipeService.getRecipes(0, 500),
      ]);
      setGroceryLists(groceryListsData.items);
      setTotalLists(groceryListsData.total ?? groceryListsData.items.length);
      setTotalPages(groceryListsData.total_pages);
      setRecipes(recipesData);
    } catch (error) {
      console.error('Failed to load data:', error);
      addToast('Could not load grocery lists. Try again?', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast, page, pageSize, searchQuery, sortBy, sortOrder]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleCreateEmptyList = async () => {
    setCreatingEmpty(true);
    try {
      const newGroceryList = await groceryService.createGroceryList({});
      addToast('New grocery list created.', 'success');
      navigate(`/grocery/${newGroceryList.id}`);
    } catch (error) {
      console.error('Failed to create empty grocery list:', error);
      addToast('Could not create a new list. Try again?', 'error');
    } finally {
      setCreatingEmpty(false);
    }
  };

  const handleCreateFromRecipes = async () => {
    if (selectedRecipes.length === 0) return;

    setCreating(true);
    try {
      const newGroceryList = await groceryService.createGroceryListFromRecipes(selectedRecipes);
      setGroceryLists([newGroceryList, ...groceryLists]);
      setTotalLists(prev => prev + 1);
      setShowCreateModal(false);
      setSelectedRecipes([]);
      addToast('Grocery list created.', 'success');
    } catch (error) {
      console.error('Failed to create grocery list:', error);
      addToast('Could not build that list. Try again?', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteGroceryList = async () => {
    if (!listToDelete) return;
    setDeletingId(listToDelete.id);
    try {
      await groceryService.deleteGroceryList(listToDelete.id);
      setGroceryLists(groceryLists.filter(list => list.id !== listToDelete.id));
      setTotalLists(prev => Math.max(0, prev - 1));
      addToast('Grocery list deleted.', 'success');
      setListToDelete(null);
    } catch (error) {
      console.error('Failed to delete grocery list:', error);
      addToast('Could not delete that list. Try again?', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const toggleRecipeSelection = (recipeId: number) => {
    setSelectedRecipes(prev =>
      prev.includes(recipeId) ? prev.filter(id => id !== recipeId) : [...prev, recipeId]
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div
          className="animate-spin rounded-full h-12 w-12 border-b-2"
          style={{ borderBottomColor: 'var(--primary)' }}
        />
      </div>
    );
  }

  return (
    <div>
      <KitchenSubNav
        groceryCount={totalLists || groceryLists.length}
        actions={
          <Link to="/pantry" className="btn-ghost text-xs">
            <span>Check Pantry Inventory</span>
            <ArrowRightIcon className="h-3.5 w-3.5" />
          </Link>
        }
      />

      <PageHeader
        badge={<span className="badge">Kitchen &amp; Shop</span>}
        title="Grocery Lists"
        subtitle="Turn weekly meal plans and favorite recipes into organized, aisle-by-aisle shopping runs."
        actions={
          <>
            <Link to="/meal-plans" className="btn-secondary">
              Build from Meal Plan
            </Link>
            <button
              type="button"
              onClick={handleCreateEmptyList}
              disabled={creatingEmpty}
              className="btn-secondary"
            >
              <PlusIcon className="h-4 w-4" />
              {creatingEmpty ? 'Creating...' : 'New empty list'}
            </button>
            <button type="button" onClick={() => setShowCreateModal(true)} className="btn-primary">
              <PlusIcon className="h-4 w-4" />
              Build from recipes
            </button>
          </>
        }
      />

      <ToolbarRow helper="Ingredients are automatically grouped by store aisle">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex-1">
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="input"
              placeholder="Search lists by name..."
              aria-label="Search lists by name"
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              value={`${sortBy}:${sortOrder}`}
              onChange={e => {
                const [nextSort, nextOrder] = e.target.value.split(':') as [
                  'created_at' | 'name',
                  'desc' | 'asc',
                ];
                setPage(1);
                setSortBy(nextSort);
                setSortOrder(nextOrder);
              }}
              aria-label="Sort grocery lists"
              className="input !w-auto min-w-[170px]"
            >
              <option value="created_at:desc">Newest first</option>
              <option value="created_at:asc">Oldest first</option>
              <option value="name:asc">Name (A–Z)</option>
              <option value="name:desc">Name (Z–A)</option>
            </select>
          </div>
        </div>
      </ToolbarRow>

      {groceryLists.length === 0 && !searchQuery ? (
        <EmptyState
          icon={<ShoppingCartIcon className="h-12 w-12" />}
          title="Your shopping trip, sorted"
          description="Pick a few recipes or start from a weekly meal plan to build your aisle-by-aisle list in seconds."
          valueProp="We combine duplicate ingredients and organize by store aisle so you spend less time backtracking."
          action={
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button onClick={() => setShowCreateModal(true)} className="btn-primary">
                <PlusIcon className="h-4 w-4" />
                Build my first list
              </button>
              <Link to="/meal-plans" className="btn-secondary">
                Build from Meal Plan
              </Link>
            </div>
          }
        />
      ) : groceryLists.length === 0 ? (
        <EmptyState
          title="No grocery lists matched"
          description="Try another search phrase or clear your filter."
          variant="compact"
          action={
            <button
              className="btn-secondary"
              onClick={() => {
                setSearchInput('');
                setSearchQuery('');
              }}
            >
              Clear search
            </button>
          }
        />
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {groceryLists.map(groceryList => {
            const totalItems = groceryList.items.length;
            const checkedItems = groceryList.items.filter(item => item.checked).length;
            const pct = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0;

            const categoryCounts = groceryList.items.reduce<Record<string, number>>((acc, item) => {
              const cat = item.category || 'Other';
              acc[cat] = (acc[cat] || 0) + 1;
              return acc;
            }, {});
            const categoryEntries = Object.entries(categoryCounts).slice(0, 4);
            const remainingCategories = Math.max(0, Object.keys(categoryCounts).length - 4);

            return (
              <div
                key={groceryList.id}
                className="card card-hover flex flex-col justify-between p-6"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div className="icon-container-premium icon-container-emerald shrink-0">
                        <ShoppingCartIcon className="h-5 w-5 text-[#2F6F4E]" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-display text-xl font-semibold leading-snug text-[#1C1917] line-clamp-2">
                          {groceryList.name || 'Grocery list'}
                        </h3>
                        <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-[#78716C]">
                          <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
                          <span>Created {formatLocalDate(groceryList.created_at)}</span>
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setListToDelete(groceryList)}
                      disabled={deletingId === groceryList.id}
                      className="icon-button-danger shrink-0"
                      title={`Delete ${groceryList.name || 'grocery list'}`}
                      aria-label={`Delete ${groceryList.name || 'grocery list'}`}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>

                  {groceryList.meal_plan_id && (
                    <div className="mt-3">
                      <Link
                        to={`/meal-plans/${groceryList.meal_plan_id}`}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#C84B31]/25 bg-[#F9F1EA] px-3 py-1 text-xs font-semibold text-[#9A3412] hover:bg-[#F3E5D8] transition-colors"
                      >
                        <CalendarIcon className="h-3.5 w-3.5" />
                        <span>Linked Meal Plan #{groceryList.meal_plan_id}</span>
                      </Link>
                    </div>
                  )}

                  {/* Completion Progress */}
                  <div className="mt-5 rounded-2xl border border-[#E7E0D6] bg-[#FAF7F2] p-3.5">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-[#57534E] tabular-nums">
                        {checkedItems}/{totalItems} checked
                      </span>
                      <span className="font-mono text-[#2F6F4E] tabular-nums">{pct}%</span>
                    </div>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#E7E0D6]">
                      <div
                        className="h-full rounded-full bg-[#2F6F4E] transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Category Preview Chips */}
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {categoryEntries.length > 0 ? (
                      <>
                        {categoryEntries.map(([cat, count]) => (
                          <span key={cat} className="chip text-xs tabular-nums">
                            {cat} ({count})
                          </span>
                        ))}
                        {remainingCategories > 0 && (
                          <span className="chip text-xs tabular-nums">
                            +{remainingCategories} more
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-xs text-[#78716C] italic">No items added yet</span>
                    )}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-[#E7E0D6]/80">
                  <Link
                    to={`/grocery/${groceryList.id}`}
                    className="btn-secondary w-full justify-center"
                  >
                    <span>Open shopping list</span>
                    <ArrowRightIcon className="h-4 w-4" />
                  </Link>
                </div>
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

      {/* Create Modal */}
      {showCreateModal && (
        <ModalShell
          size="lg"
          title="Build a grocery list from recipes"
          description="Select the recipes you want to shop for. Duplicate ingredients are merged automatically."
          onClose={() => {
            setShowCreateModal(false);
            setSelectedRecipes([]);
          }}
          footer={
            <>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setSelectedRecipes([]);
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFromRecipes}
                disabled={creating || selectedRecipes.length === 0}
                className="btn-primary"
              >
                {creating ? 'Building...' : `Build list (${selectedRecipes.length} recipes)`}
              </button>
            </>
          }
        >
          <div className="mt-3">
            <div className="max-h-96 overflow-y-auto pr-1">
              {recipes.length === 0 ? (
                <p className="text-[#78716C] text-center py-8">
                  No recipes yet.{' '}
                  <Link to="/generate" className="text-[#C84B31] font-semibold hover:underline">
                    Make a recipe
                  </Link>
                  .
                </p>
              ) : (
                <div className="space-y-2.5">
                  {recipes.map(recipe => {
                    const isSelected = selectedRecipes.includes(recipe.id);
                    return (
                      <label
                        key={recipe.id}
                        className={`flex items-center p-3.5 border rounded-2xl cursor-pointer transition-colors ${
                          isSelected
                            ? 'border-[#C84B31]/40 bg-[#F9F1EA]/70'
                            : 'border-[#E7E0D6] bg-white hover:bg-[#FAF7F2]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleRecipeSelection(recipe.id)}
                          className="h-4 w-4 rounded border-[#D6CEC2]"
                          style={{ accentColor: 'var(--primary)' }}
                        />
                        <div className="ml-3 flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[#1C1917] truncate">
                            {recipe.name}
                          </p>
                          <p className="text-xs text-[#78716C] tabular-nums">
                            {recipe.ingredients.length} ingredients
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </ModalShell>
      )}

      <ConfirmDialog
        isOpen={Boolean(listToDelete)}
        title="Delete grocery list?"
        description="This permanently removes the list and all checked states."
        confirmLabel="Delete list"
        tone="danger"
        loading={deletingId !== null}
        onCancel={() => {
          if (!deletingId) {
            setListToDelete(null);
          }
        }}
        onConfirm={handleDeleteGroceryList}
      />
    </div>
  );
}
