import { useState, useEffect, useRef } from 'react';
import { ExclamationCircleIcon, SparklesIcon } from '../ui/AppIcons';
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
  compact?: boolean;
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
  const [avoidIngredientInput, setAvoidIngredientInput] = useState('');
  const [recentlyAdded, setRecentlyAdded] = useState<Set<number>>(new Set());
  const ingredientCountRef = useRef(formData.ingredients_to_use.length);

  useEffect(() => {
    if (formData.ingredients_to_use.length > ingredientCountRef.current) {
      const newIndex = formData.ingredients_to_use.length - 1;
      setRecentlyAdded(prev => new Set(prev).add(newIndex));
      setTimeout(() => {
        setRecentlyAdded(prev => {
          const next = new Set(prev);
          next.delete(newIndex);
          return next;
        });
      }, 500);
    }
    ingredientCountRef.current = formData.ingredients_to_use.length;
  }, [formData.ingredients_to_use.length]);

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

  const addAvoidIngredient = () => {
    if (avoidIngredientInput.trim()) {
      setFormData({
        ...formData,
        ingredients_to_avoid: [...formData.ingredients_to_avoid, avoidIngredientInput.trim()],
      });
      setAvoidIngredientInput('');
    }
  };

  const removeAvoidIngredient = (index: number) => {
    setFormData({
      ...formData,
      ingredients_to_avoid: formData.ingredients_to_avoid.filter((_, i) => i !== index),
    });
  };

  return (
    <form onSubmit={onSubmit} className={`card p-6 sm:p-8 space-y-8 ${className}`.trim()}>
      {error && (
        <div className="rounded-2xl border border-[#B91C1C]/25 bg-[#FEE2E2] p-4">
          <div className="flex items-start gap-3">
            <ExclamationCircleIcon
              className="h-5 w-5 text-[#B91C1C] flex-shrink-0"
              aria-hidden="true"
            />
            <h3 className="text-sm font-medium text-[#991B1B]">{error}</h3>
          </div>
        </div>
      )}

      {/* Section 1: Dish Essentials */}
      <div className="space-y-4">
        <div className="border-b border-[#E7E0D6] pb-3">
          <p className="eyebrow">1. Dish Essentials</p>
          <p className="mt-1 text-sm text-[#57534E]">
            Set the course, culinary origin, timing, and table size.
          </p>
        </div>

        <div className={`grid grid-cols-1 gap-5 ${compact ? '' : 'sm:grid-cols-2'}`}>
          <div>
            <label htmlFor="meal_type" className="block text-sm font-semibold text-[#1C1917]">
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
            <label htmlFor="cuisine" className="block text-sm font-semibold text-[#1C1917]">
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

        <div className={`grid grid-cols-1 gap-5 ${compact ? '' : 'sm:grid-cols-3'}`}>
          <div>
            <label htmlFor="difficulty" className="block text-sm font-semibold text-[#1C1917]">
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
            <label htmlFor="max_time" className="block text-sm font-semibold text-[#1C1917]">
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
              className="mt-2 input tabular-nums"
              placeholder="No limit"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="servings" className="block text-sm font-semibold text-[#1C1917]">
              Servings
            </label>
            <input
              type="number"
              id="servings"
              min="1"
              value={formData.servings}
              onChange={e => setFormData({ ...formData, servings: parseInt(e.target.value) || 4 })}
              className="mt-2 input tabular-nums"
              disabled={loading}
            />
          </div>
        </div>
      </div>

      {/* Section 2: Pantry & Ingredients */}
      <div className="space-y-5">
        <div className="border-b border-[#E7E0D6] pb-3">
          <p className="eyebrow">2. Pantry & Ingredients</p>
          <p className="mt-1 text-sm text-[#57534E]">
            Highlight ingredients from your kitchen or flag items to leave out.
          </p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-[#1C1917]">Ingredients to use</label>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="text"
              value={ingredientInput}
              onChange={e => setIngredientInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addIngredient())}
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
          {formData.ingredients_to_use.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {formData.ingredients_to_use.map((ingredient, index) => (
                <span
                  key={index}
                  className={`inline-flex items-center rounded-full border border-[#3F624D]/25 bg-[#ECF5F0] px-3 py-1 text-sm font-medium text-[#2F6F4E] transition-all duration-200 ${
                    recentlyAdded.has(index) ? 'animate-bounce-in-scale' : ''
                  }`}
                >
                  {ingredient}
                  <button
                    type="button"
                    onClick={() => removeIngredient(index)}
                    disabled={loading}
                    className="ml-1.5 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-[#2F6F4E] transition-all duration-200 hover:bg-[#3F624D]/15 disabled:opacity-50"
                  >
                    <span className="sr-only">Remove {ingredient}</span>
                    <svg className="h-2 w-2" stroke="currentColor" fill="none" viewBox="0 0 8 8">
                      <path strokeLinecap="round" strokeWidth="1.5" d="M1 1l6 6m0-6L1 7" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-[#1C1917]">Ingredients to avoid</label>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="text"
              value={avoidIngredientInput}
              onChange={e => setAvoidIngredientInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addAvoidIngredient())}
              className="input"
              placeholder="Add ingredient to avoid"
              disabled={loading}
            />
            <button
              type="button"
              onClick={addAvoidIngredient}
              disabled={loading}
              className="btn-secondary"
            >
              Add
            </button>
          </div>
          {formData.ingredients_to_avoid.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {formData.ingredients_to_avoid.map((ingredient, index) => (
                <span
                  key={`${ingredient}-${index}`}
                  className="inline-flex items-center rounded-full border border-[#B91C1C]/25 bg-[#FEE2E2] px-3 py-1 text-sm font-medium text-[#991B1B]"
                >
                  {ingredient}
                  <button
                    type="button"
                    onClick={() => removeAvoidIngredient(index)}
                    disabled={loading}
                    className="ml-1.5 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-[#B91C1C] transition-all duration-200 hover:bg-[#B91C1C]/15 disabled:opacity-50"
                  >
                    <span className="sr-only">Remove {ingredient}</span>
                    <svg className="h-2 w-2" stroke="currentColor" fill="none" viewBox="0 0 8 8">
                      <path strokeLinecap="round" strokeWidth="1.5" d="M1 1l6 6m0-6L1 7" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Section 3: Dietary & Chef Notes */}
      <div className="space-y-5">
        <div className="border-b border-[#E7E0D6] pb-3">
          <p className="eyebrow">3. Dietary & Chef Notes</p>
          <p className="mt-1 text-sm text-[#57534E]">
            Fine-tune culinary inspiration and leave special instructions for the AI Chef.
          </p>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-[#E7E0D6] bg-[#FAF7F2] p-4">
          <div>
            <p className="text-sm font-semibold text-[#1C1917]">Use web inspiration</p>
            <p className="text-xs text-[#57534E]">
              Blend your pantry and taste profile with curated culinary references
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(formData.search_online)}
              onChange={e => setFormData({ ...formData, search_online: e.target.checked })}
              className="sr-only peer"
              disabled={loading}
            />
            <div className="w-11 h-6 bg-[#D6CEC2] peer-focus:outline-none peer-focus:ring-3 peer-focus:ring-[#C84B31]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#D6CEC2] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#C84B31]"></div>
          </label>
        </div>

        <div>
          <label htmlFor="comments" className="block text-sm font-semibold text-[#1C1917]">
            Notes for the chef (you)
          </label>
          <textarea
            id="comments"
            value={formData.comments || ''}
            onChange={e => setFormData({ ...formData, comments: e.target.value })}
            rows={compact ? 2 : 3}
            className="mt-2 input"
            placeholder="Anything to dodge or double down on? e.g. extra crispy, bright lemon finish..."
            disabled={loading}
          />
          {!compact && (
            <p className="mt-1.5 text-xs text-[#78716C]">
              Optional: flavor profile notes, equipment preferences, or swaps.
            </p>
          )}
        </div>
      </div>

      <div className="pt-2">
        <button type="submit" disabled={loading} className="btn-primary w-full py-3.5 text-base">
          <SparklesIcon className="h-5 w-5" />
          <span>{loading ? 'Cooking up ideas...' : 'Make my recipe'}</span>
        </button>
      </div>

      {statusMessage && !isStreaming && (
        <div className="rounded-2xl surface-warm p-4 animate-slide-in-up">
          <h3 className="text-sm font-medium text-[#9A3412]">{statusMessage}</h3>
        </div>
      )}
    </form>
  );
}
