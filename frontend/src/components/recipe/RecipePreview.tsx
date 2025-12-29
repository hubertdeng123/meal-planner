import type { Ingredient, NutritionFacts } from '../../types';
import { RecipeHeaderCard } from './RecipeHeaderCard';
import { QuickInfoCard } from './QuickInfoCard';
import { IngredientsCard } from './IngredientsCard';
import { InstructionsCard } from './InstructionsCard';
import { NutritionCard } from './NutritionCard';

interface Instruction {
  step: number;
  content: string;
}

interface Metadata {
  prep_time: number;
  cook_time: number;
  servings: number;
}

interface RecipePreviewProps {
  // Loading state
  loading: boolean;

  // Recipe data (progressive)
  name?: string | null;
  description?: string | null;
  metadata?: Metadata | null;
  ingredients: Ingredient[];
  instructions: Instruction[];
  nutrition?: NutritionFacts | null;

  // Predictive counts for skeletons
  predictedIngredientCount?: number;
  predictedStepCount?: number;

  // Optional styling
  className?: string;
}

export function RecipePreview({
  loading,
  name,
  description,
  metadata,
  ingredients,
  instructions,
  nutrition,
  predictedIngredientCount = 10,
  predictedStepCount = 7,
  className = '',
}: RecipePreviewProps) {
  return (
    <div className={`space-y-6 animate-slide-in-right ${className}`}>
      {/* Recipe cards - shown with shimmer, fill progressively */}
      <RecipeHeaderCard name={name} description={description} loading={loading} />

      <QuickInfoCard metadata={metadata} loading={loading} />

      <IngredientsCard
        ingredients={ingredients}
        loading={loading}
        predictedCount={predictedIngredientCount}
      />

      <InstructionsCard
        instructions={instructions}
        loading={loading}
        predictedCount={predictedStepCount}
      />

      <NutritionCard nutrition={nutrition} loading={loading} />
    </div>
  );
}
