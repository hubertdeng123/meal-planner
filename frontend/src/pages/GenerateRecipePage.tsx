import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import recipeService, { type StreamCallbacks } from '../services/recipe.service';
import type { RecipeGenerationRequest } from '../types';
import { RecipeForm } from '../components/recipe/RecipeForm';
import { LoadingModal } from '../components/LoadingModal';

export default function GenerateRecipePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [thinkingTokens, setThinkingTokens] = useState<string[]>([]);
  const [isThinking, setIsThinking] = useState(false);
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
        setError('Generation is taking longer than expected. Please try again.');
        setLoading(false);
      }, 90000);
      return () => clearTimeout(timeout);
    }
  }, [loading]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setThinkingTokens([]);
    setIsThinking(false);

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
      onRecipeName: () => {},
      onRecipeDescription: () => {},
      onRecipeMetadata: () => {},
      onIngredientsStart: () => {},
      onIngredient: () => {},
      onInstructionsStart: () => {},
      onInstruction: () => {},
      onNutrition: () => {},

      onComplete: recipeId => {
        setLoading(false);
        setIsThinking(false);
        navigate(`/recipes/${recipeId}`);
      },

      onError: errorMsg => {
        setError(errorMsg);
        setLoading(false);
        setIsThinking(false);
      },
    };

    try {
      await recipeService.generateRecipeStream(formData, callbacks);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to generate recipe. Please try again.';
      setError(errorMessage);
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setError('');
    const fakeEvent = { preventDefault: () => {} } as FormEvent<HTMLFormElement>;
    void handleSubmit(fakeEvent);
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8 text-center">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-orange-600 via-orange-500 to-yellow-500 bg-clip-text text-transparent animate-gradient mb-3">
          Generate Your Recipe
        </h1>
        <p className="text-xl text-gray-600">
          Let Hungry Helper craft a personalized recipe just for you
        </p>
      </div>

      {error && (
        <div className="mb-6 card p-6 bg-red-50 border-2 border-red-200 animate-shake">
          <div className="flex items-start gap-4">
            <span className="text-4xl">😞</span>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-900 mb-2">
                Oops! Something went wrong
              </h3>
              <p className="text-red-700 mb-4">{error}</p>
              <button
                onClick={handleRetry}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      <LoadingModal
        isOpen={loading}
        message="Generating your recipe..."
        thinkingTokens={thinkingTokens}
        isThinking={isThinking}
      />

      {!loading && (
        <div className="max-w-3xl mx-auto">
          <RecipeForm
            formData={formData}
            setFormData={setFormData}
            loading={false}
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
