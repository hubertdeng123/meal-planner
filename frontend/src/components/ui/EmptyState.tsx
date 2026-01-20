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
      {icon && <div className="flex justify-center text-slate-400 mb-4">{icon}</div>}
      <h2 className="text-2xl font-semibold text-slate-900">{title}</h2>
      {description && <p className="mt-2 text-slate-600">{description}</p>}
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}
