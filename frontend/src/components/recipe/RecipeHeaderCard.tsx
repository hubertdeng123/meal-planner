import { SkeletonShimmer } from '../ui/SkeletonShimmer';

interface RecipeHeaderCardProps {
  name?: string | null;
  description?: string | null;
  eyebrow?: string | null;
  tags?: string[];
  loading?: boolean;
}

export function RecipeHeaderCard({
  name,
  description,
  eyebrow,
  tags = [],
  loading = true,
}: RecipeHeaderCardProps) {
  if (loading && !name) {
    return (
      <div className="card p-6 sm:p-8 space-y-4">
        <SkeletonShimmer height="h-4" width="w-28" />
        <SkeletonShimmer height="h-10" width="w-3/4" />
        <SkeletonShimmer height="h-6" width="w-full" />
        <SkeletonShimmer height="h-6" width="w-5/6" />
      </div>
    );
  }

  return (
    <div className="card p-6 sm:p-8 space-y-4 animate-fade-in">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#1C1917] tracking-tight leading-[1.15]">
        {name}
      </h1>
      {description && (
        <p className="text-base sm:text-lg text-[#57534E] leading-relaxed">{description}</p>
      )}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {tags.map(tag => (
            <span key={tag} className="chip">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
