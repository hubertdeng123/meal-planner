import type { ReactNode } from 'react';

type ModalSize = 'sm' | 'md' | 'lg';

const sizeMap: Record<ModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
};

interface ModalShellProps {
  children: ReactNode;
  size?: ModalSize;
  className?: string;
}

export function ModalShell({ children, size = 'md', className = '' }: ModalShellProps) {
  return (
    <div className="modal-overlay overflow-y-auto h-full w-full animate-fade-in">
      <div className={`modal-container top-20 ${sizeMap[size]}`}>
        <div
          className={`modal-panel animate-scale-in animate-slide-in-up ${className}`}
          style={{ animationDuration: '0.25s' }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
