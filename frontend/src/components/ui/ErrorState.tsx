import { ArrowPathIcon, ExclamationTriangleIcon } from './AppIcons';

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Couldn't load this",
  description = 'Check your connection and try again.',
  onRetry,
  className = '',
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={`rounded-2xl border border-red-200/70 bg-red-50/60 px-6 py-12 text-center animate-fade-in ${className}`}
    >
      <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-white text-red-500 shadow-xs">
        <ExclamationTriangleIcon className="h-5 w-5" />
      </div>
      <h2 className="font-display text-xl font-semibold text-stone-900">{title}</h2>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-stone-600">{description}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-secondary mt-6">
          <ArrowPathIcon className="h-4 w-4" />
          Try again
        </button>
      )}
    </div>
  );
}
