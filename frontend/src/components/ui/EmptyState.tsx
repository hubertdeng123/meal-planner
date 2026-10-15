import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  valueProp?: string;
  action?: ReactNode;
  className?: string;
  variant?: 'default' | 'compact';
}

export function EmptyState({
  icon,
  title,
  description,
  valueProp,
  action,
  className = '',
  variant = 'default',
}: EmptyStateProps) {
  const isCompact = variant === 'compact';

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-dashed border-stone-300 bg-white/60 text-center animate-slide-in-up ${
        isCompact ? 'px-6 py-10' : 'px-6 py-16 sm:py-20'
      } ${className}`}
    >
      {icon && (
        <div className="mb-5 flex justify-center">
          <div className={`icon-tile ${isCompact ? '' : 'icon-tile-lg'} [&>svg]:h-6 [&>svg]:w-6`}>
            {icon}
          </div>
        </div>
      )}
      <h2
        className={`font-display font-semibold text-stone-900 ${isCompact ? 'text-lg' : 'text-2xl'}`}
      >
        {title}
      </h2>
      {description && (
        <p className={`mx-auto mt-2 max-w-md text-stone-600 ${isCompact ? 'text-sm' : ''}`}>
          {description}
        </p>
      )}
      {valueProp && <p className="mx-auto mt-2 max-w-md text-sm text-stone-500">{valueProp}</p>}
      {action && (
        <div className={`${isCompact ? 'mt-5' : 'mt-7'} flex flex-wrap justify-center gap-3`}>
          {action}
        </div>
      )}
    </div>
  );
}
