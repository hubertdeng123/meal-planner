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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-lg rounded-3xl border border-orange-200/70 bg-white p-8 shadow-2xl">
        <div className="flex flex-col items-center gap-4">
          {/* Spinner */}
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-orange-200 border-t-orange-600" />

          {/* Message */}
          <p className="text-lg font-semibold text-orange-950">{message}</p>

          {/* Thinking indicator */}
          {isThinking && (
            <div className="flex items-center gap-2 text-sm text-orange-600">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-orange-500" />
              <span>AI is reasoning...</span>
            </div>
          )}

          {/* Collapsible thinking section */}
          {thinkingTokens.length > 0 && (
            <div className="w-full">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex w-full items-center justify-between rounded-xl bg-orange-50 px-4 py-2 text-sm text-orange-700 transition-colors hover:bg-orange-100"
              >
                <span className="flex items-center gap-2">
                  <span className="text-lg">🧠</span>
                  See AI thinking ({thinkingTokens.length} thoughts)
                </span>
                <span className="text-orange-400">{isExpanded ? '▲' : '▼'}</span>
              </button>

              {isExpanded && (
                <div className="mt-2 max-h-48 overflow-y-auto rounded-xl bg-gray-50 p-4">
                  <div className="space-y-2 font-mono text-xs text-gray-600">
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
