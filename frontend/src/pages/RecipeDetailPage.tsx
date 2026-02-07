import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ClockIcon,
  UserGroupIcon,
  TrashIcon,
  StarIcon,
  HeartIcon,
  ShoppingBagIcon,
  StarSolidIcon,
  HeartSolidIcon,
} from '../components/ui/AppIcons';
import recipeService from '../services/recipe.service';
import groceryService from '../services/grocery.service';
import Breadcrumbs from '../components/Breadcrumbs';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { SectionCard } from '../components/ui/SectionCard';
import { useToast } from '../contexts/ToastContext';
import type { Recipe, RecipeFeedback } from '../types';

export default function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [liked, setLiked] = useState(false);
  const [justLiked, setJustLiked] = useState(false);
  const [justRated, setJustRated] = useState(false);
  const [notes, setNotes] = useState('');
  const [savingFeedback, setSavingFeedback] = useState(false);
  const [creatingList, setCreatingList] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

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
      addToast('Could not delete that recipe. Try again?', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleCreateList = async () => {
    if (!recipe) return;

    setCreatingList(true);
    try {
      const list = await groceryService.createGroceryListFromRecipes([recipe.id]);
      navigate(`/grocery/${list.id}`);
    } catch (error) {
      console.error('Failed to create grocery list:', error);
      addToast('Could not create a grocery list. Try again?', 'error');
    } finally {
      setCreatingList(false);
    }
  };

  const handleSaveFeedback = async () => {
    if (!recipe) return;

    setSavingFeedback(true);
    try {
      const feedback: RecipeFeedback = {
        liked,
        rating: rating > 0 ? rating : undefined,
        notes: notes.trim() || undefined,
      };

      await recipeService.addFeedback(recipe.id, feedback);
      addToast('Saved! Thanks for the notes.', 'success');
    } catch (error) {
      console.error('Failed to save feedback:', error);
      addToast('Could not save your notes. Try again?', 'error');
    } finally {
      setSavingFeedback(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div
          className="animate-spin rounded-full h-12 w-12 border-b-2"
          style={{ borderBottomColor: 'var(--primary)' }}
        ></div>
      </div>
    );
  }

  if (!recipe) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Breadcrumbs */}
      <Breadcrumbs items={[{ label: 'Recipe Vault', href: '/recipes' }, { label: recipe.name }]} />

      <div className="surface p-6 lg:p-8">
        {/* Header section - responsive layout */}
        <div className="mb-4">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
            <div className="flex-1">
              <h1 className="font-display text-3xl font-semibold text-stone-900">{recipe.name}</h1>
              {recipe.description && <p className="mt-2 text-stone-600">{recipe.description}</p>}
            </div>

            {/* Action buttons - stack on mobile, inline on desktop */}
            <div className="flex items-center gap-3 lg:ml-4">
              <button
                onClick={handleCreateList}
                disabled={creatingList}
                className="btn-primary flex items-center disabled:opacity-50 flex-1 lg:flex-none justify-center"
              >
                <ShoppingBagIcon className="h-4 w-4 mr-2" />
                {creatingList ? 'Building list...' : 'Add to grocery list'}
              </button>
              <button
                onClick={() => setShowDeleteDialog(true)}
                disabled={deleting}
                className="icon-button-danger disabled:opacity-50"
                title="Delete recipe"
              >
                <TrashIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Source URLs */}
          {recipe.source_urls && recipe.source_urls.length > 0 && (
            <div className="mt-4 p-4 rounded-2xl surface-warm">
              <div className="flex items-center space-x-2 mb-2">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  style={{ color: 'var(--primary)' }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                  />
                </svg>
                <span className="text-sm font-medium" style={{ color: 'var(--primary-hover)' }}>
                  {recipe.source_urls.length === 1
                    ? 'Inspired by:'
                    : `Inspired by ${recipe.source_urls.length} sources:`}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {recipe.source_urls.map((url, index) => {
                  // Extract domain name from URL
                  const getDomainName = (urlStr: string) => {
                    try {
                      const domain = new URL(urlStr).hostname.replace('www.', '');
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
                      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white border transition-colors duration-200 hover:bg-primary-soft"
                      style={{ color: 'var(--primary)', borderColor: 'var(--primary-soft)' }}
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

        <div className="mt-4 flex items-center text-sm text-stone-500 space-x-4">
          <div className="flex items-center">
            <ClockIcon className="h-5 w-5 mr-1" />
            {(recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0)} minutes
          </div>
          <div className="flex items-center">
            <UserGroupIcon className="h-5 w-5 mr-1" />
            {recipe.servings} servings
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <SectionCard title="Ingredients">
            <ul className="space-y-2">
              {recipe.ingredients.map((ingredient, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-stone-700">
                    {ingredient.quantity} {ingredient.unit} {ingredient.name}
                    {ingredient.notes && (
                      <span className="text-stone-500"> ({ingredient.notes})</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard title="Nutrition snapshot">
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
              {!recipe.nutrition.calories &&
                !recipe.nutrition.protein_g &&
                !recipe.nutrition.carbs_g &&
                !recipe.nutrition.fat_g && (
                  <p className="col-span-2 text-stone-500">No nutrition estimate available.</p>
                )}
            </div>
          </SectionCard>
        </div>

        <SectionCard title="Steps" className="mt-8">
          <ol className="space-y-3">
            {recipe.instructions.map((instruction, index) => (
              <li key={index} className="flex">
                <span className="font-semibold mr-3" style={{ color: 'var(--primary)' }}>
                  {index + 1}.
                </span>
                <span className="text-stone-700">{instruction}</span>
              </li>
            ))}
          </ol>
        </SectionCard>

        {/* Rating and Feedback Section - After cooking */}
        <SectionCard
          title="How did it go?"
          subtitle="Made this recipe? Let us know what you thought."
          className="mt-8"
        >
          <p className="text-sm text-stone-500 mb-4">
            Your feedback helps improve future recommendations.
          </p>

          <div className="flex flex-wrap items-center gap-6 mb-4">
            {/* Like button with heartbeat */}
            <button
              onClick={() => {
                if (!liked) {
                  setJustLiked(true);
                  setTimeout(() => setJustLiked(false), 600);
                }
                setLiked(!liked);
              }}
              className="flex items-center space-x-2 group"
            >
              {liked ? (
                <HeartSolidIcon
                  className={`h-6 w-6 text-red-500 transition-transform ${justLiked ? 'animate-heartbeat' : ''}`}
                />
              ) : (
                <HeartIcon className="h-6 w-6 text-stone-400 group-hover:text-red-500 group-hover:scale-110 transition-all duration-200" />
              )}
              <span
                className={`text-sm transition-colors ${liked ? 'text-red-600 font-medium' : 'text-stone-600'}`}
              >
                {liked ? 'Loved it!' : 'Like'}
              </span>
            </button>

            {/* Star rating with bounce animation */}
            <div className="flex items-center space-x-1">
              {[1, 2, 3, 4, 5].map((star, idx) => (
                <button
                  key={star}
                  onClick={() => {
                    setRating(star);
                    setJustRated(true);
                    setTimeout(() => setJustRated(false), 500);
                  }}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="p-1 transition-transform duration-150 hover:scale-125"
                >
                  {star <= (hoveredRating || rating) ? (
                    <StarSolidIcon
                      className={`h-6 w-6 text-yellow-400 ${
                        justRated && star <= rating ? 'animate-bounce-in' : ''
                      }`}
                      style={justRated ? { animationDelay: `${idx * 50}ms` } : undefined}
                    />
                  ) : (
                    <StarIcon className="h-6 w-6 text-stone-300" />
                  )}
                </button>
              ))}
              {rating > 0 && (
                <span className="ml-2 text-sm text-stone-600 animate-fade-in">
                  {rating} star{rating > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="mb-4">
            <label htmlFor="notes" className="block text-sm font-medium text-stone-700 mb-1">
              Notes (optional)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              className="input"
              placeholder="Any tweaks for next time?"
            />
          </div>

          <button onClick={handleSaveFeedback} disabled={savingFeedback} className="btn-primary">
            {savingFeedback ? 'Saving...' : 'Save notes'}
          </button>
        </SectionCard>
      </div>

      <ConfirmDialog
        isOpen={showDeleteDialog}
        title="Delete recipe?"
        description="This will permanently remove the recipe and any saved feedback."
        confirmLabel="Delete recipe"
        tone="danger"
        loading={deleting}
        onCancel={() => {
          if (!deleting) {
            setShowDeleteDialog(false);
          }
        }}
        onConfirm={handleDelete}
      />
    </div>
  );
}
