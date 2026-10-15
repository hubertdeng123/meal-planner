import { ClockIcon, BoltIcon, UserGroupIcon } from '../ui/AppIcons';
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
      <div className="card p-4 sm:p-5">
        <div className="grid grid-cols-3 gap-4">
          <SkeletonShimmer height="h-16" width="w-full" />
          <SkeletonShimmer height="h-16" width="w-full" />
          <SkeletonShimmer height="h-16" width="w-full" />
        </div>
      </div>
    );
  }

  if (!metadata) return null;

  const totalTime = (metadata.prep_time || 0) + (metadata.cook_time || 0);

  return (
    <div className="card p-4 sm:p-5 animate-scale-in">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-[#E7E0D6] bg-[#FAF7F2] px-4 py-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-[#78716C]">
            <ClockIcon className="h-3.5 w-3.5 text-[#78716C]" />
            <span>Prep time</span>
          </div>
          <div className="mt-1 text-base font-semibold tabular-nums text-[#1C1917]">
            {metadata.prep_time} min
          </div>
        </div>

        <div className="rounded-2xl border border-[#E7E0D6] bg-[#FAF7F2] px-4 py-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-[#78716C]">
            <BoltIcon className="h-3.5 w-3.5 text-[#C84B31]" />
            <span>Cook time</span>
          </div>
          <div className="mt-1 text-base font-semibold tabular-nums text-[#1C1917]">
            {metadata.cook_time} min
          </div>
        </div>

        <div className="rounded-2xl border border-[#C84B31]/25 bg-[#F9F1EA] px-4 py-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-[#B83B22]">
            <ClockIcon className="h-3.5 w-3.5 text-[#C84B31]" />
            <span>Total time</span>
          </div>
          <div className="mt-1 text-base font-semibold tabular-nums text-[#9A3412]">
            {totalTime} min
          </div>
        </div>

        <div className="rounded-2xl border border-[#E7E0D6] bg-[#FAF7F2] px-4 py-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-[#78716C]">
            <UserGroupIcon className="h-3.5 w-3.5 text-[#78716C]" />
            <span>Servings</span>
          </div>
          <div className="mt-1 text-base font-semibold tabular-nums text-[#1C1917]">
            {metadata.servings}
          </div>
        </div>
      </div>
    </div>
  );
}
