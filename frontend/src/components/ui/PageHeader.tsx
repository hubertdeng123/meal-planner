import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  center?: boolean;
  className?: string;
  noMargin?: boolean;
}

export function PageHeader({
  title,
  subtitle,
  badge,
  center = false,
  className = '',
  noMargin = false,
}: PageHeaderProps) {
  const alignment = center ? 'text-center' : '';
  const margin = noMargin ? '' : 'mb-8';

  return (
    <div className={`${alignment} ${margin} ${className}`}>
      {badge && <div className={center ? 'flex justify-center' : ''}>{badge}</div>}
      <h1 className="page-title">{title}</h1>
      {subtitle && <p className="page-subtitle">{subtitle}</p>}
    </div>
  );
}
