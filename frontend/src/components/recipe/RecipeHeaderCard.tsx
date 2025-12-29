import { SkeletonShimmer } from '../ui/SkeletonShimmer';

interface RecipeHeaderCardProps {
  name?: string | null;
  description?: string | null;
  loading?: boolean;
}

export function RecipeHeaderCard({ name, description, loading = true }: RecipeHeaderCardProps) {
  if (loading && !name) {
    return (
      <div className="card p-6 space-y-4">
        <SkeletonShimmer height="h-10" width="w-3/4" />
        <SkeletonShimmer height="h-6" width="w-full" />
        <SkeletonShimmer height="h-6" width="w-5/6" />
      </div>
    );
  }

  return (
    <div className="card p-6 space-y-4 animate-fade-in">
      <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-600 via-orange-500 to-yellow-500 bg-clip-text text-transparent animate-gradient">
        {name}
      </h1>
      {description && <p className="text-lg text-gray-700 leading-relaxed">{description}</p>}
    </div>
  );
}
