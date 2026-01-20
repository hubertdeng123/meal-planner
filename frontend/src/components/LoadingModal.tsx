import { useState, useEffect, useRef } from 'react';

interface LoadingModalProps {
  isOpen: boolean;
  message?: string;
  thinkingTokens?: string[];
  isThinking?: boolean;
}

export function LoadingModal({
  isOpen,
  message = 'Generating your recipe...',
  thinkingTokens = [],
  isThinking = false,
}: LoadingModalProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const thinkingEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new thinking tokens arrive
  useEffect(() => {
    if (isExpanded && thinkingEndRef.current) {
      thinkingEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [thinkingTokens, isExpanded]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-lg glass-panel p-8">
        <div className="flex flex-col items-center gap-4">
          {/* Spinner */}
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#f97316]/20 border-t-[#f97316]" />

          {/* Message */}
          <p className="text-lg font-semibold text-slate-900">{message}</p>

          {/* Thinking indicator */}
          {isThinking && (
            <div className="flex items-center gap-2 text-sm text-[#f97316]">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-[#f97316]" />
              <span>Thinking...</span>
            </div>
          )}

          {/* Collapsible thinking section */}
          {thinkingTokens.length > 0 && (
            <div className="w-full">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex w-full items-center justify-between rounded-xl bg-[#fff6f7] px-4 py-2 text-sm text-[#ea580c] transition-colors hover:bg-[#ffecef]"
              >
                <span className="flex items-center gap-2">
                  <span className="text-lg">🧠</span>
                  Peek behind the curtain ({thinkingTokens.length})
                </span>
                <span className="text-[#f97316]">{isExpanded ? '▲' : '▼'}</span>
              </button>

              {isExpanded && (
                <div className="mt-2 max-h-48 overflow-y-auto rounded-xl bg-slate-50 p-4">
                  <div className="space-y-2 font-mono text-xs text-slate-600">
                    {thinkingTokens.map((token, index) => (
                      <p key={index} className="leading-relaxed">
                        {token}
                      </p>
                    ))}
                    <div ref={thinkingEndRef} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
