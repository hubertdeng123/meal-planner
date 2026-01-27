import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`surface p-10 text-center ${className}`}>
      {icon && (
        <div className="flex justify-center text-stone-300 mb-6 animate-float">
          <div className="w-16 h-16 flex items-center justify-center">{icon}</div>
        </div>
      )}
      <h2
        className="text-2xl font-semibold text-stone-900 animate-slide-in-up opacity-0"
        style={{ animationFillMode: 'forwards' }}
      >
        {title}
      </h2>
      {description && (
        <p
          className="mt-3 text-stone-600 animate-slide-in-up opacity-0"
          style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}
        >
          {description}
        </p>
      )}
      {action && (
        <div
          className="mt-8 flex justify-center animate-slide-in-up opacity-0"
          style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}
        >
          {action}
        </div>
      )}
    </div>
  );
}
