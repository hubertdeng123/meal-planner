import { InfoBadge } from '../ui/InfoBadge';
import { SkeletonShimmer } from '../ui/SkeletonShimmer';

interface QuickInfoCardProps {
  metadata?: {
    prep_time: number;
    cook_time: number;
    servings: number;
  } | null;
  loading?: boolean;
}

export function QuickInfoCard({ metadata, loading = true }: QuickInfoCardProps) {
  if (loading && !metadata) {
    return (
      <div className="card p-4">
        <div className="flex gap-6 justify-around">
          <SkeletonShimmer height="h-16" width="w-24" />
          <SkeletonShimmer height="h-16" width="w-24" />
          <SkeletonShimmer height="h-16" width="w-24" />
        </div>
      </div>
    );
  }

  if (!metadata) return null;

  return (
    <div className="card p-4 animate-scale-in">
      <div className="flex gap-6 justify-around">
        <InfoBadge icon="🕐" label="Prep" value={`${metadata.prep_time}m`} />
        <InfoBadge icon="🔥" label="Cook" value={`${metadata.cook_time}m`} />
        <InfoBadge icon="👥" label="Serves" value={metadata.servings} />
      </div>
    </div>
  );
}
