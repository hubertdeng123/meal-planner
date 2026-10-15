import { useState, useEffect, useRef, useCallback, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import recipeService, { type StreamCallbacks } from '../services/recipe.service';
import type { RecipeGenerationRequest } from '../types';
import { RecipeForm } from '../components/recipe/RecipeForm';
import { LoadingModal } from '../components/LoadingModal';
import { PageHeader } from '../components/ui/PageHeader';
import { SectionCard } from '../components/ui/SectionCard';
import { CheckCircleIcon, SparklesIcon, BoltIcon } from '../components/ui/AppIcons';
import { useToast } from '../contexts/ToastContext';

interface InspirationPreset {
  id: string;
  label: string;
  subtitle: string;
  values: Partial<RecipeGenerationRequest>;
}

const INSPIRATION_PRESETS: InspirationPreset[] = [
  {
    id: 'weeknight-skillet',
    label: '25-Min Weeknight Skillet',
    subtitle: 'Fast, minimal cleanup',
    values: {
      meal_type: 'dinner',
      difficulty: 'easy',
      max_time_minutes: 25,
      comments: 'One-skillet weeknight dinner with crisp textures and minimal prep.',
    },
  },
  {
    id: 'mediterranean-bowl',
    label: 'Mediterranean Bowl',
    subtitle: 'Herbs, olive oil & grains',
    values: {
      meal_type: 'lunch',
      cuisine: 'Mediterranean',
      difficulty: 'easy',
      max_time_minutes: 30,
      comments: 'Bright Mediterranean grain bowl with fresh herbs and lemon-olive oil dressing.',
    },
  },
  {
    id: 'cozy-one-pot',
    label: 'Cozy One-Pot Comfort',
    subtitle: 'Warm & restorative',
    values: {
      meal_type: 'dinner',
      difficulty: 'easy',
      max_time_minutes: 45,
      comments: 'Cozy, deeply flavorful one-pot comfort meal with aromatic herbs.',
    },
  },
  {
    id: 'high-protein-pescatarian',
    label: 'High-Protein Pescatarian',
    subtitle: 'Light & nutrient-dense',
    values: {
      meal_type: 'dinner',
      cuisine: 'Japanese',
      difficulty: 'medium',
      max_time_minutes: 35,
      comments: 'High-protein pescatarian dish with balanced macros and clean flavors.',
    },
  },
];

function SuccessCelebration({
  recipeName,
  ingredientPreview,
  onComplete,
}: {
  recipeName: string;
  ingredientPreview?: string[];
  onComplete: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 1800);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="modal-overlay flex items-center justify-center p-4">
      <div className="glass-panel p-8 sm:p-10 text-center max-w-md w-full animate-scale-in">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-[#3F624D]/25 bg-[#ECF5F0] text-[#2F6F4E] animate-check-in">
          <CheckCircleIcon className="h-9 w-9 text-[#2F6F4E]" />
        </div>

        <p className="eyebrow text-[#2F6F4E] mb-1">Chef Studio Complete</p>
        <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[#1C1917] mb-2 animate-slide-in-up">
          Recipe Ready
        </h2>

        <p
          className="font-display text-lg font-medium text-[#C84B31] mb-3 animate-slide-in-up"
          style={{ animationDelay: '80ms' }}
        >
          {recipeName}
        </p>

        {ingredientPreview && ingredientPreview.length > 0 && (
          <p
            className="text-[#57534E] text-sm animate-slide-in-up"
            style={{ animationDelay: '140ms' }}
          >
            Featuring {ingredientPreview.slice(0, 3).join(', ')}
            {ingredientPreview.length > 3 && '...'}
          </p>
        )}
      </div>
    </div>
  );
}

export default function GenerateRecipePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useToast();
  const activeRequest = useRef<AbortController | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [thinkingTokens, setThinkingTokens] = useState<string[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [pendingRecipeId, setPendingRecipeId] = useState<number | null>(null);
  const [recipeName, setRecipeName] = useState<string>('');
  const [ingredientNames, setIngredientNames] = useState<string[]>([]);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);

  const [formData, setFormData] = useState<RecipeGenerationRequest>(() => {
    const params = new URLSearchParams(location.search);
    const initialIngredientsToUse = params
      .getAll('use')
      .flatMap(value => value.split(','))
      .map(value => value.trim())
      .filter(Boolean);

    return {
      meal_type: '',
      cuisine: '',
      difficulty: '',
      max_time_minutes: undefined,
      ingredients_to_use: Array.from(new Set(initialIngredientsToUse)),
      ingredients_to_avoid: [],
      dietary_restrictions: [],
      servings: 4,
      search_online: true,
      comments: '',
    };
  });

  // 90-second timeout
  useEffect(() => {
    if (loading) {
      const timeout = setTimeout(() => {
        activeRequest.current?.abort();
        setError('Generation timed out. Please try again.');
        setLoading(false);
        setIsThinking(false);
        addToast('Generation timed out. Please try again.', 'warning');
      }, 90000);
      return () => clearTimeout(timeout);
    }
  }, [loading, addToast]);

  const cancelGeneration = useCallback(() => {
    if (activeRequest.current) {
      activeRequest.current.abort();
      activeRequest.current = null;
    }
    setLoading(false);
    setIsThinking(false);
    setThinkingTokens([]);
    addToast('Generation cancelled.', 'info');
  }, [addToast]);

  useEffect(() => {
    return () => {
      activeRequest.current?.abort();
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const pantryPrefill = params
      .getAll('use')
      .flatMap(value => value.split(','))
      .map(value => value.trim())
      .filter(Boolean);

    if (pantryPrefill.length === 0) return;

    setFormData(prev => ({
      ...prev,
      ingredients_to_use: Array.from(new Set([...prev.ingredients_to_use, ...pantryPrefill])),
    }));
  }, [location.search]);

  const applyPreset = (preset: InspirationPreset) => {
    setActivePresetId(preset.id);
    setFormData(prev => ({
      ...prev,
      meal_type: preset.values.meal_type ?? prev.meal_type,
      cuisine: preset.values.cuisine ?? '',
      difficulty: preset.values.difficulty ?? prev.difficulty,
      max_time_minutes: preset.values.max_time_minutes ?? prev.max_time_minutes,
      comments: preset.values.comments ?? prev.comments,
    }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;

    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;

    setError('');
    setLoading(true);
    setThinkingTokens([]);
    setIsThinking(false);
    setRecipeName('');
    setIngredientNames([]);

    const callbacks: StreamCallbacks = {
      onStatus: () => {},
      onThinkingStart: () => {
        setIsThinking(true);
      },
      onThinking: content => {
        if (content.trim()) {
          setThinkingTokens(prev => {
            const updated = [...prev, content];
            return updated.length > 100 ? updated.slice(-100) : updated;
          });
        }
      },
      onThinkingEnd: () => {
        setIsThinking(false);
      },
      onToolStarted: () => {},
      onToolCompleted: () => {},
      onRecipeStart: () => {},
      onRecipeName: name => {
        setRecipeName(name);
      },
      onRecipeDescription: () => {},
      onRecipeMetadata: () => {},
      onIngredientsStart: () => {},
      onIngredient: ingredient => {
        setIngredientNames(prev => [...prev.slice(0, 4), ingredient.name]);
      },
      onInstructionsStart: () => {},
      onInstruction: () => {},
      onNutrition: () => {},

      onComplete: recipeId => {
        setLoading(false);
        setIsThinking(false);
        activeRequest.current = null;
        setPendingRecipeId(recipeId);
        setShowSuccess(true);
      },

      onError: errorMsg => {
        if (errorMsg !== 'Request cancelled') {
          setError(errorMsg);
        }
        setLoading(false);
        setIsThinking(false);
        activeRequest.current = null;
      },
    };

    try {
      await recipeService.generateRecipeStream(formData, callbacks, { signal: controller.signal });
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Could not generate a recipe. Try again?';
      setError(errorMessage);
      setLoading(false);
      setIsThinking(false);
      activeRequest.current = null;
    }
  };

  const handleRetry = () => {
    setError('');
    const fakeEvent = { preventDefault: () => {} } as FormEvent<HTMLFormElement>;
    void handleSubmit(fakeEvent);
  };

  const handleSuccessComplete = () => {
    if (pendingRecipeId) {
      navigate(`/recipes/${pendingRecipeId}`);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader
        center
        badge={<span className="badge">AI Chef Studio</span>}
        title="Generate Your Recipe"
        subtitle="Share your ingredients, time window, or craving—we will compose a tailored recipe."
      />

      {error && (
        <SectionCard
          className="mb-6 animate-shake border-[#B91C1C]/30 bg-[#FEE2E2]/70"
          title="Whoops. That didn't land."
          contentClassName="text-[#991B1B]"
        >
          <p>{error}</p>
          <button onClick={handleRetry} className="btn-danger mt-4">
            Give it another go
          </button>
        </SectionCard>
      )}

      <LoadingModal
        isOpen={loading}
        message="Generating your recipe..."
        thinkingTokens={thinkingTokens}
        isThinking={isThinking}
        onCancel={cancelGeneration}
      />

      {showSuccess && (
        <SuccessCelebration
          recipeName={recipeName || 'Your Recipe'}
          ingredientPreview={ingredientNames}
          onComplete={handleSuccessComplete}
        />
      )}

      {!loading && !showSuccess && (
        <div className="space-y-6">
          {/* Quick Inspiration Strip */}
          <div className="surface-muted p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3">
              <SparklesIcon className="h-4 w-4 text-[#C84B31]" />
              <span className="eyebrow text-[#57534E]">Quick Inspiration Strip</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {INSPIRATION_PRESETS.map(preset => {
                const isSelected = activePresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    aria-pressed={isSelected}
                    className={`flex items-start justify-between gap-3 rounded-2xl border p-3.5 text-left transition-all duration-150 ${
                      isSelected
                        ? 'border-[#C84B31] bg-[#F9F1EA] shadow-2xs'
                        : 'border-[#E7E0D6] bg-white hover:border-[#D6CEC2] hover:bg-[#FAF7F2]'
                    }`}
                  >
                    <div>
                      <p className="text-sm font-semibold text-[#1C1917]">{preset.label}</p>
                      <p className="mt-0.5 text-xs text-[#57534E]">{preset.subtitle}</p>
                    </div>
                    <BoltIcon
                      className={`h-4 w-4 flex-shrink-0 mt-0.5 ${
                        isSelected ? 'text-[#C84B31]' : 'text-[#78716C]'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Editorial Recipe Form without double-nested SectionCard */}
          <RecipeForm
            formData={formData}
            setFormData={setFormData}
            loading={loading}
            error=""
            onSubmit={handleSubmit}
            statusMessage=""
            isStreaming={false}
            compact={false}
          />
        </div>
      )}
    </div>
  );
}
