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
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
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
    <form onSubmit={onSubmit} className={`space-y-6 card p-6 ${className}`}>
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
            Meal type
          </label>
          <select
            id="meal_type"
            value={formData.meal_type}
            onChange={e => setFormData({ ...formData, meal_type: e.target.value })}
            className="mt-2 input"
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
            className="mt-2 input"
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
            className="mt-2 input"
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
            Max time (min)
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
            className="mt-2 input"
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
            className="mt-2 input"
            disabled={loading}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Ingredients to use</label>
        <div className="mt-2 flex items-center gap-2">
          <input
            type="text"
            value={ingredientInput}
            onChange={e => setIngredientInput(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addIngredient())}
            className="input"
            placeholder="Add an ingredient"
            disabled={loading}
          />
          <button
            type="button"
            onClick={addIngredient}
            disabled={loading}
            className="btn-secondary"
          >
            Add
          </button>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {formData.ingredients_to_use.map((ingredient, index) => (
            <span
              key={index}
              className="inline-flex items-center rounded-full bg-[#f97316]/10 px-3 py-0.5 text-sm font-medium text-[#ea580c]"
            >
              {ingredient}
              <button
                type="button"
                onClick={() => removeIngredient(index)}
                disabled={loading}
                className="ml-1 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-[#f97316] hover:bg-[#f97316]/15 disabled:opacity-50"
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
          Notes for the chef (you)
        </label>
        <textarea
          id="comments"
          value={formData.comments || ''}
          onChange={e => setFormData({ ...formData, comments: e.target.value })}
          rows={compact ? 2 : 3}
          className="mt-2 input"
          placeholder="Anything to dodge or double down on?"
          disabled={loading}
        />
        {!compact && (
          <p className="mt-1 text-sm text-gray-500">Optional: notes, swaps, or hard no's.</p>
        )}
      </div>

      <div>
        <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
          {loading ? 'Cooking up ideas...' : 'Make my recipe'}
        </button>
      </div>

      {statusMessage && !isStreaming && (
        <div className="rounded-2xl bg-[#fff6f7] p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-[#ea580c]">{statusMessage}</h3>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
