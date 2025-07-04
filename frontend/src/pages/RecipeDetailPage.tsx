import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ClockIcon,
  UserGroupIcon,
  TrashIcon,
  StarIcon,
  HeartIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon, HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import recipeService from '../services/recipe.service';
import type { Recipe, RecipeFeedback } from '../types';

export default function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [liked, setLiked] = useState(false);
  const [notes, setNotes] = useState('');
  const [savingFeedback, setSavingFeedback] = useState(false);

  const loadRecipe = useCallback(
    async (recipeId: number) => {
      try {
        const data = await recipeService.getRecipe(recipeId);
        setRecipe(data);
      } catch (error) {
        console.error('Failed to load recipe:', error);
        navigate('/recipes');
      } finally {
        setLoading(false);
      }
    },
    [navigate]
  );

  useEffect(() => {
    if (id) {
      loadRecipe(parseInt(id));
    }
  }, [id, loadRecipe]);

  const handleDelete = async () => {
    if (!recipe) {
      return;
    }

    setDeleting(true);
    try {
      await recipeService.deleteRecipe(recipe.id);
      navigate('/recipes');
    } catch (error) {
      console.error('Failed to delete recipe:', error);
      alert('Failed to delete recipe. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveFeedback = async () => {
    if (!recipe) return;

    setSavingFeedback(true);
    try {
      const feedback: Omit<RecipeFeedback, 'recipe_id'> = {
        liked,
        rating: rating > 0 ? rating : undefined,
        notes: notes.trim() || undefined,
      };

      await recipeService.addFeedback(recipe.id, feedback);

      // Show success message
      const successDiv = document.createElement('div');
      successDiv.className =
        'fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg';
      successDiv.textContent = 'Feedback saved successfully!';
      document.body.appendChild(successDiv);

      setTimeout(() => {
        successDiv.remove();
      }, 3000);
    } catch (error) {
      console.error('Failed to save feedback:', error);
      alert('Failed to save feedback. Please try again.');
    } finally {
      setSavingFeedback(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!recipe) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">{recipe.name}</h1>
            {recipe.description && <p className="mt-2 text-gray-600">{recipe.description}</p>}
            {recipe.source_urls && recipe.source_urls.length > 0 && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center space-x-2 mb-2">
                  <svg
                    className="h-4 w-4 text-blue-600"
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
                  <span className="text-sm font-medium text-blue-800">
                    {recipe.source_urls.length === 1
                      ? 'Recipe inspiration from:'
                      : `Recipe inspired by ${recipe.source_urls.length} sources:`}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recipe.source_urls.map((url, index) => {
                    // Extract domain name from URL
                    const getDomainName = (url: string) => {
                      try {
                        const domain = new URL(url).hostname.replace('www.', '');
                        // Make it more readable
                        const domainMap: Record<string, string> = {
                          'allrecipes.com': 'AllRecipes',
                          'foodnetwork.com': 'Food Network',
                          'seriouseats.com': 'Serious Eats',
                          'simplyrecipes.com': 'Simply Recipes',
                          'food.com': 'Food.com',
                          'tasteofhome.com': 'Taste of Home',
                          'delish.com': 'Delish',
                          'cookinglight.com': 'Cooking Light',
                          'epicurious.com': 'Epicurious',
                          'bonappetit.com': 'Bon Appétit',
                        };
                        return domainMap[domain] || domain;
                      } catch {
                        return `Source ${index + 1}`;
                      }
                    };

                    return (
                      <a
                        key={index}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white text-blue-700 border border-blue-300 hover:bg-blue-100 hover:border-blue-400 transition-colors duration-200"
                      >
                        {getDomainName(url)}
                        <svg
                          className="ml-1 h-3 w-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                          />
                        </svg>
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200 disabled:opacity-50"
            title="Delete recipe"
          >
            <TrashIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 flex items-center text-sm text-gray-500 space-x-4">
          <div className="flex items-center">
            <ClockIcon className="h-5 w-5 mr-1" />
            {(recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0)} minutes
          </div>
          <div className="flex items-center">
            <UserGroupIcon className="h-5 w-5 mr-1" />
            {recipe.servings} servings
          </div>
        </div>

        {/* Rating and Feedback Section */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">Rate this Recipe</h3>

          <div className="flex items-center space-x-4 mb-4">
            {/* Like button */}
            <button onClick={() => setLiked(!liked)} className="flex items-center space-x-2">
              {liked ? (
                <HeartSolidIcon className="h-6 w-6 text-red-500" />
              ) : (
                <HeartIcon className="h-6 w-6 text-gray-400 hover:text-red-500" />
              )}
              <span className="text-sm">{liked ? 'Liked' : 'Like'}</span>
            </button>

            {/* Star rating */}
            <div className="flex items-center space-x-1">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="p-1"
                >
                  {star <= (hoveredRating || rating) ? (
                    <StarSolidIcon className="h-6 w-6 text-yellow-400" />
                  ) : (
                    <StarIcon className="h-6 w-6 text-gray-300" />
                  )}
                </button>
              ))}
              {rating > 0 && (
                <span className="ml-2 text-sm text-gray-600">
                  {rating} star{rating > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="mb-4">
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notes (optional)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="What did you think of this recipe?"
            />
          </div>

          <button onClick={handleSaveFeedback} disabled={savingFeedback} className="btn-primary">
            {savingFeedback ? 'Saving...' : 'Save Feedback'}
          </button>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-xl font-semibold mb-4">Ingredients</h2>
            <ul className="space-y-2">
              {recipe.ingredients.map((ingredient, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-gray-700">
                    {ingredient.quantity} {ingredient.unit} {ingredient.name}
                    {ingredient.notes && (
                      <span className="text-gray-500"> ({ingredient.notes})</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">Nutrition Facts</h2>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                {recipe.nutrition.calories && (
                  <div>
                    <span className="font-medium">Calories:</span> {recipe.nutrition.calories}
                  </div>
                )}
                {recipe.nutrition.protein_g && (
                  <div>
                    <span className="font-medium">Protein:</span> {recipe.nutrition.protein_g}g
                  </div>
                )}
                {recipe.nutrition.carbs_g && (
                  <div>
                    <span className="font-medium">Carbs:</span> {recipe.nutrition.carbs_g}g
                  </div>
                )}
                {recipe.nutrition.fat_g && (
                  <div>
                    <span className="font-medium">Fat:</span> {recipe.nutrition.fat_g}g
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Instructions</h2>
          <ol className="space-y-3">
            {recipe.instructions.map((instruction, index) => (
              <li key={index} className="flex">
                <span className="font-semibold text-blue-600 mr-3">{index + 1}.</span>
                <span className="text-gray-700">{instruction}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
