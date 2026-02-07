import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  center?: boolean;
  actions?: ReactNode;
  className?: string;
  noMargin?: boolean;
}

export function PageHeader({
  title,
  subtitle,
  badge,
  center = false,
  actions,
  className = '',
  noMargin = false,
}: PageHeaderProps) {
  const margin = noMargin ? '' : 'mb-8';
  const baseClasses = `${margin} ${className}`;

  if (center) {
    return (
      <div className={`text-center ${baseClasses}`}>
        {badge && <div className="flex justify-center">{badge}</div>}
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
    );
  }

  return (
    <div className={baseClasses}>
      <div className="sm:flex sm:items-start sm:justify-between gap-4">
        <div className="sm:flex-auto">
          {badge}
          <h1 className="page-title">{title}</h1>
          {subtitle && <p className="page-subtitle">{subtitle}</p>}
        </div>
        {actions && <div className="mt-4 sm:mt-0 sm:flex-none">{actions}</div>}
      </div>
    </div>
  );
}
