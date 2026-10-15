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
  const baseClasses = `${margin} ${className}`.trim();

  if (center) {
    return (
      <div className={`text-center ${baseClasses}`}>
        {badge && <div className="mb-2.5 flex justify-center">{badge}</div>}
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle mx-auto max-w-2xl">{subtitle}</p>}
        {actions && <div className="mt-5 flex flex-wrap justify-center gap-2.5">{actions}</div>}
      </div>
    );
  }

  return (
    <div className={baseClasses}>
      <div className="sm:flex sm:items-end sm:justify-between gap-6">
        <div className="sm:flex-auto min-w-0">
          {badge && <div className="mb-2.5">{badge}</div>}
          <h1 className="page-title">{title}</h1>
          {subtitle && <p className="page-subtitle max-w-3xl">{subtitle}</p>}
        </div>
        {actions && (
          <div className="mt-4 sm:mt-0 sm:flex-none flex flex-wrap items-center gap-2.5">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
