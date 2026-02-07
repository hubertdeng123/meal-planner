import { useId } from 'react';

// Premium custom illustrated SVG icons for Hungry Helper
// Each icon uses gradients and multiple colors for depth and personality

interface IconProps {
  className?: string;
  size?: number;
}

// Brand logo - Friendly smiling bowl with steam and sparkle
export function HungryHelperLogo({ className = '', size = 32 }: IconProps) {
  const iconId = useId().replace(/:/g, '');
  const badgeGradId = `hh-badge-${iconId}`;
  const bowlGradId = `hh-bowl-${iconId}`;
  const brothGradId = `hh-broth-${iconId}`;
  const steamGradId = `hh-steam-${iconId}`;
  const leafGradId = `hh-leaf-${iconId}`;

  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient
          id={badgeGradId}
          x1="4"
          y1="4"
          x2="28"
          y2="28"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#fdba74" />
          <stop offset="52%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#ea580c" />
        </linearGradient>
        <linearGradient
          id={bowlGradId}
          x1="8"
          y1="15"
          x2="24"
          y2="24"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#fffaf0" />
          <stop offset="100%" stopColor="#fed7aa" />
        </linearGradient>
        <linearGradient
          id={brothGradId}
          x1="10"
          y1="14"
          x2="22"
          y2="19"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#fed7aa" />
          <stop offset="100%" stopColor="#fb923c" />
        </linearGradient>
        <linearGradient
          id={steamGradId}
          x1="12"
          y1="6"
          x2="21"
          y2="13"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#fef3c7" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
        <linearGradient
          id={leafGradId}
          x1="20"
          y1="10"
          x2="26"
          y2="5"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#16a34a" />
        </linearGradient>
      </defs>

      <ellipse cx="16" cy="26.9" rx="8.5" ry="2.3" fill="#cbd5e1" opacity="0.35" />

      <circle cx="16" cy="16" r="13" fill={`url(#${badgeGradId})`} />
      <circle cx="16" cy="16" r="10.5" fill="#fffaf4" opacity="0.96" />

      <path
        d="M8.8 16.15C8.8 14.85 9.85 13.8 11.15 13.8H20.85C22.15 13.8 23.2 14.85 23.2 16.15V19.45C23.2 22.15 21.01 24.35 18.3 24.35H13.7C10.99 24.35 8.8 22.15 8.8 19.45V16.15Z"
        fill={`url(#${bowlGradId})`}
        stroke="#ea580c"
        strokeWidth="1.1"
      />
      <path
        d="M9.4 16.1C11.15 15.35 12.45 15.05 13.95 15.05C15.45 15.05 16.55 15.3 18.15 16.05C19.05 16.45 19.88 16.58 20.6 16.58C21.45 16.58 22.1 16.38 22.6 16.1V18.6C22.6 21.02 20.65 22.98 18.23 22.98H13.77C11.35 22.98 9.4 21.02 9.4 18.6V16.1Z"
        fill={`url(#${brothGradId})`}
        opacity="0.95"
      />
      <path d="M8.7 16.2H23.3" stroke="#fb923c" strokeWidth="1.2" strokeLinecap="round" />

      <circle cx="13.5" cy="18.2" r="0.72" fill="#9a3412" />
      <circle cx="18.5" cy="18.2" r="0.72" fill="#9a3412" />
      <path
        d="M13.35 20.25C14.08 21.05 14.95 21.45 16 21.45C17.05 21.45 17.92 21.05 18.65 20.25"
        stroke="#9a3412"
        strokeWidth="1.05"
        strokeLinecap="round"
      />

      <path
        d="M13.1 12.45C12.4 11.4 12.62 10.45 13.58 9.52C14.28 8.82 14.4 8.02 13.95 7.22"
        stroke={`url(#${steamGradId})`}
        strokeWidth="1.18"
        strokeLinecap="round"
      />
      <path
        d="M16.1 12.1C15.52 11.22 15.7 10.35 16.45 9.62C17.02 9.05 17.15 8.4 16.8 7.65"
        stroke={`url(#${steamGradId})`}
        strokeWidth="1.18"
        strokeLinecap="round"
      />
      <path
        d="M19.08 12.38C18.5 11.55 18.65 10.7 19.38 9.95C20 9.3 20.1 8.58 19.7 7.82"
        stroke={`url(#${steamGradId})`}
        strokeWidth="1.18"
        strokeLinecap="round"
      />

      <path
        d="M24.3 4.95C25.35 5.58 26.15 4.78 25.52 3.75C26.55 4.38 27.35 3.58 26.72 2.55C27.35 3.58 28.15 4.38 29.18 3.75C28.55 4.78 29.35 5.58 30.38 4.95C29.35 5.58 28.55 6.38 29.18 7.4C28.15 6.78 27.35 7.58 27.98 8.6C27.35 7.58 26.55 6.78 25.52 7.4C26.15 6.38 25.35 5.58 24.3 4.95Z"
        fill="#fde68a"
        opacity="0.9"
      />

      <path
        d="M20.5 10.1C21.38 8.55 22.7 8.15 23.9 8.95C24.98 9.68 25.02 10.98 24.15 11.72C23.45 12.32 22.48 12.35 21.78 11.82C21.08 12.35 20.1 12.32 19.4 11.72C18.53 10.98 18.58 9.68 19.65 8.95C20.01 8.72 20.4 8.68 20.78 8.8"
        fill={`url(#${leafGradId})`}
      />
      <circle cx="11.2" cy="10.6" r="1.35" fill="white" opacity="0.42" />
    </svg>
  );
}

