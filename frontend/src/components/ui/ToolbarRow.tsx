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
  return (
    <div className={`mb-6 ${className}`}>
      <div className={`flex flex-col gap-3 md:flex-row md:items-center ${controlsClassName}`}>
        {children}
      </div>
      {helper ? <p className="mt-2 text-xs text-stone-500">{helper}</p> : null}
    </div>
  );
}
