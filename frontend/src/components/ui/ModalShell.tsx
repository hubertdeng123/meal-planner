import { useEffect, useId, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon } from './AppIcons';

type ModalSize = 'sm' | 'md' | 'lg';

const sizeMap: Record<ModalSize, string> = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
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
  const titleId = useId();

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

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const handleBackdropClick = () => {
    if (closeOnBackdrop) {
      onClose?.();
    }
  };

  return createPortal(
    <div
      className="modal-overlay flex items-end justify-center overflow-y-auto animate-fade-in sm:items-center sm:p-6"
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        className={`relative flex max-h-[92vh] w-full flex-col rounded-t-2xl border border-stone-900/[0.06] bg-white shadow-xl animate-slide-in-up sm:rounded-2xl ${sizeMap[size]} ${className}`}
        onClick={event => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
      >
        {(title || description || (!hideCloseButton && onClose)) && (
          <div className="flex items-start justify-between gap-4 px-6 pb-2 pt-5">
            <div className="min-w-0">
              {title && (
                <h3 id={titleId} className="text-lg font-semibold text-stone-900">
                  {title}
                </h3>
              )}
              {description && <p className="mt-1 text-sm text-stone-600">{description}</p>}
            </div>
            {!hideCloseButton && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="icon-button-muted -mr-2 -mt-1 shrink-0"
                aria-label="Close dialog"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            )}
          </div>
        )}
        {children ? (
          <div className={`overflow-y-auto px-6 py-3 ${bodyClassName}`}>{children}</div>
        ) : null}
        {footer && (
          <div className="mt-2 flex flex-col-reverse gap-2 border-t border-stone-100 bg-stone-50/60 px-6 py-4 sm:flex-row sm:justify-end sm:rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
