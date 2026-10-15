import type { CSSProperties, ReactNode } from 'react';

export type StatPillTone = 'default' | 'warm' | 'success';

interface StatPillProps {
  label: string;
  value: ReactNode;
  tone?: StatPillTone;
  className?: string;
  style?: CSSProperties;
}

const toneClassMap: Record<StatPillTone, string> = {
  default: 'border-[#E7E0D6] bg-[#FAF7F2] text-[#1C1917]',
  warm: 'border-[#C84B31]/25 bg-[#F9F1EA] text-[#9A3412]',
  success: 'border-[#3F624D]/25 bg-[#ECF5F0] text-[#2F6F4E]',
};

const labelToneMap: Record<StatPillTone, string> = {
  default: 'text-[#78716C]',
  warm: 'text-[#9A3412]',
  success: 'text-[#2F6F4E]',
};

export function StatPill({ label, value, tone = 'default', className = '', style }: StatPillProps) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3 transition-colors ${toneClassMap[tone]} ${className}`.trim()}
      style={style}
    >
      <p className={`text-[11px] font-semibold uppercase tracking-[0.1em] ${labelToneMap[tone]}`}>
        {label}
      </p>
      <p className="mt-1 text-base font-semibold tabular-nums leading-snug">{value}</p>
    </div>
  );
}
