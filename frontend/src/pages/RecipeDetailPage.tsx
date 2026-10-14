import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeftIcon,
  CalendarDaysIcon,
  CheckCircleSolidIcon,
  ClockIcon,
  GlobeAltIcon,
  HeartIcon,
  HeartSolidIcon,
  PlayIcon,
  ShoppingBagIcon,
  StarIcon,
  StarSolidIcon,
  TrashIcon,
} from '../components/ui/AppIcons';
import recipeService from '../services/recipe.service';
import groceryService from '../services/grocery.service';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { ErrorState } from '../components/ui/ErrorState';
import { EmptyState } from '../components/ui/EmptyState';
import { OverflowMenu } from '../components/ui/OverflowMenu';
import { RecipeCover } from '../components/ui/RecipeCover';
import { Stepper } from '../components/ui/Stepper';
import { CookMode } from '../components/recipe/CookMode';
import { IngredientChecklist } from '../components/recipe/IngredientChecklist';
import { NutritionTiles } from '../components/recipe/NutritionTiles';
import { AddToPlanDialog } from '../components/mealplan/AddToPlanDialog';
import { useToast } from '../contexts/ToastContext';
import type { Recipe, RecipeFeedbackResponse } from '../types';
import { capitalize, formatMinutes, hasNutrition, totalMinutes } from '../utils/recipe';

type LoadState = 'loading' | 'ready' | 'not-found' | 'error';

function sourceLabel(url: string, index: number): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return `Source ${index + 1}`;
  }
}

function isNotFound(error: unknown): boolean {
  const status = (error as { response?: { status?: number } })?.response?.status;
  return status === 404;
}

