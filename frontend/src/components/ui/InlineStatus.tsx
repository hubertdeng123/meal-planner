interface InlineStatusProps {
  label: string;
  tone?: 'neutral' | 'success' | 'warning' | 'error';
  className?: string;
}

const toneMap = {
  neutral: { pill: 'bg-stone-100 text-stone-700', dot: 'bg-stone-400' },
  success: { pill: 'bg-emerald-50 text-emerald-800', dot: 'bg-emerald-500' },
  warning: { pill: 'bg-amber-50 text-amber-800', dot: 'bg-amber-500' },
  error: { pill: 'bg-red-50 text-red-700', dot: 'bg-red-500' },
};

export function InlineStatus({ label, tone = 'neutral', className = '' }: InlineStatusProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${toneMap[tone].pill} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${toneMap[tone].dot}`} />
      {label}
    </span>
  );
}
