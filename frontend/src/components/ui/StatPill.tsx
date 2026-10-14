import type { CSSProperties, ReactNode } from 'react';

type StatPillTone = 'default' | 'warm' | 'success';

interface StatPillProps {
  label: string;
  value: ReactNode;
  tone?: StatPillTone;
  hint?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

const toneClassMap: Record<StatPillTone, string> = {
  default: 'bg-stone-50 border-stone-200/80 text-stone-900',
  warm: 'bg-[var(--accent-soft)] border-[rgba(226,87,47,0.16)] text-[var(--accent-ink)]',
  success: 'bg-[var(--primary-soft)] border-[rgba(31,111,74,0.16)] text-[var(--primary-ink)]',
};

export function StatPill({
  label,
  value,
  tone = 'default',
  hint,
  className = '',
  style,
}: StatPillProps) {
  return (
    <div className={`rounded-xl border px-3.5 py-3 ${toneClassMap[tone]} ${className}`} style={style}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] opacity-70">{label}</p>
      <p className="mt-1 text-lg font-semibold leading-tight tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-xs opacity-70">{hint}</p>}
    </div>
  );
}
