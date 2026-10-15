import { useToast, type ToastType } from '../../contexts/ToastContext';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from './AppIcons';

const toastStyles: Record<
  ToastType,
  { container: string; iconColor: string; Icon: typeof CheckCircleIcon }
> = {
  success: {
    container: 'border-[#3F624D]/30 bg-[#ECF5F0] text-[#1C1917]',
    iconColor: 'text-[#2F6F4E]',
    Icon: CheckCircleIcon,
  },
  error: {
    container: 'border-[#B91C1C]/30 bg-[#FEE2E2] text-[#1C1917]',
    iconColor: 'text-[#B91C1C]',
    Icon: ExclamationCircleIcon,
  },
  warning: {
    container: 'border-[#B45309]/30 bg-[#FEF3C7] text-[#1C1917]',
    iconColor: 'text-[#B45309]',
    Icon: ExclamationTriangleIcon,
  },
  info: {
    container: 'border-[#C84B31]/30 bg-[#F9F1EA] text-[#1C1917]',
    iconColor: 'text-[#C84B31]',
    Icon: CheckCircleIcon,
  },
};

export default function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-20 md:bottom-6 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full px-4 sm:px-0 pointer-events-none"
      role="status"
      aria-live="polite"
    >
      {toasts.map(toast => {
        const style = toastStyles[toast.type] || toastStyles.info;
        const Icon = style.Icon;

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 shadow-elevated backdrop-blur-md animate-slide-in-up ${style.container}`}
          >
            <div className="flex items-start gap-2.5 min-w-0">
              <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${style.iconColor}`} />
              <span className="text-sm font-medium leading-snug break-words">{toast.message}</span>
            </div>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="rounded-full p-1 text-[#57534E] hover:bg-black/5 hover:text-[#1C1917] transition-colors shrink-0"
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
