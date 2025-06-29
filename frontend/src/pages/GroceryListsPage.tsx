import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCartIcon, PlusIcon, TrashIcon, CalendarIcon } from '@heroicons/react/24/outline';
import groceryService from '../services/grocery.service';
import recipeService from '../services/recipe.service';
import type { GroceryList, Recipe } from '../types';

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
      alert('Failed to create grocery list. Please try again.');
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
      alert('Failed to delete grocery list. Please try again.');
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Grocery Lists</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage your shopping lists and create them from your recipes
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button onClick={() => setShowCreateModal(true)} className="btn-primary">
            <PlusIcon className="h-4 w-4 mr-2" />
            Create from Recipes
          </button>
        </div>
      </div>

      {groceryLists.length === 0 ? (
        <div className="text-center py-12">
          <ShoppingCartIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No grocery lists</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating a grocery list from your recipes.
          </p>
          <div className="mt-6">
            <button onClick={() => setShowCreateModal(true)} className="btn-primary">
              <PlusIcon className="h-4 w-4 mr-2" />
              Create your first grocery list
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {groceryLists.map(groceryList => (
            <div key={groceryList.id} className="card p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <ShoppingCartIcon className="h-8 w-8 text-green-500" />
                  <div className="ml-3">
                    <h3 className="text-lg font-medium text-gray-900">Grocery List</h3>
                    <p className="text-sm text-gray-500 flex items-center">
                      <CalendarIcon className="h-4 w-4 mr-1" />
                      {new Date(groceryList.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteGroceryList(groceryList.id)}
                  className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors duration-200"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4">
                <p className="text-sm text-gray-600">{groceryList.items.length} items</p>
                <div className="mt-2">
                  <div className="flex items-center">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
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
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Create Grocery List from Recipes
              </h3>

              <p className="text-sm text-gray-600 mb-4">
                Select the recipes you want to include in your grocery list:
              </p>

              <div className="max-h-96 overflow-y-auto">
                {recipes.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    No recipes available.{' '}
                    <Link to="/generate" className="text-blue-600 hover:underline">
                      Create some recipes first
                    </Link>
                    .
                  </p>
                ) : (
                  <div className="space-y-3">
                    {recipes.map(recipe => (
                      <label
                        key={recipe.id}
                        className="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedRecipes.includes(recipe.id)}
                          onChange={() => toggleRecipeSelection(recipe.id)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
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
                  {creating ? 'Creating...' : `Create List (${selectedRecipes.length} recipes)`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
