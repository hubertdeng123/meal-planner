import type { CSSProperties, ReactNode } from 'react';

type StatPillTone = 'default' | 'warm' | 'success';

interface StatPillProps {
  label: string;
  value: ReactNode;
  tone?: StatPillTone;
  className?: string;
  style?: CSSProperties;
}

const toneClassMap: Record<StatPillTone, string> = {
  default: 'border-stone-200/70 bg-white text-stone-700',
  warm: 'border-orange-200/70 bg-orange-50/80 text-orange-800',
  success: 'border-emerald-200/70 bg-emerald-50/80 text-emerald-800',
};

export function StatPill({ label, value, tone = 'default', className = '', style }: StatPillProps) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3 ${toneClassMap[tone]} ${className}`}
      style={style}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide opacity-75">{label}</p>
      <p className="mt-1 text-base font-semibold">{value}</p>
    </div>
  );
}
