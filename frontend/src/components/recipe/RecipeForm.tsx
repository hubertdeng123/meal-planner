import { useState } from 'react';
import { ExclamationCircleIcon } from '@heroicons/react/24/outline';
import type { RecipeGenerationRequest } from '../../types';

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

interface RecipeFormProps {
  formData: RecipeGenerationRequest;
  setFormData: (data: RecipeGenerationRequest) => void;
  loading: boolean;
  error: string;
  onSubmit: (e: React.FormEvent) => void;
  statusMessage?: string;
  isStreaming?: boolean;
  compact?: boolean; // For sidebar mode
  className?: string;
}

export function RecipeForm({
  formData,
  setFormData,
  loading,
  error,
  onSubmit,
  statusMessage = '',
  isStreaming = false,
  compact = false,
  className = '',
}: RecipeFormProps) {
  const [ingredientInput, setIngredientInput] = useState('');

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
    <form onSubmit={onSubmit} className={`space-y-6 bg-white shadow rounded-lg p-6 ${className}`}>
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

      <div className={`grid grid-cols-1 gap-6 ${compact ? '' : 'sm:grid-cols-2'}`}>
        <div>
          <label htmlFor="meal_type" className="block text-sm font-medium text-gray-700">
            Meal Type
          </label>
          <select
            id="meal_type"
            value={formData.meal_type}
            onChange={e => setFormData({ ...formData, meal_type: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-orange-500 focus:outline-none focus:ring-orange-500 sm:text-sm"
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
            className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-orange-500 focus:outline-none focus:ring-orange-500 sm:text-sm"
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

      <div className={`grid grid-cols-1 gap-6 ${compact ? '' : 'sm:grid-cols-3'}`}>
        <div>
          <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700">
            Difficulty
          </label>
          <select
            id="difficulty"
            value={formData.difficulty}
            onChange={e => setFormData({ ...formData, difficulty: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-orange-500 focus:outline-none focus:ring-orange-500 sm:text-sm"
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
            Max Time (min)
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
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
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
            onChange={e => setFormData({ ...formData, servings: parseInt(e.target.value) || 4 })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
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
            className="block w-full rounded-none rounded-l-md border-gray-300 focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
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
              className="inline-flex items-center rounded-full bg-orange-100 px-3 py-0.5 text-sm font-medium text-orange-800"
            >
              {ingredient}
              <button
                type="button"
                onClick={() => removeIngredient(index)}
                disabled={loading}
                className="ml-1 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-orange-400 hover:bg-orange-200 hover:text-orange-500 disabled:opacity-50"
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
        <label htmlFor="comments" className="block text-sm font-medium text-gray-700">
          Comments & Special Requests
        </label>
        <textarea
          id="comments"
          value={formData.comments || ''}
          onChange={e => setFormData({ ...formData, comments: e.target.value })}
          rows={compact ? 2 : 3}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
          placeholder="Add any special requests or preferences..."
          disabled={loading}
        />
        {!compact && (
          <p className="mt-1 text-sm text-gray-500">
            Optional: Add specific instructions or preferences
          </p>
        )}
      </div>

      <div>
        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
    </form>
  );
}
