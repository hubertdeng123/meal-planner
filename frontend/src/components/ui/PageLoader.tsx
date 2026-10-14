interface PageLoaderProps {
  label?: string;
  testId?: string;
  className?: string;
}

export function Spinner({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
      aria-hidden="true"
    />
  );
}

export function PageLoader({ label = 'Loading...', testId, className = '' }: PageLoaderProps) {
  return (
    <div
      className={`flex h-64 flex-col items-center justify-center gap-3 text-stone-500 ${className}`}
      role="status"
    >
      <span
        className="h-9 w-9 animate-spin rounded-full border-[3px] border-stone-200"
        style={{ borderTopColor: 'var(--primary)' }}
        data-testid={testId}
      />
      <span className="text-sm">{label}</span>
    </div>
  );
}
