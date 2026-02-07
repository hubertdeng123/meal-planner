import { useState, useEffect, useMemo, useRef, useCallback, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import recipeService, { type StreamCallbacks } from '../services/recipe.service';
import type { RecipeGenerationRequest } from '../types';
import { RecipeForm } from '../components/recipe/RecipeForm';
import { LoadingModal } from '../components/LoadingModal';
import { PageHeader } from '../components/ui/PageHeader';
import { SectionCard } from '../components/ui/SectionCard';
import { useToast } from '../contexts/ToastContext';

// Floating sparkle component for celebration
function FloatingSparkle({ style }: { style: React.CSSProperties }) {
  return (
    <div className="absolute text-xl pointer-events-none animate-sparkle-float" style={style}>
      ✨
    </div>
  );
}

// Success celebration component with recipe name and sparkles
function SuccessCelebration({
  recipeName,
  ingredientPreview,
  onComplete,
}: {
  recipeName: string;
  ingredientPreview?: string[];
  onComplete: () => void;
}) {
  // Generate stable random positions for sparkles
  const sparkleStyles = useMemo(() => {
    return Array.from({ length: 8 }).map((_, idx) => ({
      left: `${5 + idx * 12 + Math.random() * 5}%`,
      bottom: `${-10 - Math.random() * 20}%`,
      animationDelay: `${idx * 0.15}s`,
      animationDuration: `${2.5 + Math.random() * 1}s`,
    }));
  }, []);

  useEffect(() => {
    const timer = setTimeout(onComplete, 2000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      {/* Celebration sparkles in background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {sparkleStyles.map((style, idx) => (
          <FloatingSparkle key={idx} style={style} />
        ))}
      </div>

      <div className="glass-panel p-10 text-center max-w-md animate-scale-in">
        {/* Big celebration emoji */}
        <div className="text-6xl mb-4 animate-bounce-in">🎉</div>

        {/* Success message */}
        <h2 className="text-2xl font-semibold text-stone-900 mb-2 animate-slide-in-up">
          Recipe Ready!
        </h2>

        {/* THE RECIPE NAME - personalized! */}
        <p
          className="text-lg font-medium mb-3 animate-slide-in-up"
          style={{ color: 'var(--primary)', animationDelay: '100ms' }}
        >
          {recipeName}
        </p>

        {/* Ingredient preview if available */}
        {ingredientPreview && ingredientPreview.length > 0 && (
          <p
            className="text-stone-500 text-sm animate-slide-in-up"
            style={{ animationDelay: '150ms' }}
          >
            with {ingredientPreview.slice(0, 3).join(', ')}
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
  const [formData, setFormData] = useState<RecipeGenerationRequest>({
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
            // Limit to last 100 tokens to prevent memory growth
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
        // Capture the recipe name for the success celebration
        setRecipeName(name);
      },
      onRecipeDescription: () => {},
      onRecipeMetadata: () => {},
      onIngredientsStart: () => {},
      onIngredient: ingredient => {
        // Capture ingredient names for the success celebration preview
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
    <div>
      <PageHeader
        center
        badge={<span className="badge">Recipe Lab</span>}
        title="Generate Your Recipe"
        subtitle="Tell us the vibe. We'll handle the recipe."
      />

      {error && (
        <SectionCard
          className="mb-6 animate-shake border-red-200 bg-red-50"
          title="Whoops. That didn't land."
          contentClassName="text-red-700"
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
        <div className="max-w-3xl mx-auto">
          <SectionCard
            title="Recipe brief"
            subtitle="Tell us what you want. We'll shape the recipe around your constraints."
          >
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
          </SectionCard>
        </div>
      )}
    </div>
  );
}
