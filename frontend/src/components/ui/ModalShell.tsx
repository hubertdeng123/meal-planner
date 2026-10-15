import { useEffect, useId, type ReactNode } from 'react';
import { XMarkIcon } from './AppIcons';

type ModalSize = 'sm' | 'md' | 'lg';

const sizeMap: Record<ModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
};

interface ModalShellProps {
  children?: ReactNode;
  size?: ModalSize;
  className?: string;
  onClose?: () => void;
  closeOnBackdrop?: boolean;
  title?: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  hideCloseButton?: boolean;
  bodyClassName?: string;
}

export function ModalShell({
  children,
  size = 'md',
  className = '',
  onClose,
  closeOnBackdrop = true,
  title,
  description,
  footer,
  hideCloseButton = false,
  bodyClassName = '',
}: ModalShellProps) {
  const dialogId = useId();
  const titleId = title ? `${dialogId}-title` : undefined;
  const descriptionId = description ? `${dialogId}-description` : undefined;

  useEffect(() => {
    if (!onClose) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const handleBackdropClick = () => {
    if (closeOnBackdrop) {
      onClose?.();
    }
  };

  return (
    <div
      className="modal-overlay overflow-y-auto h-full w-full animate-fade-in"
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div className={`modal-container top-16 sm:top-20 pb-12 ${sizeMap[size]}`}>
        <div
          className={`modal-panel animate-scale-in ${className}`.trim()}
          style={{ animationDuration: '0.2s' }}
          onClick={event => event.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
        >
          {(title || description || (!hideCloseButton && onClose)) && (
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                {title && (
                  <h3
                    id={titleId}
                    className="font-display text-xl font-semibold text-[#1C1917] tracking-tight"
                  >
                    {title}
                  </h3>
                )}
                {description && (
                  <p id={descriptionId} className="mt-1.5 text-sm text-[#57534E] leading-relaxed">
                    {description}
                  </p>
                )}
              </div>
              {!hideCloseButton && onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="icon-button-muted shrink-0"
                  aria-label="Close dialog"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              )}
            </div>
          )}
          {children ? <div className={bodyClassName}>{children}</div> : null}
          {footer && <div className="mt-6 flex flex-wrap justify-end gap-2.5">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