// Calendar with meal planning sparkle
export function CalendarMealIcon({ className = '', size = 32 }: IconProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="calGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#ea580c" />
        </linearGradient>
        <linearGradient id="calHeader" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#c2410c" />
          <stop offset="100%" stopColor="#9a3412" />
        </linearGradient>
      </defs>
      {/* Calendar body */}
      <rect x="4" y="8" width="24" height="20" rx="3" fill="white" />
      <rect x="4" y="8" width="24" height="20" rx="3" stroke="#e7e5e4" strokeWidth="1" />
      {/* Calendar header */}
      <rect x="4" y="8" width="24" height="7" rx="3" fill="url(#calGrad)" />
      <rect x="4" y="12" width="24" height="3" fill="url(#calGrad)" />
      {/* Calendar rings */}
      <rect x="9" y="5" width="3" height="6" rx="1.5" fill="url(#calHeader)" />
      <rect x="20" y="5" width="3" height="6" rx="1.5" fill="url(#calHeader)" />
      {/* Calendar dots/events */}
      <circle cx="10" cy="20" r="2" fill="#fed7aa" />
      <circle cx="16" cy="20" r="2" fill="#bbf7d0" />
      <circle cx="22" cy="20" r="2" fill="#fef08a" />
      <circle cx="10" cy="25" r="2" fill="#fecaca" />
      <circle cx="16" cy="25" r="2" fill="#fed7aa" />
      {/* Sparkle accent */}
      <path d="M25 3l1-2 1 2 2 1-2 1-1 2-1-2-2-1z" fill="#fbbf24" />
    </svg>
  );
}

