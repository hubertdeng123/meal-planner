import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExclamationCircleIcon } from '@heroicons/react/24/outline';
import recipeService, { type StreamCallbacks } from '../services/recipe.service';
import type { RecipeGenerationRequest } from '../types';

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
const CUISINES = [
  'Italian',
  'Mexican',
  'Chinese',
  'Japanese',
  'Indian',
  'Thai',
  'French',
  'Mediterranean',
];
const DIFFICULTY_LEVELS = ['Easy', 'Medium', 'Hard'];

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
    search_online: true, // Default to true based on backend
    comments: '',
  });
  const [ingredientInput, setIngredientInput] = useState('');

  // Streaming state - separate thinking from content
  const [isStreaming, setIsStreaming] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [thinkingContent, setThinkingContent] = useState('');
  const [generationContent, setGenerationContent] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  // Ref for auto-scrolling
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll content
    if (contentRef.current && (thinkingContent || generationContent)) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [thinkingContent, generationContent]);

  // Auto-clear thinking content after it gets too long (every ~500 characters)
  useEffect(() => {
    if (thinkingContent.length > 500 && isThinking) {
      // Keep only the last sentence or two by finding the last period
      const lastPeriodIndex = thinkingContent.lastIndexOf('.', thinkingContent.length - 50);
      if (lastPeriodIndex > 100) {
        const recentContent = thinkingContent.slice(lastPeriodIndex + 1).trim();
        if (recentContent) {
          setThinkingContent(recentContent + ' ');
        }
      }
    }
  }, [thinkingContent, isThinking]);

  // Helper function to format thinking content as cohesive sentences
  const formatThinkingContent = (content: string) => {
    if (!content) return '';

    // Remove any markdown-like formatting
    let formatted = content
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1') // Remove italic
      .replace(/`(.*?)`/g, '$1') // Remove code formatting
      .replace(/#{1,6}\s*/g, '') // Remove headers
      .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links, keep text
      .replace(/[-*+]\s+/g, '') // Remove bullet points
      .replace(/\d+\.\s+/g, '') // Remove numbered lists
      .trim();

    // Ensure it ends with proper sentence punctuation for readability
    if (formatted && !formatted.match(/[.!?]$/)) {
      formatted += '...';
    }

    return formatted;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setIsStreaming(true);
    setStatusMessage('');
    setThinkingContent('');
    setGenerationContent('');
    setIsThinking(false);

    const callbacks: StreamCallbacks = {
      onStatus: message => {
        setStatusMessage(message);
      },

      onThinkingStart: message => {
        setStatusMessage(message);
        setIsThinking(true);
        setThinkingContent('');
      },

      onThinking: chunk => {
        setThinkingContent(prev => prev + chunk);
      },

      onThinkingStop: message => {
        setStatusMessage(message);
        setIsThinking(false);
        // Clear thinking content after a brief delay when thinking stops
        setTimeout(() => {
          setThinkingContent('');
        }, 2000);
      },

      onContent: chunk => {
        setGenerationContent(prev => prev + chunk);
      },

      onComplete: (recipeId, message) => {
        setStatusMessage(message);
        setLoading(false);
        setIsStreaming(false);
        setIsThinking(false);

        // Navigate to the recipe after a short delay
        setTimeout(() => {
          navigate(`/recipes/${recipeId}`);
        }, 2000);
      },

      onError: errorMsg => {
        setError(errorMsg);
        setLoading(false);
        setIsStreaming(false);
        setIsThinking(false);
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
      setIsThinking(false);
      setStatusMessage('');
    }
  };

  const addIngredient = () => {
    if (ingredientInput.trim()) {
      setFormData({
        ...formData,
        ingredients_to_use: [...formData.ingredients_to_use, ingredientInput.trim()],
      });
      setIngredientInput('');
    }
  };

  const removeIngredient = (index: number) => {
    setFormData({
      ...formData,
      ingredients_to_use: formData.ingredients_to_use.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900">Generate New Recipe</h1>
      <p className="mt-2 text-gray-600">
                      Let Hungry Helper create a personalized recipe based on your preferences
      </p>

      <div className={`mt-8 ${isStreaming ? 'grid grid-cols-1 lg:grid-cols-2 gap-6' : ''}`}>
        {/* Recipe Generation Form */}
        <div className={isStreaming ? 'lg:col-span-1' : 'max-w-2xl mx-auto'}>
          <form onSubmit={handleSubmit} className="space-y-6 bg-white shadow rounded-lg p-6">
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <ExclamationCircleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">{error}</h3>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="meal_type" className="block text-sm font-medium text-gray-700">
                  Meal Type
                </label>
                <select
                  id="meal_type"
                  value={formData.meal_type}
                  onChange={e => setFormData({ ...formData, meal_type: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                  disabled={loading}
                >
                  <option value="">Any</option>
                  {MEAL_TYPES.map(type => (
                    <option key={type} value={type.toLowerCase()}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="cuisine" className="block text-sm font-medium text-gray-700">
                  Cuisine
                </label>
                <select
                  id="cuisine"
                  value={formData.cuisine}
                  onChange={e => setFormData({ ...formData, cuisine: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                  disabled={loading}
                >
                  <option value="">Any</option>
                  {CUISINES.map(cuisine => (
                    <option key={cuisine} value={cuisine}>
                      {cuisine}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div>
                <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700">
                  Difficulty Level
                </label>
                <select
                  id="difficulty"
                  value={formData.difficulty}
                  onChange={e => setFormData({ ...formData, difficulty: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                  disabled={loading}
                >
                  <option value="">Any</option>
                  {DIFFICULTY_LEVELS.map(level => (
                    <option key={level} value={level.toLowerCase()}>
                      {level}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="max_time" className="block text-sm font-medium text-gray-700">
                  Max Time (minutes)
                </label>
                <input
                  type="number"
                  id="max_time"
                  value={formData.max_time_minutes || ''}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      max_time_minutes: e.target.value ? parseInt(e.target.value) : undefined,
                    })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="No limit"
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="servings" className="block text-sm font-medium text-gray-700">
                  Servings
                </label>
                <input
                  type="number"
                  id="servings"
                  min="1"
                  value={formData.servings}
                  onChange={e =>
                    setFormData({ ...formData, servings: parseInt(e.target.value) || 4 })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Ingredients to Use</label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <input
                  type="text"
                  value={ingredientInput}
                  onChange={e => setIngredientInput(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addIngredient())}
                  className="block w-full rounded-none rounded-l-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="Add an ingredient"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={addIngredient}
                  disabled={loading}
                  className="relative -ml-px inline-flex items-center space-x-2 rounded-r-md border border-gray-300 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                >
                  Add
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {formData.ingredients_to_use.map((ingredient, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center rounded-full bg-blue-100 px-3 py-0.5 text-sm font-medium text-blue-800"
                  >
                    {ingredient}
                    <button
                      type="button"
                      onClick={() => removeIngredient(index)}
                      disabled={loading}
                      className="ml-1 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-blue-400 hover:bg-blue-200 hover:text-blue-500 disabled:opacity-50"
                    >
                      <span className="sr-only">Remove {ingredient}</span>
                      <svg className="h-2 w-2" stroke="currentColor" fill="none" viewBox="0 0 8 8">
                        <path strokeLinecap="round" strokeWidth="1.5" d="M1 1l6 6m0-6L1 7" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.search_online || false}
                  onChange={e => setFormData({ ...formData, search_online: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  disabled={loading}
                />
                <span className="ml-2 text-sm font-medium text-gray-700">
                  Search online for recipe inspiration
                </span>
              </label>
              <p className="mt-1 text-sm text-gray-500">
                Hungry Helper will search cooking websites for inspiration before creating your recipe
              </p>
            </div>

            <div>
              <label htmlFor="comments" className="block text-sm font-medium text-gray-700">
                Comments & Special Requests
              </label>
              <textarea
                id="comments"
                value={formData.comments || ''}
                onChange={e => setFormData({ ...formData, comments: e.target.value })}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="Add any special requests, cooking preferences, or notes for Hungry Helper (e.g., 'make it kid-friendly', 'use Mediterranean flavors', 'include a protein sauce')"
                disabled={loading}
              />
              <p className="mt-1 text-sm text-gray-500">
                Optional: Add specific instructions or preferences to help Hungry Helper create exactly
                what you want
              </p>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Generating Recipe...' : 'Generate Recipe'}
              </button>
            </div>

            {statusMessage && !isStreaming && (
              <div className="rounded-md bg-blue-50 p-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">{statusMessage}</h3>
                  </div>
                </div>
              </div>
            )}

            {isStreaming && statusMessage && (
              <div className="rounded-md bg-green-50 p-3 border border-green-200">
                <div className="flex items-center">
                  <div className="animate-pulse flex items-center">
                    <div className="h-2 w-2 bg-green-600 rounded-full mr-2"></div>
                    <span className="text-sm font-medium text-green-800">{statusMessage}</span>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Streaming Content Display */}
        {isStreaming && (
          <div className="lg:col-span-1">
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-3 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  🍳 Recipe Generation
                  {loading && (
                    <span className="ml-2 flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    </span>
                  )}
                </h3>
              </div>
              <div
                ref={contentRef}
                className="p-6 max-h-96 overflow-y-auto"
                style={{
                  lineHeight: '1.6',
                  fontSize: '15px',
                }}
              >
                {/* Thinking Display */}
                {isThinking && (
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <div className="animate-pulse h-2 w-2 bg-blue-500 rounded-full mt-2"></div>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-blue-800 italic">
                          {thinkingContent
                            ? formatThinkingContent(thinkingContent)
                            : 'Hungry Helper is thinking about your recipe...'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Content Display */}
                {generationContent && (
                  <div className="prose prose-sm max-w-none text-gray-700">
                    <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                      {generationContent}
                    </pre>
                  </div>
                )}

                {/* Default message when no content yet */}
                {!thinkingContent && !generationContent && (
                  <div className="text-gray-500 italic">Starting recipe generation...</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
