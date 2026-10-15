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
      className={`surface text-center ${isCompact ? 'p-6 sm:p-7' : 'p-10 sm:p-12'} ${className}`.trim()}
    >
      {icon && (
        <div className={`flex justify-center text-[#78716C] ${isCompact ? 'mb-4' : 'mb-5'}`}>
          <div
            className={`${isCompact ? 'h-12 w-12 rounded-2xl' : 'h-16 w-16 rounded-2xl'} flex items-center justify-center border border-[#E7E0D6] bg-[#FAF7F2] shadow-xs`}
          >
            {icon}
          </div>
        </div>
      )}
      <h2
        className={`font-display ${isCompact ? 'text-xl' : 'text-2xl'} font-semibold text-[#1C1917] tracking-tight animate-slide-in-up opacity-0`}
        style={{ animationFillMode: 'forwards' }}
      >
        {title}
      </h2>
      {description && (
        <p
          className={`mx-auto max-w-md ${isCompact ? 'mt-1.5 text-sm' : 'mt-2.5 text-base'} text-[#57534E] leading-relaxed animate-slide-in-up opacity-0`}
          style={{ animationDelay: '80ms', animationFillMode: 'forwards' }}
        >
          {description}
        </p>
      )}
      {valueProp && (
        <p
          className="mx-auto mt-2 max-w-md text-xs font-medium text-[#78716C] animate-slide-in-up opacity-0"
          style={{ animationDelay: '130ms', animationFillMode: 'forwards' }}
        >
          {valueProp}
        </p>
      )}
      {action && (
        <div
          className={`${isCompact ? 'mt-5' : 'mt-7'} flex flex-wrap justify-center gap-3 animate-slide-in-up opacity-0`}
          style={{ animationDelay: '180ms', animationFillMode: 'forwards' }}
        >
          {action}
        </div>
      )}
    </div>
  );
}
