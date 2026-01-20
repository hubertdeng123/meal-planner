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
      <h1 className="font-display text-3xl sm:text-4xl font-semibold text-slate-900">{name}</h1>
      {description && <p className="text-lg text-gray-700 leading-relaxed">{description}</p>}
    </div>
  );
}
