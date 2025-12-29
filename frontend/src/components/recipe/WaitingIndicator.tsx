import { useEffect, useState } from 'react';

const waitingContent = [
  {
    icon: '🔍',
    message: 'Analyzing your preferences...',
    tip: 'Matching flavors with your taste profile',
  },
  {
    icon: '💡',
    message: 'Exploring culinary possibilities...',
    tip: 'Did you know? Searing meat at high heat creates the Maillard reaction',
  },
  {
    icon: '🥕',
    message: 'Selecting the perfect ingredients...',
    tip: 'Pro tip: Room temperature ingredients mix better in baking',
  },
  {
    icon: '📝',
    message: 'Crafting cooking instructions...',
    tip: 'Fun fact: Resting meat after cooking redistributes juices',
  },
  {
    icon: '🧮',
    message: 'Calculating nutritional information...',
    tip: 'Tip: Adding acid (lemon/vinegar) brightens flavors',
  },
  {
    icon: '✨',
    message: 'Putting the finishing touches...',
    tip: 'Almost ready! Fresh herbs are best added at the end',
  },
  {
    icon: '👨‍🍳',
    message: 'Perfecting the recipe...',
    tip: 'Chef secret: Taste as you cook and adjust seasoning',
  },
  {
    icon: '🌶️',
    message: 'Balancing the flavors...',
    tip: 'Salt enhances sweetness, sugar balances heat',
  },
];

interface WaitingIndicatorProps {
  className?: string;
}

export function WaitingIndicator({ className = '' }: WaitingIndicatorProps) {
  const [contentIndex, setContentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      // Start fade-out
      setIsTransitioning(true);

      // After fade-out completes, update content and fade in
      setTimeout(() => {
        setContentIndex(prev => (prev + 1) % waitingContent.length);
        setIsTransitioning(false);
      }, 300); // Match CSS transition duration
    }, 3500); // Rotate every 3.5 seconds

    return () => clearInterval(interval);
  }, []);

  const current = waitingContent[contentIndex];

  return (
    <div
      className={`bg-gradient-to-br from-orange-50 via-orange-100 to-yellow-50 border-2 border-orange-300 rounded-2xl p-8 min-h-[180px] animate-glow-pulse ${className}`}
      role="status"
      aria-live="polite"
      aria-label="Recipe generation in progress"
    >
      {/* Rotating Icon */}
      <div
        className={`text-6xl mb-4 text-center animate-bounce-slow transition-opacity duration-300 ${
          isTransitioning ? 'opacity-0' : 'opacity-100'
        }`}
      >
        {current.icon}
      </div>

      {/* Main Message */}
      <h3
        className={`text-2xl font-bold text-orange-900 mb-2 text-center transition-opacity duration-300 ${
          isTransitioning ? 'opacity-0' : 'opacity-100'
        }`}
      >
        {current.message}
      </h3>

      {/* Cooking Tip/Fun Fact */}
      <p
        className={`text-gray-700 italic mb-4 text-center transition-opacity duration-300 ${
          isTransitioning ? 'opacity-0' : 'opacity-100'
        }`}
      >
        {current.tip}
      </p>

      {/* Indeterminate Progress Bar */}
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-orange-400 via-orange-500 to-orange-400 bg-[length:200%_100%] animate-shimmer-fast" />
      </div>

      {/* Floating Food Emoji Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-10 rounded-2xl">
        {['🥕', '🍅', '🧄', '🧅', '🌶️', '🥬'].map((emoji, idx) => (
          <div
            key={idx}
            className="absolute animate-float"
            style={{
              left: `${Math.random() * 80 + 10}%`,
              top: `${Math.random() * 80 + 10}%`,
              animationDelay: `${idx * 0.5}s`,
              fontSize: '3rem',
            }}
          >
            {emoji}
          </div>
        ))}
      </div>
    </div>
  );
}
