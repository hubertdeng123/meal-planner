import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import recipeService, {
  type StreamCallbacks,
  type StreamRecipeMetadata,
} from '../services/recipe.service';
import type { Ingredient, NutritionFacts, RecipeGenerationRequest } from '../types';
import { RecipeForm } from '../components/recipe/RecipeForm';
import { RecipePreview } from '../components/recipe/RecipePreview';
import { WaitingIndicator } from '../components/recipe/WaitingIndicator';

interface StreamingRecipe {
  name?: string | null;
  description?: string | null;
  metadata?: StreamRecipeMetadata | null;
  ingredients: Ingredient[];
  instructions: Array<{
    step: number;
    content: string;
  }>;
  nutrition?: NutritionFacts | null;
}

export default function GenerateRecipePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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

  // New state for the beautiful UX
  const [isStreaming, setIsStreaming] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false); // True during 10-30s wait
  const [statusMessage, setStatusMessage] = useState('');
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [isOverlayFadingOut, setIsOverlayFadingOut] = useState(false);

  // Recipe assembly state
  const [streamingRecipe, setStreamingRecipe] = useState<StreamingRecipe>({
    name: null,
    description: null,
    metadata: null,
    ingredients: [],
    instructions: [],
    nutrition: null,
  });

  // Predictive skeleton counts
  const [predictedIngredientCount, setPredictedIngredientCount] = useState(10);
  const [predictedStepCount, setPredictedStepCount] = useState(7);

  // Calculate predictive counts when form data changes
  useEffect(() => {
    // Predict ingredient count based on specified ingredients
    const baseCount =
      formData.ingredients_to_use.length > 0 ? formData.ingredients_to_use.length : 0;
    const additionalCount = Math.floor(Math.random() * 4) + 8; // 8-12 more ingredients
    setPredictedIngredientCount(baseCount + additionalCount);

    // Predict step count based on difficulty
    if (formData.difficulty === 'easy') {
      setPredictedStepCount(Math.floor(Math.random() * 2) + 5); // 5-6 steps
    } else if (formData.difficulty === 'hard') {
      setPredictedStepCount(Math.floor(Math.random() * 3) + 8); // 8-10 steps
    } else {
      setPredictedStepCount(Math.floor(Math.random() * 3) + 6); // 6-8 steps
    }
  }, [formData.difficulty, formData.ingredients_to_use]);

  // 45-second timeout for generation
  useEffect(() => {
    if (isStreaming) {
      const timeout = setTimeout(() => {
        setError('Generation is taking longer than expected. Please try again.');
        setIsStreaming(false);
        setLoading(false);
        setIsWaiting(false);
      }, 45000); // 45 seconds

      return () => clearTimeout(timeout);
    }
  }, [isStreaming]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setIsStreaming(true);
    setIsWaiting(false); // Will be set to true by onStatus
    setStatusMessage('');
    setShowSuccessOverlay(false);
    setIsOverlayFadingOut(false);
    setStreamingRecipe({
      name: null,
      description: null,
      metadata: null,
      ingredients: [],
      instructions: [],
      nutrition: null,
    });

    const callbacks: StreamCallbacks = {
      onStatus: message => {
        setStatusMessage(message);
        setIsWaiting(true); // Start waiting experience
      },

      onThinkingStart: () => {
        // Not used in new UX - thinking is part of waiting
      },

      onThinking: () => {
        // Not used in new UX
      },

      onThinkingStop: () => {
        // Not used in new UX
      },

      onRecipeStart: () => {
        // Recipe events are starting
        setIsWaiting(false); // Stop waiting indicator
      },

      onRecipeName: (name: string) => {
        setStreamingRecipe(prev => ({ ...prev, name }));
      },

      onRecipeDescription: (description: string) => {
        setStreamingRecipe(prev => ({ ...prev, description }));
      },

      onRecipeMetadata: (metadata: StreamRecipeMetadata) => {
        setStreamingRecipe(prev => ({ ...prev, metadata }));
      },

      onIngredientsStart: () => {
        // Stop waiting when ingredients start arriving
        setIsWaiting(false);
      },

      onIngredient: (ingredient: Ingredient) => {
        setStreamingRecipe(prev => ({
          ...prev,
          ingredients: [...prev.ingredients, ingredient],
        }));
      },

      onInstructionsStart: () => {
        // Instructions starting
      },

      onInstruction: (step: number, content: string) => {
        setStreamingRecipe(prev => ({
          ...prev,
          instructions: [...prev.instructions, { step, content }],
        }));
      },

      onNutrition: (nutrition: NutritionFacts) => {
        setStreamingRecipe(prev => ({ ...prev, nutrition }));
      },

      onComplete: (recipeId, message) => {
        setStatusMessage(message || 'Recipe created successfully!');
        setLoading(false);
        setIsStreaming(false);
        setIsWaiting(false);
        setShowSuccessOverlay(true);
        setIsOverlayFadingOut(false); // Reset fade-out state

        // Start fade-out after 1.5 seconds
        setTimeout(() => {
          setIsOverlayFadingOut(true);
        }, 1500);

        // Navigate after fade completes (1.5s + 0.5s fade = 2s total)
        setTimeout(() => {
          navigate(`/recipes/${recipeId}`);
        }, 2000);
      },

      onError: errorMsg => {
        setError(errorMsg);
        setLoading(false);
        setIsStreaming(false);
        setIsWaiting(false);
        setStatusMessage('');
      },
    };

    try {
      await recipeService.generateRecipeStream(formData, callbacks);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to generate recipe. Please try again.';
      setError(errorMessage);
      setLoading(false);
      setIsStreaming(false);
      setIsWaiting(false);
      setStatusMessage('');
    }
  };

  const handleRetry = () => {
    setError('');
    const fakeEvent = { preventDefault: () => {} } as FormEvent<HTMLFormElement>;
    void handleSubmit(fakeEvent);
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Hero Header */}
      <div className="mb-8 text-center">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-orange-600 via-orange-500 to-yellow-500 bg-clip-text text-transparent animate-gradient mb-3">
          Generate Your Recipe
        </h1>
        <p className="text-xl text-gray-600">
          Let Hungry Helper craft a personalized recipe just for you
        </p>
      </div>

      {/* Error Display */}
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

      {/* Only show content when not showing success overlay */}
      {!showSuccessOverlay && (
        <>
          {/* State 1: Form only (before submission) */}
          {!isStreaming && (
            <div className="max-w-3xl mx-auto">
              <RecipeForm
                formData={formData}
                setFormData={setFormData}
                loading={loading}
                error=""
                onSubmit={handleSubmit}
                statusMessage={statusMessage}
                isStreaming={false}
                compact={false}
              />
            </div>
          )}

          {/* State 2: Centered waiting indicator (during 10-30s wait) */}
          {isStreaming && isWaiting && (
            <div className="max-w-2xl mx-auto">
              <WaitingIndicator />
            </div>
          )}

          {/* State 3: Dual-panel with form + recipe preview (when building) */}
          {isStreaming && !isWaiting && (
            <div className="flex gap-6">
              <div className="w-[400px] flex-shrink-0 sticky top-6 self-start">
                <RecipeForm
                  formData={formData}
                  setFormData={setFormData}
                  loading={loading}
                  error=""
                  onSubmit={handleSubmit}
                  statusMessage={statusMessage}
                  isStreaming={true}
                  compact={true}
                />
              </div>
              <div className="flex-1">
                <RecipePreview
                  loading={loading}
                  name={streamingRecipe.name}
                  description={streamingRecipe.description}
                  metadata={streamingRecipe.metadata}
                  ingredients={streamingRecipe.ingredients}
                  instructions={streamingRecipe.instructions}
                  nutrition={streamingRecipe.nutrition}
                  predictedIngredientCount={predictedIngredientCount}
                  predictedStepCount={predictedStepCount}
                />
              </div>
            </div>
          )}
        </>
      )}

      {/* Success Overlay */}
      {showSuccessOverlay && (
        <div
          className={`fixed inset-0 bg-black/50 flex items-center justify-center z-50 ${
            isOverlayFadingOut ? 'animate-fade-out' : 'animate-fade-in'
          }`}
        >
          <div
            className={`bg-white rounded-2xl p-12 max-w-md text-center shadow-2xl ${
              isOverlayFadingOut ? 'animate-scale-out' : 'animate-scale-in'
            }`}
          >
            <div className="text-8xl mb-6 animate-bounce-in">✨</div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Your Recipe is Ready!</h2>
            <p className="text-gray-600 mb-6">Redirecting to your delicious creation...</p>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full w-0 bg-gradient-to-r from-orange-500 to-orange-600 animate-progress-bar" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