// Grocery bag with colorful veggies peeking out
export function GroceryBagIcon({ className = '', size = 32 }: IconProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="bagGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <linearGradient id="carrotGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#ea580c" />
        </linearGradient>
      </defs>
      {/* Bag body */}
      <path d="M5 13h22l-2.5 15a2 2 0 01-2 1.7H9.5a2 2 0 01-2-1.7L5 13z" fill="url(#bagGrad)" />
      {/* Bag fold */}
      <path d="M5 13h22v2H5z" fill="#047857" />
      {/* Bag handles */}
      <path
        d="M10 13V9a6 6 0 0112 0v4"
        stroke="#065f46"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Carrot */}
      <path d="M12 9l-1 7" stroke="url(#carrotGrad)" strokeWidth="3" strokeLinecap="round" />
      {/* Carrot leaves */}
      <path
        d="M10 7c1.5-2 3.5-2 5 0"
        stroke="#22c55e"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M11 5c1-1.5 2.5-1.5 3.5 0"
        stroke="#4ade80"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Lettuce leaf */}
      <ellipse cx="20" cy="8" rx="3" ry="4" fill="#86efac" />
      <ellipse cx="20" cy="8" rx="2" ry="3" fill="#4ade80" />
      {/* Tomato */}
      <circle cx="23" cy="11" r="3" fill="#f87171" />
      <path d="M22 9c1-0.5 2-0.5 3 0" stroke="#22c55e" strokeWidth="1" fill="none" />
    </svg>
  );
}

// Recipe book with utensils
export function RecipeBookIcon({ className = '', size = 32 }: IconProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="bookGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef3c7" />
          <stop offset="100%" stopColor="#fde68a" />
        </linearGradient>
        <linearGradient id="bookSpine" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ea580c" />
          <stop offset="100%" stopColor="#fb923c" />
        </linearGradient>
      </defs>
      {/* Book cover */}
      <rect x="6" y="4" width="20" height="24" rx="2" fill="url(#bookGrad)" />
      {/* Book spine */}
      <rect x="6" y="4" width="4" height="24" rx="2" fill="url(#bookSpine)" />
      {/* Pages */}
      <rect x="11" y="6" width="13" height="20" rx="1" fill="white" />
      {/* Recipe lines */}
      <line x1="13" y1="10" x2="22" y2="10" stroke="#e7e5e4" strokeWidth="1" />
      <line x1="13" y1="13" x2="20" y2="13" stroke="#e7e5e4" strokeWidth="1" />
      <line x1="13" y1="16" x2="22" y2="16" stroke="#e7e5e4" strokeWidth="1" />
      <line x1="13" y1="19" x2="18" y2="19" stroke="#e7e5e4" strokeWidth="1" />
      {/* Fork icon on page */}
      <path
        d="M19 21v4M17 21v2M21 21v2M17 23h4"
        stroke="#fb923c"
        strokeWidth="1"
        strokeLinecap="round"
      />
      {/* Bookmark */}
      <path d="M23 4v8l-2-2-2 2V4" fill="#ef4444" />
    </svg>
  );
}

// Magic wand with sparkles for AI generation
export function SparkleWandIcon({ className = '', size = 32 }: IconProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="wandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#ea580c" />
        </linearGradient>
        <linearGradient id="sparkleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef3c7" />
          <stop offset="100%" stopColor="#fbbf24" />
        </linearGradient>
      </defs>
      {/* Wand body */}
      <rect
        x="4"
        y="22"
        width="20"
        height="4"
        rx="2"
        transform="rotate(-45 4 22)"
        fill="url(#wandGrad)"
      />
      {/* Wand tip glow */}
      <circle cx="7" cy="7" r="4" fill="#fef3c7" opacity="0.5" />
      <circle cx="7" cy="7" r="2" fill="#fbbf24" />
      {/* Main sparkle */}
      <path
        d="M7 2l1.5-0 0.5 2 2 0.5 0 1.5-2 0.5-0.5 2-1.5 0-0.5-2-2-0.5 0-1.5 2-0.5z"
        fill="url(#sparkleGrad)"
      />
      {/* Secondary sparkles */}
      <path d="M18 6l0.8-1.6 0.8 1.6 1.6 0.8-1.6 0.8-0.8 1.6-0.8-1.6-1.6-0.8z" fill="#fbbf24" />
      <path d="M24 12l0.6-1.2 0.6 1.2 1.2 0.6-1.2 0.6-0.6 1.2-0.6-1.2-1.2-0.6z" fill="#fed7aa" />
      <path d="M14 3l0.5-1 0.5 1 1 0.5-1 0.5-0.5 1-0.5-1-1-0.5z" fill="#fef3c7" />
      {/* Small accent sparkles */}
      <circle cx="22" cy="8" r="1" fill="#fbbf24" />
      <circle cx="12" cy="5" r="0.8" fill="#fed7aa" />
    </svg>
  );
}

