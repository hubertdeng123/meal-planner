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
    <div className={`surface text-center ${isCompact ? 'p-6' : 'p-10'} ${className}`}>
      {icon && (
        <div
          className={`flex justify-center text-stone-300 ${isCompact ? 'mb-4' : 'mb-6'} animate-float`}
        >
          <div
            className={`${isCompact ? 'w-12 h-12' : 'w-16 h-16'} flex items-center justify-center`}
          >
            {icon}
          </div>
        </div>
      )}
      <h2
        className={`${isCompact ? 'text-xl' : 'text-2xl'} font-semibold text-stone-900 animate-slide-in-up opacity-0`}
        style={{ animationFillMode: 'forwards' }}
      >
        {title}
      </h2>
      {description && (
        <p
          className={`${isCompact ? 'mt-2 text-sm' : 'mt-3'} text-stone-600 animate-slide-in-up opacity-0`}
          style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}
        >
          {description}
        </p>
      )}
      {valueProp && (
        <p
          className="mt-2 text-sm text-stone-500 animate-slide-in-up opacity-0"
          style={{ animationDelay: '150ms', animationFillMode: 'forwards' }}
        >
          {valueProp}
        </p>
      )}
      {action && (
        <div
          className={`${isCompact ? 'mt-5' : 'mt-8'} flex justify-center animate-slide-in-up opacity-0`}
          style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}
        >
          {action}
        </div>
      )}
    </div>
  );
}
