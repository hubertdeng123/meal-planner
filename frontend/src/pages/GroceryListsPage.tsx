import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCartIcon, PlusIcon, TrashIcon, CalendarIcon } from '../components/ui/AppIcons';
import groceryService from '../services/grocery.service';
import recipeService from '../services/recipe.service';
import type { GroceryList, Recipe } from '../types';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { ModalShell } from '../components/ui/ModalShell';
import { StatPill } from '../components/ui/StatPill';
import { ToolbarRow } from '../components/ui/ToolbarRow';
import { useToast } from '../contexts/ToastContext';

export default function GroceryListsPage() {
  const { addToast } = useToast();
  const [groceryLists, setGroceryLists] = useState<GroceryList[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRecipes, setSelectedRecipes] = useState<number[]>([]);
  const [creating, setCreating] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
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
          sort: 'created_at',
          order: 'desc',
        }),
        recipeService.getRecipes(),
      ]);
      setGroceryLists(groceryListsData.items);
      setTotalPages(groceryListsData.total_pages);
      setRecipes(recipesData);
    } catch (error) {
      console.error('Failed to load data:', error);
      addToast('Could not load grocery lists. Try again?', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast, page, pageSize, searchQuery]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleCreateFromRecipes = async () => {
    if (selectedRecipes.length === 0) return;

    setCreating(true);
    try {
      const newGroceryList = await groceryService.createGroceryListFromRecipes(selectedRecipes);
      setGroceryLists([...groceryLists, newGroceryList]);
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Grocery Lists"
        subtitle="Turn recipes and meal plans into a shopping plan that behaves"
        actions={
          <button onClick={() => setShowCreateModal(true)} className="btn-primary">
            <PlusIcon className="h-4 w-4 mr-2" />
            Build from recipes
          </button>
        }
      />

      <ToolbarRow helper="Best flow: meal plan > grocery list">
        <input
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          className="input"
          placeholder="Search lists by name"
        />
      </ToolbarRow>

      {groceryLists.length === 0 && !searchQuery ? (
        <EmptyState
          icon={<ShoppingCartIcon className="h-12 w-12" />}
          title="Your shopping trip, sorted"
          description="Pick a few recipes and we'll build your list in seconds."
          valueProp="We combine ingredients and organize by aisle so you spend less time searching."
          action={
            <button onClick={() => setShowCreateModal(true)} className="btn-primary">
              <PlusIcon className="h-4 w-4 mr-2" />
              Build my first list
            </button>
          }
        />
      ) : groceryLists.length === 0 ? (
        <EmptyState
          title="No grocery lists matched"
          description="Try another search phrase."
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
          {groceryLists.map(groceryList => (
            <div key={groceryList.id} className="card card-hover p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <ShoppingCartIcon className="h-8 w-8 text-emerald-500" />
                  <div className="ml-3">
                    <h3 className="text-lg font-medium text-stone-900">
                      {groceryList.name || 'Grocery list'}
                    </h3>
                    <p className="text-sm text-stone-500 flex items-center">
                      <CalendarIcon className="h-4 w-4 mr-1" />
                      {new Date(groceryList.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setListToDelete(groceryList)}
                  disabled={deletingId === groceryList.id}
                  className="icon-button-danger"
                  title={`Delete ${groceryList.name || 'grocery list'}`}
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4">
                <div className="mb-3 grid grid-cols-2 gap-2">
                  <StatPill label="Items" value={`${groceryList.items.length}`} />
                  <StatPill
                    label="Checked"
                    value={`${groceryList.items.filter(item => item.checked).length}`}
                    tone="success"
                  />
                </div>
                <div className="mt-2">
                  <div className="flex items-center">
                    <div className="flex-1 bg-slate-200 rounded-full h-2">
                      <div
                        className="bg-emerald-500 h-2 rounded-full"
                        style={{
                          width: `${
                            groceryList.items.length > 0
                              ? (groceryList.items.filter(item => item.checked).length /
                                  groceryList.items.length) *
                                100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                    <span className="ml-2 text-xs text-stone-500">
                      {groceryList.items.filter(item => item.checked).length} checked
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <Link
                  to={`/grocery/${groceryList.id}`}
                  className="btn-secondary w-full text-center"
                >
                  View List
                </Link>
              </div>
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

      {/* Create Modal */}
      {showCreateModal && (
        <ModalShell
          size="lg"
          title="Build a grocery list from recipes"
          description="Pick the recipes you want on this list."
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
            <div className="max-h-96 overflow-y-auto">
              {recipes.length === 0 ? (
                <p className="text-stone-500 text-center py-8">
                  No recipes yet.{' '}
                  <Link
                    to="/generate"
                    className="hover:underline"
                    style={{ color: 'var(--primary)' }}
                  >
                    Make a recipe
                  </Link>
                  .
                </p>
              ) : (
                <div className="space-y-3">
                  {recipes.map(recipe => (
                    <label
                      key={recipe.id}
                      className="flex items-center p-3 border border-slate-200/70 rounded-2xl hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedRecipes.includes(recipe.id)}
                        onChange={() => toggleRecipeSelection(recipe.id)}
                        className="h-4 w-4 border-stone-300 rounded"
                        style={{ accentColor: 'var(--primary)' }}
                      />
                      <div className="ml-3 flex-1">
                        <p className="text-sm font-medium text-stone-900">{recipe.name}</p>
                        <p className="text-xs text-stone-500">
                          {recipe.ingredients.length} ingredients
                        </p>
                      </div>
                    </label>
                  ))}
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
