import type { RecipeGenerationRequest } from '../../types';
import { capitalize } from '../../utils/recipe';

export function describeBrief(brief: RecipeGenerationRequest): string {
  const effort =
    brief.difficulty === 'easy' ? 'an easy' : brief.difficulty === 'hard' ? 'an ambitious' : 'a';
  const time = brief.max_time_minutes ? ` ${brief.max_time_minutes}-minute` : '';
  const cuisine = brief.cuisine ? ` ${brief.cuisine}` : '';
  const meal = brief.meal_type || 'meal';
  let sentence = `${capitalize(effort)}${time}${cuisine} ${meal} for ${brief.servings}`;
  if (brief.ingredients_to_use.length > 0) {
    sentence += `, using ${listPhrase(brief.ingredients_to_use)}`;
  }
  if (brief.ingredients_to_avoid.length > 0) {
    sentence += `, without ${listPhrase(brief.ingredients_to_avoid)}`;
  }
  return `${sentence}.`;
}

function listPhrase(items: string[]) {
  if (items.length <= 2) return items.join(' and ');
  return `${items.slice(0, 2).join(', ')} and ${items.length - 2} more`;
}

/** Drop empty strings so the API applies its own defaults. */
export function normalizeBrief(brief: RecipeGenerationRequest): RecipeGenerationRequest {
  return {
    ...brief,
    meal_type: brief.meal_type || undefined,
    cuisine: brief.cuisine || undefined,
    difficulty: brief.difficulty || undefined,
    comments: brief.comments?.trim() || undefined,
  };
}
