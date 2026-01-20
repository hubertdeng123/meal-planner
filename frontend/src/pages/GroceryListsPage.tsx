import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCartIcon, PlusIcon, TrashIcon, CalendarIcon } from '@heroicons/react/24/outline';
import groceryService from '../services/grocery.service';
import recipeService from '../services/recipe.service';
import type { GroceryList, Recipe } from '../types';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { ModalShell } from '../components/ui/ModalShell';

export default function GroceryListsPage() {
  const [groceryLists, setGroceryLists] = useState<GroceryList[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRecipes, setSelectedRecipes] = useState<number[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [groceryListsData, recipesData] = await Promise.all([
        groceryService.getGroceryLists(),
        recipeService.getRecipes(),
      ]);
      setGroceryLists(groceryListsData);
      setRecipes(recipesData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFromRecipes = async () => {
    if (selectedRecipes.length === 0) return;

    setCreating(true);
    try {
      const newGroceryList = await groceryService.createGroceryListFromRecipes(selectedRecipes);
      setGroceryLists([...groceryLists, newGroceryList]);
      setShowCreateModal(false);
      setSelectedRecipes([]);
    } catch (error) {
      console.error('Failed to create grocery list:', error);
      alert('Could not build that list. Try again?');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteGroceryList = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this grocery list?')) {
      return;
    }

    try {
      await groceryService.deleteGroceryList(id);
      setGroceryLists(groceryLists.filter(list => list.id !== id));
    } catch (error) {
      console.error('Failed to delete grocery list:', error);
      alert('Could not delete that list. Try again?');
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f97316]"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <PageHeader
            title="Grocery Lists"
            subtitle="Turn recipes into a shopping plan that behaves"
          />
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button onClick={() => setShowCreateModal(true)} className="btn-primary">
            <PlusIcon className="h-4 w-4 mr-2" />
            Build from recipes
          </button>
        </div>
      </div>

      {groceryLists.length === 0 ? (
        <EmptyState
          icon={<ShoppingCartIcon className="h-12 w-12" />}
          title="No lists yet"
          description="Pick a few recipes and we'll do the list."
          action={
            <button onClick={() => setShowCreateModal(true)} className="btn-primary">
              <PlusIcon className="h-4 w-4 mr-2" />
              Create a list
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
                    <h3 className="text-lg font-medium text-gray-900">Grocery list</h3>
                    <p className="text-sm text-gray-500 flex items-center">
                      <CalendarIcon className="h-4 w-4 mr-1" />
                      {new Date(groceryList.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteGroceryList(groceryList.id)}
                  className="icon-button-danger"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4">
                <p className="text-sm text-gray-600">{groceryList.items.length} items</p>
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
                    <span className="ml-2 text-xs text-gray-500">
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

      {/* Create Modal */}
      {showCreateModal && (
        <ModalShell size="lg">
          <div className="mt-3">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Build a grocery list from recipes
            </h3>

            <p className="text-sm text-gray-600 mb-4">Pick the recipes you want on this list:</p>

            <div className="max-h-96 overflow-y-auto">
              {recipes.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No recipes yet.{' '}
                  <Link to="/generate" className="text-[#f97316] hover:underline">
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
                        className="h-4 w-4 text-[#f97316] focus:ring-[#f97316]/40 border-slate-300 rounded"
                      />
                      <div className="ml-3 flex-1">
                        <p className="text-sm font-medium text-gray-900">{recipe.name}</p>
                        <p className="text-xs text-gray-500">
                          {recipe.ingredients.length} ingredients
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end space-x-3">
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
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  );
}
