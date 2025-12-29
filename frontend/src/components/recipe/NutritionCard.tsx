import { SkeletonShimmer } from '../ui/SkeletonShimmer';

interface Nutrition {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
  sugar_g?: number;
  sodium_mg?: number;
}

interface NutritionCardProps {
  nutrition?: Nutrition | null;
  loading?: boolean;
}

export function NutritionCard({ nutrition, loading = true }: NutritionCardProps) {
  const showSkeletons = loading && !nutrition;

  return (
    <div className="card p-6 bg-gradient-to-br from-green-50 to-emerald-50">
      <h3 className="text-2xl font-semibold flex items-center gap-2 mb-4">
        <span>🧮</span>
        <span>Nutrition Facts</span>
        <span className="text-sm font-normal text-gray-500 ml-2">per serving</span>
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {showSkeletons ? (
          // Show shimmer skeletons while loading
          Array.from({ length: 7 }).map((_, idx) => (
            <div key={idx} className="space-y-2">
              <SkeletonShimmer width="w-20" height="h-4" />
              <SkeletonShimmer width="w-16" height="h-6" />
            </div>
          ))
        ) : nutrition ? (
          // Show real nutrition data with pop-in animation
          <>
            {nutrition.calories !== undefined && (
              <div className="animate-scale-in">
                <div className="text-gray-600 text-sm">Calories</div>
                <div className="font-semibold text-gray-900 text-lg">{nutrition.calories}</div>
              </div>
            )}
            {nutrition.protein_g !== undefined && (
              <div className="animate-scale-in" style={{ animationDelay: '50ms' }}>
                <div className="text-gray-600 text-sm">Protein</div>
                <div className="font-semibold text-gray-900 text-lg">{nutrition.protein_g}g</div>
              </div>
            )}
            {nutrition.carbs_g !== undefined && (
              <div className="animate-scale-in" style={{ animationDelay: '100ms' }}>
                <div className="text-gray-600 text-sm">Carbs</div>
                <div className="font-semibold text-gray-900 text-lg">{nutrition.carbs_g}g</div>
              </div>
            )}
            {nutrition.fat_g !== undefined && (
              <div className="animate-scale-in" style={{ animationDelay: '150ms' }}>
                <div className="text-gray-600 text-sm">Fat</div>
                <div className="font-semibold text-gray-900 text-lg">{nutrition.fat_g}g</div>
              </div>
            )}
            {nutrition.fiber_g !== undefined && (
              <div className="animate-scale-in" style={{ animationDelay: '200ms' }}>
                <div className="text-gray-600 text-sm">Fiber</div>
                <div className="font-semibold text-gray-900 text-lg">{nutrition.fiber_g}g</div>
              </div>
            )}
            {nutrition.sugar_g !== undefined && (
              <div className="animate-scale-in" style={{ animationDelay: '250ms' }}>
                <div className="text-gray-600 text-sm">Sugar</div>
                <div className="font-semibold text-gray-900 text-lg">{nutrition.sugar_g}g</div>
              </div>
            )}
            {nutrition.sodium_mg !== undefined && (
              <div className="animate-scale-in" style={{ animationDelay: '300ms' }}>
                <div className="text-gray-600 text-sm">Sodium</div>
                <div className="font-semibold text-gray-900 text-lg">{nutrition.sodium_mg}mg</div>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
