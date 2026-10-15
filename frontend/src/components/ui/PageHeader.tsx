import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  eyebrow?: ReactNode;
  badge?: ReactNode;
  center?: boolean;
  actions?: ReactNode;
  className?: string;
  noMargin?: boolean;
}

export function PageHeader({
  title,
  subtitle,
  eyebrow,
  badge,
  center = false,
  actions,
  className = '',
  noMargin = false,
}: PageHeaderProps) {
  const margin = noMargin ? '' : 'mb-8';

  if (center) {
    return (
      <header className={`text-center ${margin} ${className}`}>
        {badge && <div className="mb-3 flex justify-center">{badge}</div>}
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle mx-auto">{subtitle}</p>}
      </header>
    );
  }

  return (
    <header
      className={`flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between ${margin} ${className}`}
    >
      <div className="min-w-0">
        {badge && <div className="mb-3">{badge}</div>}
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
