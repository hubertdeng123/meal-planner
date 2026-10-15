interface SkeletonGridProps {
  count?: number;
  testId?: string;
  variant?: 'recipe' | 'card' | 'row';
  className?: string;
}

function RecipeCardSkeleton() {
  return (
    <div className="surface overflow-hidden">
      <div className="skeleton aspect-[16/9] rounded-none" />
      <div className="space-y-3 p-5">
        <div className="skeleton h-5 w-3/4" />
        <div className="skeleton h-4 w-full" />
        <div className="flex gap-2 pt-1">
          <div className="skeleton h-5 w-16" />
          <div className="skeleton h-5 w-20" />
        </div>
      </div>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="surface space-y-4 p-5">
      <div className="skeleton h-5 w-1/2" />
      <div className="skeleton h-4 w-1/3" />
      <div className="skeleton h-2 w-full" />
    </div>
  );
}

function RowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-4">
      <div className="skeleton h-6 w-6 rounded-full" />
      <div className="skeleton h-4 flex-1" />
      <div className="skeleton h-4 w-12" />
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div role="status" aria-label="Loading page" className="space-y-6">
      <div className="space-y-2">
        <div className="skeleton h-3 w-24" />
        <div className="skeleton h-8 w-64 max-w-full" />
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}

export function SkeletonGrid({
  count = 6,
  testId,
  variant = 'card',
  className,
}: SkeletonGridProps) {
  const Item =
    variant === 'recipe' ? RecipeCardSkeleton : variant === 'row' ? RowSkeleton : CardSkeleton;
  const layout =
    className ??
    (variant === 'row'
      ? 'surface divide-y divide-stone-100'
      : 'grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3');

  return (
    <div className={layout} data-testid={testId} role="status" aria-label="Loading">
      {Array.from({ length: count }).map((_, index) => (
        <Item key={index} />
      ))}
    </div>
  );
}
