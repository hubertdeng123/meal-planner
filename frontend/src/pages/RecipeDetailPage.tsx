import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ClockIcon,
  UserGroupIcon,
  TrashIcon,
  StarIcon,
  HeartIcon,
  ShoppingBagIcon,
  StarSolidIcon,
  HeartSolidIcon,
  CheckIcon,
  CalendarDaysIcon,
  BoltIcon,
  GlobeAltIcon,
} from '../components/ui/AppIcons';
import recipeService from '../services/recipe.service';
import groceryService from '../services/grocery.service';
import Breadcrumbs from '../components/Breadcrumbs';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { SectionCard } from '../components/ui/SectionCard';
import { StatPill } from '../components/ui/StatPill';
import { useToast } from '../contexts/ToastContext';
import type { Recipe, RecipeFeedback } from '../types';

function formatScaledQuantity(quantity: number, multiplier: number): string {
  const scaled = quantity * multiplier;
  if (!Number.isFinite(scaled) || scaled <= 0) {
    return String(quantity);
  }
  const rounded = Math.round(scaled * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : String(parseFloat(rounded.toFixed(2)));
}

export default function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  // Interactive Serving Scaler & Mise en Place state
  const [scaledServings, setScaledServings] = useState<number>(4);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());

  // Interactive Step-by-Step & Cook Mode state
  const [cookMode, setCookMode] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);

  // Cook's Rating & Notes state
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
        setScaledServings(data.servings > 0 ? data.servings : 4);
        setCheckedIngredients(new Set());
        setCompletedSteps(new Set());
        setActiveStepIndex(0);
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
      void loadRecipe(parseInt(id));
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

      const serviceWithOptionalAlias = recipeService as typeof recipeService & {
        submitFeedback?: (recipeId: number, data: RecipeFeedback) => Promise<unknown>;
      };

      if (typeof serviceWithOptionalAlias.submitFeedback === 'function') {
        await serviceWithOptionalAlias.submitFeedback(recipe.id, feedback);
      } else {
        await recipeService.addFeedback(recipe.id, feedback);
      }

      addToast('Saved! Thanks for the notes.', 'success');
    } catch (error) {
      console.error('Failed to save feedback:', error);
      addToast('Could not save your notes. Try again?', 'error');
    } finally {
      setSavingFeedback(false);
    }
  };

  const toggleIngredientCheck = (index: number) => {
    setCheckedIngredients(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleStepClick = (index: number) => {
    setActiveStepIndex(index);
    setCompletedSteps(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
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

  if (!recipe) {
    return null;
  }

  const prepMinutes = recipe.prep_time_minutes || 0;
  const cookMinutes = recipe.cook_time_minutes || 0;
  const totalMinutes = prepMinutes + cookMinutes;
  const baseServings = recipe.servings > 0 ? recipe.servings : 4;
  const scaleMultiplier = scaledServings / baseServings;
  const isScaled = scaledServings !== baseServings;

  const getDomainName = (urlStr: string, index: number) => {
    try {
      const domain = new URL(urlStr).hostname.replace('www.', '');
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
    <div className="max-w-5xl mx-auto">
      <Breadcrumbs items={[{ label: 'Recipe Vault', href: '/recipes' }, { label: recipe.name }]} />

      {/* Editorial Recipe Masthead */}
      <div className="surface p-6 sm:p-8 lg:p-10">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-6">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="badge">{recipe.source || 'AI Chef Edition'}</span>
              {totalMinutes > 0 && totalMinutes <= 30 && (
                <span className="inline-flex items-center gap-1 rounded-full border border-[#3F624D]/25 bg-[#ECF5F0] px-3 py-1 text-xs font-semibold text-[#2F6F4E]">
                  <BoltIcon className="h-3.5 w-3.5 text-[#2F6F4E]" />
                  Quick Dish
                </span>
              )}
            </div>

            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold text-[#1C1917] tracking-tight leading-[1.12]">
              {recipe.name}
            </h1>

            {recipe.description && (
              <p className="mt-3 text-base sm:text-lg text-[#57534E] leading-relaxed max-w-3xl">
                {recipe.description}
              </p>
            )}

            {recipe.tags && recipe.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {recipe.tags.map(tag => (
                  <span key={tag} className="chip">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Primary Actions */}
          <div className="flex flex-wrap items-center gap-2.5 lg:flex-shrink-0">
            <button
              onClick={handleCreateList}
              disabled={creatingList}
              className="btn-primary flex-1 sm:flex-none justify-center"
            >
              <ShoppingBagIcon className="h-4 w-4" />
              <span>{creatingList ? 'Building list...' : 'Add to grocery list'}</span>
            </button>

            <Link to="/meal-plans" className="btn-secondary flex-1 sm:flex-none justify-center">
              <CalendarDaysIcon className="h-4 w-4" />
              <span>Plan this meal</span>
            </Link>

            <button
              onClick={() => setShowDeleteDialog(true)}
              disabled={deleting}
              className="icon-button-danger border border-[#E7E0D6] bg-white p-2.5 disabled:opacity-50"
              title="Delete recipe"
              aria-label="Delete recipe"
            >
              <TrashIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Key Metadata Pills */}
        <div className="mt-6 pt-6 border-t border-[#E7E0D6] grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatPill label="Prep time" value={`${prepMinutes} min`} />
          <StatPill label="Cook time" value={`${cookMinutes} min`} />
          <StatPill
            label="Total time"
            value={
              <span className="inline-flex items-center gap-1.5">
                <ClockIcon className="h-4 w-4 text-[#C84B31]" />
                {totalMinutes} minutes
              </span>
            }
            tone="warm"
          />
          <StatPill
            label="Servings"
            value={
              <span className="inline-flex items-center gap-1.5">
                <UserGroupIcon className="h-4 w-4 text-[#2F6F4E]" />
                {scaledServings} servings
              </span>
            }
            tone={isScaled ? 'success' : 'default'}
          />
        </div>

        {/* Source URLs */}
        {recipe.source_urls && recipe.source_urls.length > 0 && (
          <div className="mt-5 p-4 rounded-2xl surface-warm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-[#9A3412]">
                <GlobeAltIcon className="h-4 w-4 text-[#C84B31]" />
                {recipe.source_urls.length === 1
                  ? 'Inspired by:'
                  : `Inspired by ${recipe.source_urls.length} sources:`}
              </span>
              {recipe.source_urls.map((url, index) => (
                <a
                  key={index}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-full border border-[#C84B31]/25 bg-white px-3 py-1 text-xs font-semibold text-[#9A3412] transition-colors hover:bg-[#FAF7F2]"
                >
                  <span>{getDomainName(url, index)}</span>
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Two-Column Editorial Cooking Layout */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Mise en Place Ingredients + Nutrition Snapshot */}
        <div className="lg:col-span-5 space-y-6">
          <SectionCard
            title="Ingredients"
            subtitle={
              recipe.ingredients.length > 0
                ? `${checkedIngredients.size} of ${recipe.ingredients.length} prepped`
                : 'Mise en place checklist'
            }
            action={
              checkedIngredients.size > 0 ? (
                <button
                  type="button"
                  onClick={() => setCheckedIngredients(new Set())}
                  className="text-xs font-semibold text-[#57534E] hover:text-[#1C1917]"
                >
                  Uncheck all
                </button>
              ) : null
            }
          >
            {/* Interactive Serving Scaler */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#E7E0D6] bg-[#FAF7F2] px-3.5 py-2.5">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[#57534E]">
                Scale Servings
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setScaledServings(prev => Math.max(1, prev - 1))}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#D6CEC2] bg-white text-sm font-semibold text-[#1C1917] hover:bg-[#F3EFE6] transition-colors"
                  aria-label="Decrease servings"
                >
                  -
                </button>
                <span className="min-w-[4.5rem] text-center text-sm font-semibold tabular-nums text-[#1C1917]">
                  {scaledServings} {scaledServings === 1 ? 'serving' : 'servings'}
                </span>
                <button
                  type="button"
                  onClick={() => setScaledServings(prev => prev + 1)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#D6CEC2] bg-white text-sm font-semibold text-[#1C1917] hover:bg-[#F3EFE6] transition-colors"
                  aria-label="Increase servings"
                >
                  +
                </button>
                {isScaled && (
                  <button
                    type="button"
                    onClick={() => setScaledServings(baseServings)}
                    className="ml-1 text-xs font-semibold text-[#C84B31] hover:text-[#B83B22] transition-colors"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* Checkable Ingredient Rows */}
            <ul className="space-y-2">
              {recipe.ingredients.map((ingredient, index) => {
                const isChecked = checkedIngredients.has(index);
                const scaledQuantity = formatScaledQuantity(ingredient.quantity, scaleMultiplier);

                return (
                  <li key={index}>
                    <button
                      type="button"
                      onClick={() => toggleIngredientCheck(index)}
                      aria-pressed={isChecked}
                      className={`w-full text-left flex items-start gap-3 rounded-2xl border px-3.5 py-2.5 transition-all duration-150 ${
                        isChecked
                          ? 'border-[#3F624D]/25 bg-[#ECF5F0]/65 text-[#78716C]'
                          : 'border-transparent bg-[#FAF7F2]/75 hover:border-[#E7E0D6] hover:bg-[#FAF7F2] text-[#1C1917]'
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border transition-colors ${
                          isChecked
                            ? 'border-[#2F6F4E] bg-[#2F6F4E] text-white'
                            : 'border-[#D6CEC2] bg-white'
                        }`}
                      >
                        {isChecked && <CheckIcon className="h-3 w-3 text-white" />}
                      </span>
                      <span
                        className={`text-sm leading-relaxed ${isChecked ? 'line-through' : ''}`}
                      >
                        <span className="font-semibold tabular-nums text-[#1C1917]">
                          {scaledQuantity} {ingredient.unit}
                        </span>{' '}
                        <span>{ingredient.name}</span>
                        {ingredient.notes && (
                          <span className="text-[#78716C]"> ({ingredient.notes})</span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </SectionCard>

          {/* Editorial Nutrition Snapshot */}
          <SectionCard title="Nutrition snapshot" subtitle="Estimated per serving">
            <div className="grid grid-cols-2 gap-3 text-sm tabular-nums">
              {recipe.nutrition?.calories !== undefined && (
                <div className="rounded-2xl border border-[#C84B31]/25 bg-[#F9F1EA] px-3.5 py-2.5">
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9A3412]">
                    Calories
                  </span>
                  <span className="mt-0.5 block text-base font-semibold text-[#1C1917]">
                    {recipe.nutrition.calories}
                  </span>
                </div>
              )}
              {recipe.nutrition?.protein_g !== undefined && (
                <div className="rounded-2xl border border-[#3F624D]/25 bg-[#ECF5F0] px-3.5 py-2.5">
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#2F6F4E]">
                    Protein
                  </span>
                  <span className="mt-0.5 block text-base font-semibold text-[#1C1917]">
                    {recipe.nutrition.protein_g}g
                  </span>
                </div>
              )}
              {recipe.nutrition?.carbs_g !== undefined && (
                <div className="rounded-2xl border border-[#E7E0D6] bg-[#FAF7F2] px-3.5 py-2.5">
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#78716C]">
                    Carbs
                  </span>
                  <span className="mt-0.5 block text-base font-semibold text-[#1C1917]">
                    {recipe.nutrition.carbs_g}g
                  </span>
                </div>
              )}
              {recipe.nutrition?.fat_g !== undefined && (
                <div className="rounded-2xl border border-[#E7E0D6] bg-[#FAF7F2] px-3.5 py-2.5">
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#78716C]">
                    Fat
                  </span>
                  <span className="mt-0.5 block text-base font-semibold text-[#1C1917]">
                    {recipe.nutrition.fat_g}g
                  </span>
                </div>
              )}
              {recipe.nutrition?.fiber_g !== undefined && (
                <div className="rounded-2xl border border-[#E7E0D6] bg-[#FAF7F2] px-3.5 py-2.5">
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#78716C]">
                    Fiber
                  </span>
                  <span className="mt-0.5 block text-base font-semibold text-[#1C1917]">
                    {recipe.nutrition.fiber_g}g
                  </span>
                </div>
              )}
              {recipe.nutrition?.sugar_g !== undefined && (
                <div className="rounded-2xl border border-[#E7E0D6] bg-[#FAF7F2] px-3.5 py-2.5">
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#78716C]">
                    Sugar
                  </span>
                  <span className="mt-0.5 block text-base font-semibold text-[#1C1917]">
                    {recipe.nutrition.sugar_g}g
                  </span>
                </div>
              )}
              {recipe.nutrition?.sodium_mg !== undefined && (
                <div className="rounded-2xl border border-[#E7E0D6] bg-[#FAF7F2] px-3.5 py-2.5">
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#78716C]">
                    Sodium
                  </span>
                  <span className="mt-0.5 block text-base font-semibold text-[#1C1917]">
                    {recipe.nutrition.sodium_mg}mg
                  </span>
                </div>
              )}
              {recipe.nutrition?.calories === undefined &&
                recipe.nutrition?.protein_g === undefined &&
                recipe.nutrition?.carbs_g === undefined &&
                recipe.nutrition?.fat_g === undefined &&
                recipe.nutrition?.fiber_g === undefined &&
                recipe.nutrition?.sugar_g === undefined &&
                recipe.nutrition?.sodium_mg === undefined && (
                  <p className="col-span-2 text-sm text-[#78716C]">
                    No nutrition estimate available.
                  </p>
                )}
            </div>
          </SectionCard>
        </div>

        {/* Right Column: Interactive Steps + Cook's Rating & Notes */}
        <div className="lg:col-span-7 space-y-6">
          <SectionCard
            title="Steps"
            subtitle={
              recipe.instructions.length > 0
                ? `Step ${Math.min(activeStepIndex + 1, recipe.instructions.length)} of ${recipe.instructions.length}${
                    completedSteps.size > 0 ? ` · ${completedSteps.size} completed` : ''
                  }`
                : undefined
            }
            action={
              <button
                type="button"
                onClick={() => setCookMode(prev => !prev)}
                aria-pressed={cookMode}
                className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  cookMode
                    ? 'border-[#C84B31] bg-[#F9F1EA] text-[#9A3412]'
                    : 'border-[#D6CEC2] bg-white text-[#57534E] hover:bg-[#FAF7F2] hover:text-[#1C1917]'
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${cookMode ? 'bg-[#C84B31]' : 'bg-[#78716C]'}`}
                />
                {cookMode ? 'Cook Mode Active' : 'Cook Mode'}
              </button>
            }
          >
            <ol className="space-y-3.5">
              {recipe.instructions.map((instruction, index) => {
                const isCompleted = completedSteps.has(index);
                const isActive = activeStepIndex === index;

                return (
                  <li key={index}>
                    <div
                      onClick={() => handleStepClick(index)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleStepClick(index);
                        }
                      }}
                      className={`flex items-start gap-4 rounded-2xl border p-4 cursor-pointer transition-all duration-150 ${
                        isCompleted
                          ? 'border-[#3F624D]/25 bg-[#ECF5F0]/60'
                          : isActive && cookMode
                            ? 'border-[#C84B31] bg-[#F9F1EA]/70 shadow-xs'
                            : 'border-[#E7E0D6] bg-[#FAF7F2]/65 hover:border-[#D6CEC2] hover:bg-[#FAF7F2]'
                      }`}
                    >
                      <span
                        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular-nums transition-colors ${
                          isCompleted
                            ? 'bg-[#2F6F4E] text-white'
                            : isActive && cookMode
                              ? 'bg-[#C84B31] text-white'
                              : 'border border-[#D6CEC2] bg-white text-[#9A3412]'
                        }`}
                      >
                        {isCompleted ? <CheckIcon className="h-4 w-4 text-white" /> : index + 1}
                      </span>
                      <span
                        className={`flex-1 pt-0.5 ${
                          cookMode ? 'text-lg leading-relaxed' : 'text-base leading-relaxed'
                        } ${isCompleted ? 'line-through text-[#78716C]' : 'text-[#1C1917]'}`}
                      >
                        {instruction}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ol>
          </SectionCard>

          {/* Cook's Rating & Notes Section */}
          <SectionCard
            title="How did it go?"
            subtitle="Made this recipe? Record your rating and kitchen adjustments for next time."
          >
            <p className="text-sm text-[#57534E] mb-4">
              Your feedback tunes the AI Chef to your taste profile.
            </p>

            <div className="flex flex-wrap items-center gap-6 mb-5">
              {/* Like toggle */}
              <button
                type="button"
                onClick={() => {
                  if (!liked) {
                    setJustLiked(true);
                    setTimeout(() => setJustLiked(false), 600);
                  }
                  setLiked(!liked);
                }}
                aria-pressed={liked}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all ${
                  liked
                    ? 'border-[#C84B31]/30 bg-[#F9F1EA] text-[#9A3412]'
                    : 'border-[#D6CEC2] bg-white text-[#57534E] hover:bg-[#FAF7F2] hover:text-[#1C1917]'
                }`}
              >
                {liked ? (
                  <HeartSolidIcon
                    className={`h-5 w-5 text-[#C84B31] transition-transform ${
                      justLiked ? 'animate-heartbeat' : ''
                    }`}
                  />
                ) : (
                  <HeartIcon className="h-5 w-5 text-[#78716C]" />
                )}
                <span>{liked ? 'Loved it!' : 'Like'}</span>
              </button>

              {/* Star rating */}
              <div className="flex items-center gap-1" role="group" aria-label="Recipe star rating">
                {[1, 2, 3, 4, 5].map((star, idx) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => {
                      setRating(star);
                      setJustRated(true);
                      setTimeout(() => setJustRated(false), 500);
                    }}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className="p-1 transition-transform duration-150 hover:scale-110"
                    aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                  >
                    {star <= (hoveredRating || rating) ? (
                      <StarSolidIcon
                        className={`h-6 w-6 text-[#B45309] ${
                          justRated && star <= rating ? 'animate-bounce-in' : ''
                        }`}
                        style={justRated ? { animationDelay: `${idx * 50}ms` } : undefined}
                      />
                    ) : (
                      <StarIcon className="h-6 w-6 text-[#D6CEC2]" />
                    )}
                  </button>
                ))}
                {rating > 0 && (
                  <span className="ml-2 text-sm font-medium text-[#57534E] tabular-nums animate-fade-in">
                    {rating} star{rating > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>

            <div className="mb-4">
              <label htmlFor="notes" className="block text-sm font-semibold text-[#1C1917] mb-1.5">
                Notes (optional)
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                className="input"
                placeholder="Any tweaks, substitutions, or timing notes for next time?"
              />
            </div>

            <button onClick={handleSaveFeedback} disabled={savingFeedback} className="btn-primary">
              {savingFeedback ? 'Saving...' : 'Save notes'}
            </button>
          </SectionCard>
        </div>
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
