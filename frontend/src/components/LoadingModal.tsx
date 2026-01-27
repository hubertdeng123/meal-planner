import { useState, useEffect, Fragment } from 'react';

// Inline CheckIcon component for completed steps
const CheckIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

interface LoadingModalProps {
  isOpen: boolean;
  message?: string;
  thinkingTokens?: string[];
  isThinking?: boolean;
}

const PHASES = [
  { label: 'Gathering inspiration', icon: '✨' },
  { label: 'Selecting ingredients', icon: '🥬' },
  { label: 'Crafting your recipe', icon: '📜' },
];

export function LoadingModal({
  isOpen,
  message = 'Generating your recipe...',
  isThinking = false,
}: LoadingModalProps) {
  const [currentPhase, setCurrentPhase] = useState(0);

  // Time-based phase progression: advance every 4 seconds for even distribution
  useEffect(() => {
    if (!isOpen) {
      setCurrentPhase(0);
      return;
    }

    // Reset to phase 0 when modal opens
    setCurrentPhase(0);

    const timer = setInterval(() => {
      setCurrentPhase(prev => (prev < 2 ? prev + 1 : prev));
    }, 4000); // Advance phase every 4 seconds

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
        @keyframes phase-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `}</style>

      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
        {/* Warm atmospheric glow - OUTSIDE the panel */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className="w-96 h-96 rounded-full animate-warm-glow"
            style={{
              background:
                'radial-gradient(circle, rgba(232, 93, 4, 0.25) 0%, rgba(251, 146, 60, 0.15) 30%, transparent 70%)',
            }}
          />
        </div>

        {/* The modal panel - clean, no floating elements inside */}
        <div className="relative mx-4 w-full max-w-md glass-panel p-8 animate-scale-in loading-panel-shimmer">
          {/* Spinner with center icon */}
          <div className="relative mb-6 flex justify-center">
            <div
              className="absolute h-20 w-20 rounded-full blur-2xl animate-pulse"
              style={{ backgroundColor: 'var(--primary-soft)' }}
            />
            <div
              className="relative h-16 w-16 animate-spin rounded-full border-4"
              style={{
                borderColor: 'var(--primary-soft)',
                borderTopColor: 'var(--primary)',
              }}
            />
            {/* Center icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl">🍳</span>
            </div>
          </div>

          {/* Message */}
          <h2 className="text-center text-lg font-semibold text-stone-900 mb-6">{message}</h2>

          {/* Stepper progress track */}
          <div className="flex items-center justify-center mb-4">
            {PHASES.map((phase, idx) => (
              <Fragment key={idx}>
                {/* Connector line */}
                {idx > 0 && (
                  <div
                    className={`h-0.5 w-8 transition-all duration-500 ease-out ${
                      idx <= currentPhase ? 'bg-primary' : 'bg-stone-200'
                    }`}
                  />
                )}

                {/* Step */}
                <div className="flex flex-col items-center">
                  <div
                    className={`relative flex items-center justify-center rounded-full transition-all duration-500 ease-out ${
                      idx === currentPhase ? 'w-11 h-11' : 'w-8 h-8'
                    } ${
                      idx < currentPhase
                        ? 'bg-emerald-100'
                        : idx === currentPhase
                          ? 'bg-primary-soft'
                          : 'bg-stone-100'
                    }`}
                    style={{
                      boxShadow:
                        idx === currentPhase
                          ? '0 0 20px rgba(232, 93, 4, 0.3), 0 0 40px rgba(232, 93, 4, 0.1)'
                          : '0 0 0px rgba(232, 93, 4, 0), 0 0 0px rgba(232, 93, 4, 0)',
                      animation:
                        idx === currentPhase ? 'phase-pulse 2s ease-in-out infinite' : 'none',
                    }}
                  >
                    {/* Layered icon and checkmark for crossfade */}
                    <span
                      className="absolute transition-all duration-300 ease-out"
                      style={{
                        opacity: idx < currentPhase ? 0 : idx === currentPhase ? 1 : 0.4,
                        transform: idx < currentPhase ? 'scale(0.5)' : 'scale(1)',
                        fontSize: idx === currentPhase ? '1.25rem' : '1rem',
                      }}
                    >
                      {phase.icon}
                    </span>
                    <span
                      className="absolute transition-all duration-300 ease-out"
                      style={{
                        opacity: idx < currentPhase ? 1 : 0,
                        transform: idx < currentPhase ? 'scale(1)' : 'scale(0.5)',
                      }}
                    >
                      <CheckIcon className="w-4 h-4 text-emerald-600" />
                    </span>
                  </div>

                  {/* Label - always rendered, animated with opacity and transform */}
                  <div
                    className="overflow-hidden transition-all duration-500 ease-out"
                    style={{
                      maxHeight: idx === currentPhase ? '2rem' : '0',
                      opacity: idx === currentPhase ? 1 : 0,
                      transform: idx === currentPhase ? 'translateY(0)' : 'translateY(-4px)',
                    }}
                  >
                    <span className="mt-2 block text-xs font-semibold text-stone-600 text-center whitespace-nowrap">
                      {phase.label}
                    </span>
                  </div>
                </div>
              </Fragment>
            ))}
          </div>

          {/* Thinking indicator */}
          {isThinking && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                      backgroundColor: 'var(--primary)',
                      animation: 'thinking-dot 1.4s ease-in-out infinite',
                      animationDelay: `${i * 0.2}s`,
                    }}
                  />
                ))}
              </div>
              <span className="text-sm text-stone-500 font-medium">Thinking</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
