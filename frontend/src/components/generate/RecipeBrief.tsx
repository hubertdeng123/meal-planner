import type { FormEvent } from 'react';
import type { RecipeGenerationRequest } from '../../types';
import { ChipInput } from '../ui/ChipInput';
import { ChoiceChips, type ChoiceOption } from '../ui/ChoiceChips';
import { Stepper } from '../ui/Stepper';
import { Toggle } from '../ui/Toggle';
import { GlobeAltIcon, SparklesIcon } from '../ui/AppIcons';
import { describeBrief } from './brief';

const MEAL_OPTIONS: ChoiceOption<string>[] = [
  { value: '', label: 'Any' },
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
];

const CUISINE_OPTIONS: ChoiceOption<string>[] = [
  { value: '', label: 'Surprise me' },
  ...[
    'Italian',
    'Mexican',
    'Mediterranean',
    'Indian',
    'Thai',
    'Japanese',
    'Chinese',
    'Korean',
    'French',
    'American',
    'Middle Eastern',
  ].map(value => ({ value, label: value })),
];

const TIME_OPTIONS: ChoiceOption<string>[] = [
  { value: '', label: 'No limit' },
  { value: '15', label: '15 min' },
  { value: '30', label: '30 min' },
  { value: '45', label: '45 min' },
  { value: '60', label: '1 hour' },
];

const EFFORT_OPTIONS: ChoiceOption<string>[] = [
  { value: '', label: 'Any' },
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Ambitious' },
];

interface RecipeBriefProps {
  brief: RecipeGenerationRequest;
  onChange: (brief: RecipeGenerationRequest) => void;
  onSubmit: () => void;
  pantrySuggestions: string[];
}

function Question({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex gap-4 py-6 first:pt-0 last:pb-0">
      <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-stone-100 text-xs font-semibold text-stone-500">
        {number}
      </span>
      <div className="min-w-0 flex-1 space-y-4">
        <h2 className="text-[15px] font-semibold text-stone-900">{title}</h2>
        {children}
      </div>
    </section>
  );
}

export function RecipeBrief({ brief, onChange, onSubmit, pantrySuggestions }: RecipeBriefProps) {
  const update = (patch: Partial<RecipeGenerationRequest>) => onChange({ ...brief, ...patch });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-6 pb-28 lg:grid-cols-[minmax(0,1fr)_20rem] lg:pb-0"
    >
      <div className="surface divide-y divide-stone-100 p-5 sm:p-7">
        <Question number={1} title="What are you in the mood for?">
          <ChoiceChips
            label="Meal"
            options={MEAL_OPTIONS}
            value={brief.meal_type || ''}
            onChange={meal_type => update({ meal_type })}
          />
          <ChoiceChips
            label="Cuisine"
            options={CUISINE_OPTIONS}
            value={brief.cuisine || ''}
            onChange={cuisine => update({ cuisine })}
          />
        </Question>

        <Question number={2} title="How much time and effort?">
          <ChoiceChips
            label="Time"
            options={TIME_OPTIONS}
            value={brief.max_time_minutes ? String(brief.max_time_minutes) : ''}
            onChange={value => update({ max_time_minutes: value ? Number(value) : undefined })}
          />
          <ChoiceChips
            label="Effort"
            options={EFFORT_OPTIONS}
            value={brief.difficulty || ''}
            onChange={difficulty => update({ difficulty })}
          />
          <div>
            <p className="label">Servings</p>
            <Stepper
              label="Servings"
              value={brief.servings}
              min={1}
              max={12}
              onChange={servings => update({ servings })}
            />
          </div>
        </Question>

        <Question number={3} title="Ingredients">
          <ChipInput
            label="Must use"
            values={brief.ingredients_to_use}
            onChange={ingredients_to_use => update({ ingredients_to_use })}
            placeholder="e.g. spinach, leftover rice"
            suggestions={pantrySuggestions}
            suggestionsLabel="From your pantry"
          />
          <ChipInput
            label="Leave out"
            tone="danger"
            values={brief.ingredients_to_avoid}
            onChange={ingredients_to_avoid => update({ ingredients_to_avoid })}
            placeholder="e.g. cilantro, peanuts"
          />
        </Question>

        <Question number={4} title="Anything else?">
          <div>
            <label htmlFor="brief-notes" className="sr-only">
              Notes for the chef
            </label>
            <textarea
              id="brief-notes"
              rows={3}
              value={brief.comments || ''}
              onChange={event => update({ comments: event.target.value })}
              className="input"
              placeholder="Kid-friendly, one pan, extra crispy, using up the last of the feta…"
            />
          </div>
          <div className="flex items-center justify-between gap-4 rounded-xl bg-stone-50 px-4 py-3">
            <div className="flex items-start gap-3">
              <GlobeAltIcon className="mt-0.5 h-5 w-5 text-stone-400" />
              <div>
                <p className="text-sm font-medium text-stone-900">Look for web inspiration</p>
                <p className="text-xs text-stone-500">Blend ideas from trusted recipe sites</p>
              </div>
            </div>
            <Toggle
              label="Look for web inspiration"
              checked={Boolean(brief.search_online)}
              onChange={search_online => update({ search_online })}
            />
          </div>
        </Question>
      </div>

      <aside className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 border-t border-stone-900/[0.06] bg-white/95 px-4 py-3 backdrop-blur-md lg:static lg:inset-auto lg:z-auto lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
        <div className="lg:surface lg:sticky lg:top-10 lg:p-6">
          <p className="eyebrow hidden lg:block">Your brief</p>
          <p className="hidden font-display text-xl font-semibold leading-snug text-stone-900 lg:mt-3 lg:block">
            {describeBrief(brief)}
          </p>
          <p className="hidden text-sm text-stone-500 lg:mt-3 lg:block">
            Your taste profile, pantry and recent recipes are included automatically.
          </p>
          <button type="submit" className="btn-primary btn-lg w-full lg:mt-6">
            <SparklesIcon className="h-4 w-4" />
            Make my recipe
          </button>
        </div>
      </aside>
    </form>
  );
}