export default function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const recipeId = Number(id);
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [servings, setServings] = useState(1);
  const [checked, setChecked] = useState<Set<number>>(() => new Set());
  const [cookStep, setCookStep] = useState<number | null>(null);
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [creatingList, setCreatingList] = useState(false);

  const [savedFeedback, setSavedFeedback] = useState<RecipeFeedbackResponse | null>(null);
  const [liked, setLiked] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [notes, setNotes] = useState('');
  const [savingFeedback, setSavingFeedback] = useState(false);

  const applyFeedback = (feedback: RecipeFeedbackResponse | null) => {
    setSavedFeedback(feedback);
    setLiked(feedback?.liked ?? false);
    setRating(feedback?.rating ?? 0);
    setNotes(feedback?.notes ?? '');
  };

  const load = useCallback(async () => {
    if (!Number.isFinite(recipeId)) {
      setLoadState('not-found');
      return;
    }
    setLoadState('loading');
    try {
      const data = await recipeService.getRecipe(recipeId);
      setRecipe(data);
      setServings(Math.max(1, data.servings || 1));
      setChecked(new Set());
      let feedback = data.feedback ?? null;
      if (data.feedback === undefined) {
        try {
          feedback = await recipeService.getFeedback(recipeId);
        } catch {
          feedback = null;
        }
      }
      applyFeedback(feedback);
      setLoadState('ready');
    } catch (error) {
      console.error('Failed to load recipe:', error);
      setLoadState(isNotFound(error) ? 'not-found' : 'error');
    }
  }, [recipeId]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleIngredient = useCallback((index: number) => {
    setChecked(current => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  const closeCookMode = useCallback(() => setCookStep(null), []);

  if (loadState === 'loading') {
    return <RecipeDetailSkeleton />;
  }

  if (loadState === 'not-found') {
    return (
      <EmptyState
        title="We couldn't find that recipe"
        description="It may have been deleted, or the link is out of date."
        action={
          <Link to="/recipes" className="btn-primary">
            Back to recipes
          </Link>
        }
      />
    );
  }

  if (loadState === 'error' || !recipe) {
    return (
      <ErrorState
        title="Couldn't load this recipe"
        description="Check your connection and try again."
        onRetry={() => void load()}
      />
    );
  }

  const baseServings = Math.max(1, recipe.servings || 1);
  const scale = servings / baseServings;
  const minutes = recipe.total_minutes ?? totalMinutes(recipe);
  const eyebrow = [recipe.cuisine, recipe.difficulty].filter(Boolean).map(v => capitalize(v!));
  const canCook = recipe.instructions.length > 0;
  const displayRating = hoveredRating || rating;
  const feedbackDirty =
    liked !== (savedFeedback?.liked ?? false) ||
    rating !== (savedFeedback?.rating ?? 0) ||
    notes.trim() !== (savedFeedback?.notes ?? '').trim();

  const handleCreateList = async () => {
    setCreatingList(true);
    try {
      const list = await groceryService.createGroceryListFromRecipes([recipe.id]);
      navigate(`/grocery/${list.id}`);
    } catch (error) {
      console.error('Failed to create grocery list:', error);
      addToast('Could not create a grocery list. Try again?', 'error');
      setCreatingList(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await recipeService.deleteRecipe(recipe.id);
      addToast(`Deleted ${recipe.name}`, 'success');
      navigate('/recipes');
    } catch (error) {
      console.error('Failed to delete recipe:', error);
      addToast('Could not delete that recipe. Try again?', 'error');
      setDeleting(false);
    }
  };

  const handleSaveFeedback = async () => {
    setSavingFeedback(true);
    try {
      const saved = await recipeService.addFeedback(recipe.id, {
        liked,
        rating: rating > 0 ? rating : undefined,
        notes: notes.trim() || undefined,
      });
      applyFeedback(saved);
      addToast('Saved. Future suggestions will take this into account.', 'success');
    } catch (error) {
      console.error('Failed to save feedback:', error);
      addToast('Could not save your notes. Try again?', 'error');
    } finally {
      setSavingFeedback(false);
    }
  };

  const handleFinishCooking = () => {
    setCookStep(null);
    document.getElementById('feedback')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    addToast('Nice work. How did it turn out?', 'success');
  };

  const stats = [
    minutes > 0 && { label: 'Total', value: formatMinutes(minutes) },
    recipe.prep_time_minutes && { label: 'Prep', value: formatMinutes(recipe.prep_time_minutes) },
    recipe.cook_time_minutes && { label: 'Cook', value: formatMinutes(recipe.cook_time_minutes) },
    { label: 'Serves', value: String(baseServings) },
    recipe.ingredients.length > 0 && {
      label: 'Ingredients',
      value: String(recipe.ingredients.length),
    },
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  return (
    <div className="mx-auto max-w-5xl animate-fade-in">
      <Link
        to="/recipes"
        className="mb-4 inline-flex items-center gap-1.5 rounded-lg text-sm font-medium text-stone-500 transition hover:text-stone-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-soft"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Recipes
      </Link>

      <header className="surface overflow-hidden">
        <div className="grid md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <RecipeCover
            name={recipe.name}
            imageUrl={recipe.image_url}
            size="lg"
            className="h-44 md:h-full md:min-h-[18rem]"
          />
          <div className="flex flex-col p-5 sm:p-7">
            {eyebrow.length > 0 && <p className="eyebrow">{eyebrow.join(' · ')}</p>}
            <div className="mt-1 flex items-start gap-3">
              <h1 className="page-title flex-1">{recipe.name}</h1>
              {savedFeedback?.liked && (
                <span className="mt-1 text-red-500" title="You loved this">
                  <HeartSolidIcon className="h-6 w-6" aria-hidden="true" />
                  <span className="sr-only">You loved this</span>
                </span>
              )}
            </div>
            {recipe.description && (
              <p className="mt-2 text-[15px] leading-relaxed text-stone-600">
                {recipe.description}
              </p>
            )}

            <dl className="mt-5 flex flex-wrap gap-x-6 gap-y-3">
              {stats.map(stat => (
                <div key={stat.label}>
                  <dt className="text-xs font-medium uppercase tracking-wide text-stone-400">
                    {stat.label}
                  </dt>
                  <dd className="mt-0.5 text-base font-semibold text-stone-900">{stat.value}</dd>
                </div>
              ))}
            </dl>

            {recipe.tags.length > 0 && (
              <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Tags">
                {recipe.tags.map(tag => (
                  <li key={tag} className="tag">
                    {tag}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-2 md:mt-auto md:pt-6">
              {canCook && (
                <button
                  type="button"
                  onClick={() => setCookStep(0)}
                  className="btn-primary flex-1 sm:flex-none"
                >
                  <PlayIcon className="h-4 w-4" />
                  Start cooking
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowPlanDialog(true)}
                className="btn-secondary flex-1 sm:flex-none"
              >
                <CalendarDaysIcon className="h-4 w-4" />
                Add to plan
              </button>
              <button
                type="button"
                onClick={handleCreateList}
                disabled={creatingList}
                className="btn-secondary flex-1 sm:flex-none"
              >
                <ShoppingBagIcon className="h-4 w-4" />
                {creatingList ? 'Building list…' : 'Grocery list'}
              </button>
              <OverflowMenu
                label="More recipe actions"
                items={[
                  {
                    label: 'Delete recipe',
                    icon: TrashIcon,
                    tone: 'danger',
                    onSelect: () => setShowDeleteDialog(true),
                  },
                ]}
              />
            </div>
          </div>
        </div>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start">
        <section
          aria-labelledby="ingredients-heading"
          className="card p-5 sm:p-6 lg:sticky lg:top-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 id="ingredients-heading" className="section-title">
                Ingredients
              </h2>
              {recipe.ingredients.length > 0 && (
                <p className="helper-text mt-0.5" aria-live="polite">
                  {checked.size === recipe.ingredients.length
                    ? 'Everything gathered'
                    : `${checked.size} of ${recipe.ingredients.length} gathered`}
                </p>
              )}
            </div>
            <Stepper label="Servings" value={servings} onChange={setServings} min={1} max={24} />
          </div>
          {scale !== 1 && (
            <p className="mt-3 rounded-xl bg-primary-soft px-3 py-2 text-xs font-medium text-primary-ink">
              Scaled from {baseServings} to {servings} servings.{' '}
              <button
                type="button"
                onClick={() => setServings(baseServings)}
                className="underline underline-offset-2"
              >
                Reset
              </button>
            </p>
          )}
          <div className="mt-3">
            {recipe.ingredients.length > 0 ? (
              <IngredientChecklist
                ingredients={recipe.ingredients}
                checked={checked}
                onToggle={toggleIngredient}
                scale={scale}
              />
            ) : (
              <p className="helper-text">No ingredients listed.</p>
            )}
          </div>
        </section>

        <div className="space-y-6">
          <section aria-labelledby="method-heading" className="card p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 id="method-heading" className="section-title">
                Method
              </h2>
              {minutes > 0 && (
                <span className="inline-flex items-center gap-1 text-sm text-stone-500">
                  <ClockIcon className="h-4 w-4" />
                  {formatMinutes(minutes)}
                </span>
              )}
            </div>
            {canCook ? (
              <ol className="mt-4 space-y-1">
                {recipe.instructions.map((instruction, index) => (
                  <li key={index}>
                    <button
                      type="button"
                      onClick={() => setCookStep(index)}
                      className="group flex w-full gap-4 rounded-xl p-3 text-left transition hover:bg-stone-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-soft"
                    >
                      <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary-ink">
                        {index + 1}
                      </span>
                      <span className="flex-1 text-[15px] leading-relaxed text-stone-700">
                        {instruction}
                      </span>
                      <span className="sr-only">, open in cook mode</span>
                    </button>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="helper-text mt-3">No steps written for this recipe.</p>
            )}
          </section>

          {hasNutrition(recipe.nutrition) && (
            <section aria-labelledby="nutrition-heading" className="card p-5 sm:p-6">
              <h2 id="nutrition-heading" className="section-title">
                Nutrition <span className="font-normal text-stone-400">per serving</span>
              </h2>
              <div className="mt-4">
                <NutritionTiles nutrition={recipe.nutrition} />
              </div>
            </section>
          )}

          {recipe.source_urls.length > 0 && (
            <section aria-labelledby="sources-heading" className="surface-warm rounded-2xl p-5">
              <h2
                id="sources-heading"
                className="flex items-center gap-2 text-sm font-semibold text-stone-800"
              >
                <GlobeAltIcon className="h-4 w-4" />
                Inspired by
              </h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {recipe.source_urls.map((url, index) => (
                  <li key={url}>
                    <a href={url} target="_blank" rel="noopener noreferrer" className="chip">
                      {sourceLabel(url, index)}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section
            id="feedback"
            aria-labelledby="feedback-heading"
            className="card scroll-mt-6 p-5 sm:p-6"
          >
            <h2 id="feedback-heading" className="section-title">
              How did it go?
            </h2>
            <p className="helper-text mt-0.5">Your rating and notes shape what we suggest next.</p>

            <div className="mt-4 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => setLiked(value => !value)}
                aria-pressed={liked}
                className={`chip ${liked ? 'border-red-200 bg-red-50 text-red-600' : ''}`}
              >
                {liked ? (
                  <HeartSolidIcon className="h-4 w-4 animate-bounce-in" />
                ) : (
                  <HeartIcon className="h-4 w-4" />
                )}
                {liked ? 'Loved it' : 'Love it'}
              </button>

              <div
                role="radiogroup"
                aria-label="Rating"
                className="flex items-center"
                onMouseLeave={() => setHoveredRating(0)}
              >
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    role="radio"
                    aria-checked={rating === star}
                    aria-label={`${star} star${star > 1 ? 's' : ''}`}
                    onClick={() => setRating(rating === star ? 0 : star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    className="rounded-lg p-1.5 transition-transform hover:scale-110 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-soft"
                  >
                    {star <= displayRating ? (
                      <StarSolidIcon className="h-6 w-6 text-amber-400" />
                    ) : (
                      <StarIcon className="h-6 w-6 text-stone-300" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <label htmlFor="recipe-notes" className="label mt-4">
              Notes for next time
            </label>
            <textarea
              id="recipe-notes"
              value={notes}
              onChange={event => setNotes(event.target.value)}
              rows={3}
              className="input"
              placeholder="More garlic, less salt, swap in chicken thighs…"
            />

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleSaveFeedback}
                disabled={savingFeedback || !feedbackDirty}
                className="btn-primary"
              >
                {savingFeedback ? 'Saving…' : 'Save'}
              </button>
              {savedFeedback && !feedbackDirty && (
                <span className="inline-flex items-center gap-1.5 text-sm text-stone-500">
                  <CheckCircleSolidIcon className="h-4 w-4 text-primary" />
                  Saved
                </span>
              )}
            </div>
          </section>
        </div>
      </div>

      {cookStep !== null && (
        <CookMode
          title={recipe.name}
          steps={recipe.instructions}
          ingredients={recipe.ingredients}
          checked={checked}
          onToggleIngredient={toggleIngredient}
          scale={scale}
          initialStep={cookStep}
          onClose={closeCookMode}
          onFinish={handleFinishCooking}
        />
      )}

      {showPlanDialog && (
        <AddToPlanDialog
          recipe={{ id: recipe.id, name: recipe.name, servings }}
          onClose={() => setShowPlanDialog(false)}
        />
      )}

      <ConfirmDialog
        isOpen={showDeleteDialog}
        title="Delete this recipe?"
        description="It will be removed from your recipes, meal plans and saved notes. This can't be undone."
        confirmLabel="Delete recipe"
        tone="danger"
        loading={deleting}
        onCancel={() => {
          if (!deleting) setShowDeleteDialog(false);
        }}
        onConfirm={handleDelete}
      />
    </div>
  );
}

function RecipeDetailSkeleton() {
  return (
    <div className="mx-auto max-w-5xl" role="status" aria-label="Loading recipe">
      <div className="skeleton mb-4 h-4 w-20" />
      <div className="surface grid overflow-hidden md:grid-cols-[2fr_3fr]">
        <div className="skeleton h-44 rounded-none md:h-72" />
        <div className="space-y-3 p-7">
          <div className="skeleton h-3 w-24" />
          <div className="skeleton h-8 w-3/4" />
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-2/3" />
          <div className="flex gap-6 pt-4">
            <div className="skeleton h-10 w-16" />
            <div className="skeleton h-10 w-16" />
            <div className="skeleton h-10 w-16" />
          </div>
        </div>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_3fr]">
        <div className="card space-y-3 p-5">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="skeleton h-5 w-full" />
          ))}
        </div>
        <div className="card space-y-3 p-5">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="skeleton h-12 w-full" />
          ))}
        </div>
      </div>
      <span className="sr-only">Loading recipe…</span>
    </div>
  );
}
