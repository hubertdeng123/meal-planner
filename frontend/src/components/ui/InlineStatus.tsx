export type InlineStatusTone = 'neutral' | 'success' | 'warning' | 'error';

interface InlineStatusProps {
  label: string;
  tone?: InlineStatusTone;
  className?: string;
}

const toneMap: Record<InlineStatusTone, string> = {
  neutral: 'bg-[#F3EFE6] text-[#57534E] border-[#E7E0D6]',
  success: 'bg-[#ECF5F0] text-[#2F6F4E] border-[#3F624D]/25',
  warning: 'bg-[#FEF3C7] text-[#92400E] border-[#B45309]/25',
  error: 'bg-[#FEE2E2] text-[#991B1B] border-[#B91C1C]/25',
};

const dotMap: Record<InlineStatusTone, string> = {
  neutral: 'bg-[#78716C]',
  success: 'bg-[#2F6F4E]',
  warning: 'bg-[#92400E]',
  error: 'bg-[#991B1B]',
};

export function InlineStatus({ label, tone = 'neutral', className = '' }: InlineStatusProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${toneMap[tone]} ${className}`.trim()}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotMap[tone]}`} aria-hidden="true" />
      {label}
    </span>
  );
}
