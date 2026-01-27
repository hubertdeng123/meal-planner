import { SkeletonShimmer } from '../ui/SkeletonShimmer';

interface Instruction {
  step: number;
  content: string;
}

interface InstructionsCardProps {
  instructions: Instruction[];
  loading?: boolean;
  predictedCount?: number;
}

export function InstructionsCard({
  instructions,
  loading = true,
  predictedCount = 7,
}: InstructionsCardProps) {
  const showSkeletons = loading && instructions.length === 0;
  const skeletonCount = predictedCount;

  return (
    <div className="card p-6">
      <h3 className="text-2xl font-semibold flex items-center gap-2 mb-6">
        <span>📝</span>
        <span>Steps</span>
      </h3>

      <div className="space-y-6">
        {showSkeletons
          ? // Show shimmer skeletons while loading
            Array.from({ length: skeletonCount }).map((_, idx) => (
              <div key={idx} className="flex gap-4">
                <SkeletonShimmer width="w-10" height="h-10" rounded="full" />
                <SkeletonShimmer width="w-full" height="h-20" />
              </div>
            ))
          : // Show real instructions with cascade animation
            instructions.map(inst => (
              <div
                key={inst.step}
                className="flex gap-4 group animate-slide-in-up"
                style={{ animationDelay: `${inst.step * 100}ms` }}
              >
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-white font-bold shadow-lg group-hover:scale-110 transition-transform">
                    {inst.step}
                  </div>
                </div>
                <p className="flex-1 text-gray-700 leading-relaxed pt-2">{inst.content}</p>
              </div>
            ))}
      </div>
    </div>
  );
}
