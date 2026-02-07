import type { ReactNode } from 'react';

interface SectionCardProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  headerClassName?: string;
  bare?: boolean;
}

export function SectionCard({
  title,
  subtitle,
  action,
  children,
  className = '',
  contentClassName = '',
  headerClassName = '',
  bare = false,
}: SectionCardProps) {
  return (
    <section className={`surface ${bare ? '' : 'p-5 sm:p-6'} ${className}`}>
      {(title || subtitle || action) && (
        <header
          className={`mb-4 flex flex-wrap items-start justify-between gap-3 ${headerClassName}`}
        >
          <div>
            {title && <h2 className="section-title">{title}</h2>}
            {subtitle && <p className="section-subtitle mt-1">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={contentClassName}>{children}</div>
    </section>
  );
}
