import type { ReactNode } from 'react';

interface ToolbarRowProps {
  children: ReactNode;
  helper?: ReactNode;
  className?: string;
  controlsClassName?: string;
}

export function ToolbarRow({
  children,
  helper,
  className = '',
  controlsClassName = '',
}: ToolbarRowProps) {
  const resolvedControlsClassName =
    controlsClassName || (helper ? 'md:grid-cols-[1fr_auto]' : 'md:grid-cols-1');

  return (
    <div className={`mt-6 surface-muted p-4 sm:p-5 ${className}`}>
      <div className={`grid gap-3 md:items-center ${resolvedControlsClassName}`}>
        {children}
        {helper ? <div className="text-xs text-stone-500 md:text-right">{helper}</div> : null}
      </div>
    </div>
  );
}
