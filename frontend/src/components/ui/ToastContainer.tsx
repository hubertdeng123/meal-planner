import type { ComponentType } from 'react';
import { useToast, type ToastType } from '../../contexts/ToastContext';
import {
  CheckCircleSolidIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon,
  XMarkIcon,
  type AppIconProps,
} from './AppIcons';

const toastStyles: Record<ToastType, { icon: ComponentType<AppIconProps>; iconClass: string }> = {
  success: { icon: CheckCircleSolidIcon, iconClass: 'text-emerald-500' },
  error: { icon: XCircleIcon, iconClass: 'text-red-500' },
  warning: { icon: ExclamationTriangleIcon, iconClass: 'text-amber-500' },
  info: { icon: InformationCircleIcon, iconClass: 'text-sky-500' },
};

export default function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:items-end"
      aria-live="polite"
    >
      {toasts.map(toast => {
        const { icon: Icon, iconClass } = toastStyles[toast.type];
        return (
          <div
            key={toast.id}
            role="status"
            className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl bg-stone-900 px-4 py-3 text-sm text-white shadow-xl animate-toast-in"
          >
            <Icon className={`mt-0.5 h-5 w-5 flex-shrink-0 ${iconClass}`} />
            <span className="flex-1 leading-snug">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="-mr-1 rounded-md p-0.5 text-stone-400 transition-colors hover:text-white"
              aria-label="Dismiss notification"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