// Fire/stats icon with warmth
export function FireStatsIcon({ className = '', size = 32 }: IconProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="fireGrad" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#ea580c" />
          <stop offset="50%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#fbbf24" />
        </linearGradient>
        <linearGradient id="fireInner" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#fef3c7" />
        </linearGradient>
      </defs>
      {/* Outer flame */}
      <path d="M16 4c-4 6-8 10-8 16a8 8 0 0016 0c0-6-4-10-8-16z" fill="url(#fireGrad)" />
      {/* Inner flame */}
      <path d="M16 12c-2 3-4 5-4 9a4 4 0 008 0c0-4-2-6-4-9z" fill="url(#fireInner)" />
      {/* Flame highlights */}
      <ellipse cx="13" cy="18" rx="1" ry="2" fill="rgba(255,255,255,0.4)" />
    </svg>
  );
}

// Shopping cart with checkmark
export function ShoppingCartCheckIcon({ className = '', size = 32 }: IconProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="cartGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
      </defs>
      {/* Cart body */}
      <path
        d="M4 6h3l3 14h14l3-10H8"
        stroke="url(#cartGrad)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Cart wheels */}
      <circle cx="11" cy="24" r="2.5" fill="url(#cartGrad)" />
      <circle cx="22" cy="24" r="2.5" fill="url(#cartGrad)" />
      {/* Checkmark badge */}
      <circle cx="24" cy="8" r="6" fill="#059669" />
      <path
        d="M21 8l2 2 4-4"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Success check with celebration sparkle
export function SuccessCheckIcon({ className = '', size = 32 }: IconProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="checkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
      </defs>
      {/* Circle background */}
      <circle cx="16" cy="16" r="12" fill="url(#checkGrad)" />
      {/* Checkmark */}
      <path
        d="M10 16l4 4 8-8"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Celebration sparkles */}
      <path d="M6 6l1-2 1 2 2 1-2 1-1 2-1-2-2-1z" fill="#fbbf24" />
      <path d="M26 8l0.8-1.6 0.8 1.6 1.6 0.8-1.6 0.8-0.8 1.6-0.8-1.6-1.6-0.8z" fill="#fbbf24" />
      <circle cx="28" cy="20" r="1.5" fill="#fed7aa" />
      <circle cx="4" cy="22" r="1" fill="#fbbf24" />
    </svg>
  );
}

// Settings gear with friendly detail
export function SettingsGearIcon({ className = '', size = 32 }: IconProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="gearGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a8a29e" />
          <stop offset="100%" stopColor="#78716c" />
        </linearGradient>
      </defs>
      {/* Gear teeth */}
      <path
        d="M16 4l2 3h4l1 4 3 2-1 4 2 3-3 2-1 4h-4l-2 3-2-3h-4l-1-4-3-2 1-4-2-3 3-2 1-4h4z"
        fill="url(#gearGrad)"
      />
      {/* Inner circle */}
      <circle cx="16" cy="16" r="5" fill="#f5f5f4" />
      <circle cx="16" cy="16" r="3" fill="#e7e5e4" />
      {/* Highlight */}
      <circle cx="14" cy="14" r="1" fill="rgba(255,255,255,0.6)" />
    </svg>
  );
}

// Amber success check (for features list)
export function AmberCheckIcon({ className = '', size = 32 }: IconProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="amberCheckGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="12" fill="url(#amberCheckGrad)" />
      <path
        d="M10 16l4 4 8-8"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Orange primary check (for features list)
export function OrangeCheckIcon({ className = '', size = 32 }: IconProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="orangeCheckGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#ea580c" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="12" fill="url(#orangeCheckGrad)" />
      <path
        d="M10 16l4 4 8-8"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
