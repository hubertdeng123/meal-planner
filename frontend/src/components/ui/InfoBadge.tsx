interface InfoBadgeProps {
  icon: string;
  label: string;
  value: string | number;
  className?: string;
}

export function InfoBadge({ icon, label, value, className = '' }: InfoBadgeProps) {
  return (
    <div
      className={`flex flex-col items-center gap-1 rounded-2xl border border-[#E7E0D6] bg-[#FAF7F2] px-4 py-3 ${className}`.trim()}
    >
      <div className="flex items-center gap-1.5">
        <span className="text-lg" aria-hidden="true">
          {icon}
        </span>
        <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[#78716C]">
          {label}
        </span>
      </div>
      <div className="text-base font-semibold tabular-nums text-[#1C1917]">{value}</div>
    </div>
  );
}
