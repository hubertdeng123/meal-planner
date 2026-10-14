import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useRecipeStream } from '../hooks/useRecipeStream';
import groceryService from '../services/grocery.service';
import pantryService from '../services/pantry.service';
import type { Recipe, RecipeDraft, RecipeGenerationRequest, ServerStreamStage } from '../types';
import { useToast } from '../contexts/ToastContext';
import { RecipeBrief } from '../components/generate/RecipeBrief';
import { StageTimeline } from '../components/generate/StageTimeline';
import { ChefNotes } from '../components/generate/ChefNotes';
import { LiveRecipeCard } from '../components/generate/LiveRecipeCard';
import { describeBrief, normalizeBrief } from '../components/generate/brief';
import { formatElapsed, isPipelineStage } from '../components/generate/pipeline';
import { AddToPlanDialog } from '../components/mealplan/AddToPlanDialog';
import {
  ArrowPathIcon,
  ArrowRightIcon,
  CalendarDaysIcon,
  CheckCircleSolidIcon,
  ExclamationTriangleIcon,
  PencilIcon,
  ShoppingBagIcon,
  SparklesIcon,
  StopIcon,
} from '../components/ui/AppIcons';
import { Spinner } from '../components/ui/PageLoader';
import { daysFromToday } from '../utils/date';

const EMPTY_BRIEF: RecipeGenerationRequest = {
  meal_type: '',
  cuisine: '',
  difficulty: '',
  max_time_minutes: undefined,
  ingredients_to_use: [],
  ingredients_to_avoid: [],
  dietary_restrictions: [],
  servings: 4,
  search_online: true,
  comments: '',
};

function readPantryPrefill(search: string): string[] {
  return new URLSearchParams(search)
    .getAll('use')
    .flatMap(value => value.split(','))
    .map(value => value.trim())
    .filter(Boolean);
}

function recipeToDraft(recipe: Recipe): RecipeDraft {
  return {
    name: recipe.name,
    description: recipe.description,
    cuisine: recipe.cuisine ?? undefined,
    ingredients: recipe.ingredients,
    instructions: recipe.instructions,
    prep_time_minutes: recipe.prep_time_minutes,
    cook_time_minutes: recipe.cook_time_minutes,
    servings: recipe.servings,
    tags: recipe.tags,
    nutrition: recipe.nutrition,
    source_urls: recipe.source_urls,
  };
}

