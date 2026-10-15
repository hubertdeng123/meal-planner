import { Link } from 'react-router-dom';
import type { Recipe } from '../../types';
import { RecipeCover } from '../ui/RecipeCover';
import { Spinner } from '../ui/PageLoader';
import { BoltIcon, ClockIcon, HeartSolidIcon, TrashIcon, UserGroupIcon } from '../ui/AppIcons';
import { capitalize, dietaryTags, formatMinutes, isQuick, totalMinutes } from '../../utils/recipe';

type CardRecipe = Pick<
  Recipe,
  'id' | 'name' | 'description' | 'prep_time_minutes' | 'cook_time_minutes' | 'servings' | 'tags'
> &
  Partial<Pick<Recipe, 'image_url' | 'cuisine' | 'feedback'>>;

interface RecipeCardProps {
  recipe: CardRecipe;
  onDelete?: () => void;
  deleting?: boolean;
  compact?: boolean;
}

export function RecipeCard({
  recipe,
  onDelete,
  deleting = false,
  compact = false,
}: RecipeCardProps) {
  const minutes = totalMinutes(recipe);
  const quick = isQuick(recipe);
  const diet = dietaryTags(recipe).slice(0, 1);
  const loved = Boolean(recipe.feedback?.liked);

  return (
    <article className="card card-hover group relative flex flex-col overflow-hidden">
      <Link
        to={`/recipes/${recipe.id}`}
        className="flex flex-1 flex-col focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-soft"
      >
        <div className="relative">
          <RecipeCover
            name={recipe.name}
            imageUrl={recipe.image_url}
            size={compact ? 'sm' : 'md'}
            className={compact ? 'aspect-[2/1]' : 'aspect-[16/9]'}
          />
          <div className="absolute bottom-2.5 left-2.5 flex flex-wrap gap-1.5">
            {quick && (
              <span className="inline-flex items-center gap-1 rounded-md bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-stone-800 shadow-xs backdrop-blur">
                <BoltIcon className="h-3 w-3 text-amber-500" />
                Quick
              </span>
            )}
            {diet.map(tag => (
              <span
                key={tag}
                className="rounded-md bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-primary-ink shadow-xs backdrop-blur"
              >
                {capitalize(tag.replace('-', ' '))}
              </span>
            ))}
          </div>
          {loved && (
            <span className="absolute left-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 shadow-xs">
              <HeartSolidIcon className="h-4 w-4 text-accent" />
              <span className="sr-only">Loved</span>
            </span>
          )}
        </div>
        <div className={`flex flex-1 flex-col ${compact ? 'p-3.5' : 'p-4 sm:p-5'}`}>
          {recipe.cuisine && !compact && <p className="eyebrow mb-1">{recipe.cuisine}</p>}
          <h3
            className={`font-semibold leading-snug text-stone-900 transition-colors group-hover:text-primary ${
              compact ? 'text-sm' : 'text-base'
            }`}
          >
            {recipe.name}
          </h3>
          {recipe.description && !compact && (
            <p className="mt-1.5 line-clamp-2 text-sm text-stone-600">{recipe.description}</p>
          )}
          <div className="mt-auto flex items-center gap-4 pt-3 text-xs font-medium text-stone-500">
            {minutes > 0 && (
              <span className="inline-flex items-center gap-1">
                <ClockIcon className="h-3.5 w-3.5" />
                {formatMinutes(minutes)}
              </span>
            )}
            {!compact && (
              <span className="inline-flex items-center gap-1">
                <UserGroupIcon className="h-3.5 w-3.5" />
                {recipe.servings} {recipe.servings === 1 ? 'serving' : 'servings'}
              </span>
            )}
          </div>
          {recipe.tags.length > 0 && !compact && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {recipe.tags.slice(0, 3).map(tag => (
                <span key={tag} className="tag">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </Link>
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          className="absolute right-2.5 top-2.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-stone-500 shadow-xs backdrop-blur transition hover:text-red-600 focus:opacity-100 focus:outline-none focus-visible:ring-4 focus-visible:ring-red-100 disabled:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
          title="Delete recipe"
          aria-label={`Delete ${recipe.name}`}
        >
          {deleting ? (
            <Spinner className="h-4 w-4 text-red-500" />
          ) : (
            <TrashIcon className="h-4 w-4" />
          )}
        </button>
      )}
    </article>
  );
}
