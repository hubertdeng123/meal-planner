import { SkeletonShimmer } from '../ui/SkeletonShimmer';

interface Ingredient {
  name: string;
  quantity: number;
  unit: string;
  notes?: string;
}

interface IngredientsCardProps {
  ingredients: Ingredient[];
  loading?: boolean;
  predictedCount?: number;
}

export function IngredientsCard({
  ingredients,
  loading = true,
  predictedCount = 10,
}: IngredientsCardProps) {
  const showSkeletons = loading && ingredients.length === 0;
  const skeletonCount = predictedCount;

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-2xl font-semibold flex items-center gap-2">
          <span>🥕</span>
          <span>Ingredients</span>
        </h3>
        {ingredients.length > 0 && (
          <span className="text-sm text-gray-500">{ingredients.length} items</span>
        )}
      </div>

      <div className="space-y-3">
        {showSkeletons
          ? // Show shimmer skeletons while loading
            Array.from({ length: skeletonCount }).map((_, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <SkeletonShimmer width="w-6" height="h-6" rounded="full" />
                <SkeletonShimmer width="w-full" height="h-6" />
              </div>
            ))
          : // Show real ingredients with staggered animation
            ingredients.map((ing, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3 rounded-2xl hover:bg-slate-50 transition-all duration-200 animate-slide-in-left"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <span className="text-primary text-xl flex-shrink-0">•</span>
                <div className="flex-1">
                  <span className="font-semibold text-gray-900">
                    {ing.quantity} {ing.unit}
                  </span>
                  <span className="text-gray-700"> {ing.name}</span>
                  {ing.notes && (
                    <span className="text-sm text-gray-500 italic"> ({ing.notes})</span>
                  )}
                </div>
              </div>
            ))}
      </div>
    </div>
  );
}