export default function GenerateRecipePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const stream = useRecipeStream();
  const { stage, thinking, draft, recipe, error, elapsedMs, start, cancel, reset } = stream;

  const [brief, setBrief] = useState<RecipeGenerationRequest>(() => {
    const prefill = readPantryPrefill(location.search);
    return { ...EMPTY_BRIEF, ingredients_to_use: Array.from(new Set(prefill)) };
  });
  const [submittedBrief, setSubmittedBrief] = useState<RecipeGenerationRequest | null>(null);
  const [pantrySuggestions, setPantrySuggestions] = useState<string[]>([]);
  const [lastPipelineStage, setLastPipelineStage] = useState<ServerStreamStage>('context');
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [buildingList, setBuildingList] = useState(false);

  if (isPipelineStage(stage) && stage !== lastPipelineStage) {
    setLastPipelineStage(stage);
  }

  const [prefillSearch, setPrefillSearch] = useState(location.search);
  if (location.search !== prefillSearch) {
    setPrefillSearch(location.search);
    const prefill = readPantryPrefill(location.search);
    if (prefill.length > 0) {
      setBrief(prev => ({
        ...prev,
        ingredients_to_use: Array.from(new Set([...prev.ingredients_to_use, ...prefill])),
      }));
    }
  }

  useEffect(() => {
    let cancelled = false;
    const loadPantry = async () => {
      try {
        const result = await pantryService.getPantryItems({
          page: 1,
          pageSize: 8,
          sort: 'expires_at',
          order: 'asc',
        });
        if (cancelled) return;
        const soonest = result.items
          .filter(item => !item.expires_at || daysFromToday(item.expires_at) >= -1)
          .map(item => item.name);
        setPantrySuggestions(soonest.slice(0, 6));
      } catch {
        // Suggestions are optional; the brief works without them.
      }
    };
    void loadPantry();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = () => {
    const request = normalizeBrief(brief);
    setSubmittedBrief(brief);
    setLastPipelineStage('context');
    start(request);
    window.scrollTo({ top: 0 });
  };

  const handleRetry = () => {
    if (!submittedBrief) return;
    setLastPipelineStage('context');
    start(normalizeBrief(submittedBrief));
  };

  const handleCancel = () => {
    cancel();
    reset();
    addToast('Stopped. Your brief is still here.', 'info');
  };

  const handleEditBrief = () => reset();

  const handleBuildList = async () => {
    if (!recipe) return;
    setBuildingList(true);
    try {
      const list = await groceryService.createGroceryListFromRecipes([recipe.id]);
      navigate(`/grocery/${list.id}`);
    } catch (listError) {
      console.error('Failed to build grocery list:', listError);
      addToast('Could not build a grocery list. Try again?', 'error');
      setBuildingList(false);
    }
  };

  const displayDraft = useMemo(() => (recipe ? recipeToDraft(recipe) : draft), [recipe, draft]);

  if (stage === 'idle') {
    return (
      <div>
        <header className="mb-8">
          <p className="eyebrow mb-2">Cook</p>
          <h1 className="page-title">What are we making?</h1>
          <p className="page-subtitle">
            Pick a few things or none at all. We&apos;ll build a recipe around your kitchen and show
            you every step as it comes together.
          </p>
        </header>
        <RecipeBrief
          brief={brief}
          onChange={setBrief}
          onSubmit={handleSubmit}
          pantrySuggestions={pantrySuggestions}
        />
      </div>
    );
  }

  const isRunning = isPipelineStage(stage);
  const isComplete = stage === 'complete' && recipe;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="eyebrow mb-2 flex items-center gap-2">
            {isRunning && (
              <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse-soft" />
            )}
            {isComplete ? 'Saved to your vault' : stage === 'error' ? 'Interrupted' : 'Cooking'}
            <span className="font-medium normal-case tracking-normal text-stone-400">
              · {formatElapsed(elapsedMs)}
            </span>
          </p>
          <h1 className="page-title">
            {isComplete
              ? 'Ready when you are'
              : stage === 'error'
                ? 'That didn’t land'
                : 'Building your recipe'}
          </h1>
          {submittedBrief && <p className="page-subtitle">{describeBrief(submittedBrief)}</p>}
        </div>
        {isRunning && (
          <button type="button" onClick={handleCancel} className="btn-secondary flex-shrink-0">
            <StopIcon className="h-4 w-4" />
            Stop
          </button>
        )}
      </header>

      {stage === 'error' && error && (
        <div
          role="alert"
          className="flex flex-col gap-4 rounded-2xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center animate-slide-in-up"
        >
          <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0 text-red-500" />
          <p className="flex-1 text-sm text-red-800">{error.message}</p>
          <div className="flex gap-2">
            <button type="button" onClick={handleEditBrief} className="btn-secondary btn-sm">
              <PencilIcon className="h-3.5 w-3.5" />
              Edit brief
            </button>
            {error.retryable && (
              <button type="button" onClick={handleRetry} className="btn-primary btn-sm">
                <ArrowPathIcon className="h-3.5 w-3.5" />
                Try again
              </button>
            )}
          </div>
        </div>
      )}

      {isComplete && (
        <div className="surface flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5 animate-slide-in-up">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <CheckCircleSolidIcon className="h-8 w-8 flex-shrink-0 text-primary animate-bounce-in" />
            <div className="min-w-0">
              <p className="truncate font-semibold text-stone-900">{recipe.name}</p>
              <p className="text-sm text-stone-500">What&apos;s next?</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
            <Link to={`/recipes/${recipe.id}`} className="btn-primary col-span-2 sm:order-last">
              Open recipe
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
            <button type="button" className="btn-secondary" onClick={() => setShowPlanDialog(true)}>
              <CalendarDaysIcon className="h-4 w-4" />
              Add to plan
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleBuildList}
              disabled={buildingList}
            >
              {buildingList ? (
                <Spinner className="h-4 w-4" />
              ) : (
                <ShoppingBagIcon className="h-4 w-4" />
              )}
              Grocery list
            </button>
            <button type="button" className="btn-ghost col-span-2 sm:col-span-1" onClick={reset}>
              <SparklesIcon className="h-4 w-4" />
              Make another
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <div className="space-y-4 lg:sticky lg:top-10 lg:self-start">
          <div className="surface p-4 lg:p-5">
            <StageTimeline stage={stage} lastPipelineStage={lastPipelineStage} />
          </div>
          <ChefNotes text={thinking} live={stage === 'thinking' || stage === 'context'} />
        </div>
        <LiveRecipeCard draft={displayDraft} stage={stage} />
      </div>

      {showPlanDialog && recipe && (
        <AddToPlanDialog recipe={recipe} onClose={() => setShowPlanDialog(false)} />
      )}
    </div>
  );
}
