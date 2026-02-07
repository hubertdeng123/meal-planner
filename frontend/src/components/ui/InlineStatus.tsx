interface InlineStatusProps {
  label: string;
  tone?: 'neutral' | 'success' | 'warning' | 'error';
  className?: string;
}

const toneMap = {
  neutral: 'bg-stone-100 text-stone-700 border-stone-200',
  success: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-100 text-amber-700 border-amber-200',
  error: 'bg-red-100 text-red-700 border-red-200',
};

export function InlineStatus({ label, tone = 'neutral', className = '' }: InlineStatusProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${toneMap[tone]} ${className}`}
    >
      {label}
    </span>
  );
}
