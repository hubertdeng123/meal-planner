import type { ReactNode } from 'react';
import type { RecipeDraft, StreamStage } from '../../types';
import { RecipeCover } from '../ui/RecipeCover';
import { NutritionTiles } from '../recipe/NutritionTiles';
import { formatAmount, formatMinutes, hasNutrition } from '../../utils/recipe';

interface LiveRecipeCardProps {
  draft: RecipeDraft | null;
  stage: StreamStage;
}

function Placeholder({ className }: { className: string }) {
  return <span aria-hidden="true" className={`skeleton block ${className}`} />;
}

function Meta({ label, value, pending }: { label: string; value?: ReactNode; pending: boolean }) {
  return (
    <div className="rounded-xl bg-stone-50 px-3 py-2.5">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-stone-500">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold tabular-nums text-stone-900">
        {value !== undefined && value !== null && value !== '' ? (
          <span className="animate-fade-in">{value}</span>
        ) : pending ? (
          <Placeholder className="mt-1 h-4 w-12" />
        ) : (
          <span className="text-stone-400">—</span>
        )}
      </dd>
    </div>
  );
}

export function LiveRecipeCard({ draft, stage }: LiveRecipeCardProps) {
  const isComplete = stage === 'complete';
  const pending = stage !== 'complete' && stage !== 'error';
  const writing = stage === 'drafting';
  const ingredients = (draft?.ingredients ?? []).filter(item => item.name);
  const steps = (draft?.instructions ?? []).filter(Boolean);
  const total = (draft?.prep_time_minutes ?? 0) + (draft?.cook_time_minutes ?? 0);

  return (
    <article
      className="surface overflow-hidden"
      aria-busy={pending}
      aria-label={draft?.name ? `Recipe: ${draft.name}` : 'Recipe in progress'}
    >
      {isComplete && draft?.name ? (
        <RecipeCover name={draft.name} className="h-32 animate-fade-in sm:h-40" />
      ) : (
        <div className="h-1.5 w-full overflow-hidden bg-stone-100">
          {pending && <div className="h-full w-full animate-shimmer opacity-80" />}
        </div>
      )}

      <div className="space-y-7 p-5 sm:p-7">
        <header className="space-y-3">
          <p className="eyebrow">{draft?.cuisine || (pending ? 'Your recipe' : 'Recipe')}</p>
          {draft?.name ? (
            <h2 className="font-display text-[1.75rem] font-semibold leading-tight text-stone-900 sm:text-[2rem]">
              {draft.name}
            </h2>
          ) : (
            <Placeholder className="h-9 w-3/4" />
          )}
          {draft?.description ? (
            <p className="max-w-2xl text-[15px] leading-relaxed text-stone-600">
              {draft.description}
            </p>
          ) : pending ? (
            <div className="space-y-2">
              <Placeholder className="h-4 w-full" />
              <Placeholder className="h-4 w-5/6" />
            </div>
          ) : null}
        </header>

        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Meta
            label="Prep"
            value={
              draft?.prep_time_minutes !== undefined ? `${draft.prep_time_minutes} min` : undefined
            }
            pending={pending}
          />
          <Meta
            label="Cook"
            value={
              draft?.cook_time_minutes !== undefined ? `${draft.cook_time_minutes} min` : undefined
            }
            pending={pending}
          />
          <Meta
            label="Total"
            value={total > 0 ? formatMinutes(total) : undefined}
            pending={pending}
          />
          <Meta label="Serves" value={draft?.servings} pending={pending} />
        </dl>

        <div className="grid gap-8 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <section aria-labelledby="live-ingredients">
            <div className="mb-3 flex items-baseline justify-between">
              <h3 id="live-ingredients" className="section-title">
                Ingredients
              </h3>
              {ingredients.length > 0 && (
                <span className="text-xs text-stone-500">{ingredients.length}</span>
              )}
            </div>
            {ingredients.length > 0 ? (
              <ul className="divide-y divide-stone-100">
                {ingredients.map((ingredient, index) => (
                  <li
                    key={index}
                    className="flex items-baseline gap-3 py-2 text-sm animate-slide-in-up"
                  >
                    <span className="h-1.5 w-1.5 flex-shrink-0 translate-y-[-2px] rounded-full bg-primary/50" />
                    <span className="min-w-0 flex-1 text-stone-800">
                      {ingredient.name}
                      {ingredient.notes && (
                        <span className="text-stone-500">, {ingredient.notes}</span>
                      )}
                    </span>
                    <span className="flex-shrink-0 font-medium tabular-nums text-stone-500">
                      {formatAmount(ingredient)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : pending ? (
              <div className="space-y-3">
                {[0, 1, 2, 3, 4].map(row => (
                  <Placeholder key={row} className={`h-4 ${row % 2 ? 'w-2/3' : 'w-5/6'}`} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-stone-400">No ingredients yet.</p>
            )}
          </section>

          <section aria-labelledby="live-steps">
            <div className="mb-3 flex items-baseline justify-between">
              <h3 id="live-steps" className="section-title">
                Method
              </h3>
              {steps.length > 0 && <span className="text-xs text-stone-500">{steps.length}</span>}
            </div>
            {steps.length > 0 ? (
              <ol className="space-y-4">
                {steps.map((step, index) => (
                  <li key={index} className="flex gap-3 animate-slide-in-up">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary-ink">
                      {index + 1}
                    </span>
                    <p className="pt-0.5 text-[15px] leading-relaxed text-stone-700">
                      {step}
                      {writing && index === steps.length - 1 && (
                        <span
                          aria-hidden="true"
                          className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 bg-primary animate-cursor"
                        />
                      )}
                    </p>
                  </li>
                ))}
              </ol>
            ) : pending ? (
              <div className="space-y-4">
                {[0, 1, 2].map(row => (
                  <div key={row} className="flex gap-3">
                    <Placeholder className="h-6 w-6 flex-shrink-0 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Placeholder className="h-4 w-full" />
                      <Placeholder className="h-4 w-3/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-stone-400">No steps yet.</p>
            )}
          </section>
        </div>

        {hasNutrition(draft?.nutrition) && (
          <section aria-labelledby="live-nutrition" className="animate-fade-in">
            <h3 id="live-nutrition" className="section-title mb-3">
              Nutrition <span className="font-normal text-stone-400">per serving</span>
            </h3>
            <NutritionTiles nutrition={draft?.nutrition} />
          </section>
        )}

        {draft?.tags && draft.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {draft.tags.map(tag => (
              <span key={tag} className="tag">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
