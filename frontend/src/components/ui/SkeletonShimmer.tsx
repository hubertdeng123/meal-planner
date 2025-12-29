interface SkeletonShimmerProps {
  width?: string;
  height?: string;
  className?: string;
  rounded?: 'sm' | 'md' | 'lg' | 'full';
}

export function SkeletonShimmer({
  width = 'w-full',
  height = 'h-4',
  className = '',
  rounded = 'md',
}: SkeletonShimmerProps) {
  const roundedClass = {
    sm: 'rounded',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full',
  }[rounded];

  return <div className={`animate-shimmer ${width} ${height} ${roundedClass} ${className}`} />;
}
