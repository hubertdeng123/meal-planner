import { useState, useEffect, Fragment } from 'react';
import { SparkleWandIcon } from './ui/AppIcons';

const CheckIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2.5}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

interface LoadingModalProps {
  isOpen: boolean;
  message?: string;
  thinkingTokens?: string[];
  isThinking?: boolean;
  onCancel?: () => void;
}

const PHASES = [
  { label: 'Reviewing taste profile & pantry', step: '01' },
  { label: 'Balancing ingredients & timings', step: '02' },
  { label: 'Plating your custom recipe', step: '03' },
];

export function LoadingModal({
  isOpen,
  message = 'Generating your recipe...',
  isThinking = false,
  onCancel,
}: LoadingModalProps) {
  const [currentPhase, setCurrentPhase] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setCurrentPhase(0);
      return;
    }

    setCurrentPhase(0);

    const timer = setInterval(() => {
      setCurrentPhase(prev => (prev < 2 ? prev + 1 : prev));
    }, 4000);

    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <style>{`
        @keyframes thinking-dot {
          0%, 20% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
          80%, 100% { opacity: 0.3; transform: scale(1); }
        }
      `}</style>

      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-[#1C1917]/45 backdrop-blur-xs animate-fade-in"
        role="dialog"
        aria-modal="true"
        aria-label={message}
      >
        <div className="relative mx-4 w-full max-w-md rounded-3xl border border-[#E7E0D6] bg-[#FAF7F2] p-7 sm:p-8 shadow-elevated animate-scale-in loading-panel-shimmer">
          {/* Header badge & spinner */}
          <div className="mb-5 flex flex-col items-center text-center">
            <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#C84B31]/20 bg-[#F9F1EA]">
              <div
                className="absolute inset-0 rounded-2xl border-2 border-transparent animate-spin"
                style={{
                  borderTopColor: 'var(--primary)',
                  borderRightColor: 'var(--primary-soft)',
                  animationDuration: '1.8s',
                }}
              />
              <SparkleWandIcon size={28} />
            </div>

            <span className="eyebrow text-[#B83B22]">AI Chef Studio</span>
            <h2 className="mt-1.5 font-display text-2xl font-semibold text-[#1C1917] tracking-tight">
              {message}
            </h2>
          </div>

          {/* Editorial Stepper Track */}
          <div className="rounded-2xl border border-[#E7E0D6] bg-white p-4 space-y-3">
            {PHASES.map((phase, idx) => {
              const isCompleted = idx < currentPhase;
              const isCurrent = idx === currentPhase;

              return (
                <Fragment key={phase.step}>
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-mono font-medium transition-colors duration-300 ${
                        isCompleted
                          ? 'bg-[#ECF5F0] text-[#2F6F4E] border border-[#3F624D]/25'
                          : isCurrent
                            ? 'bg-[#C84B31] text-white shadow-xs'
                            : 'bg-[#FAF7F2] text-[#78716C] border border-[#E7E0D6]'
                      }`}
                    >
                      {isCompleted ? <CheckIcon className="h-3.5 w-3.5" /> : phase.step}
                    </div>
                    <span
                      className={`text-sm transition-colors duration-300 ${
                        isCurrent
                          ? 'font-semibold text-[#1C1917]'
                          : isCompleted
                            ? 'font-medium text-[#57534E]'
                            : 'text-[#78716C]'
                      }`}
                    >
                      {phase.label}
                    </span>
                  </div>
                </Fragment>
              );
            })}
          </div>

          {/* Thinking indicator */}
          {isThinking && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    className="h-1.5 w-1.5 rounded-full"
                    style={{
                      backgroundColor: 'var(--primary)',
                      animation: 'thinking-dot 1.4s ease-in-out infinite',
                      animationDelay: `${i * 0.2}s`,
                    }}
                  />
                ))}
              </div>
              <span className="text-xs font-medium uppercase tracking-[0.12em] text-[#78716C]">
                Chef is composing notes...
              </span>
            </div>
          )}

          {onCancel && (
            <div className="mt-6 flex justify-center">
              <button onClick={onCancel} type="button" className="btn-secondary px-5 py-2 text-xs">
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
