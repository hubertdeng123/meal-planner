/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--primary)',
          hover: 'var(--primary-hover)',
          soft: 'var(--primary-soft)',
          glow: 'var(--primary-glow)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          hover: 'var(--secondary-hover)',
          soft: 'var(--secondary-soft)',
        },
        success: {
          DEFAULT: 'var(--success)',
          soft: 'var(--success-soft)',
        },
        warning: {
          DEFAULT: 'var(--warning)',
          soft: 'var(--warning-soft)',
        },
        error: {
          DEFAULT: 'var(--error)',
          soft: 'var(--error-soft)',
        },
        page: 'var(--page-bg)',
        surface: {
          DEFAULT: 'var(--surface)',
          muted: 'var(--surface-muted)',
          warm: 'var(--surface-warm)',
          elevated: 'var(--surface-elevated)',
        },
        ink: {
          DEFAULT: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
        },
        linen: {
          DEFAULT: '#faf7f2',
          muted: '#f3efe6',
          warm: '#f9f1ea',
          border: '#e7e0d6',
          strong: '#d6cec2',
        },
        terracotta: {
          DEFAULT: '#c84b31',
          hover: '#b83b22',
          dark: '#9a3412',
          soft: '#f9f1ea',
        },
        sage: {
          DEFAULT: '#3f624d',
          hover: '#314e3c',
          dark: '#2f6f4e',
          soft: '#ecf5f0',
        },
      },
      fontFamily: {
        sans: [
          '"Plus Jakarta Sans"',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
        display: [
          'Fraunces',
          'Georgia',
          'Cambria',
          '"Times New Roman"',
          'serif',
        ],
        mono: [
          '"JetBrains Mono"',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace',
        ],
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        '2xs': '0 1px 1px 0 rgba(28, 25, 23, 0.03)',
        xs: '0 1px 2px 0 rgba(28, 25, 23, 0.04)',
        sm: '0 1px 3px 0 rgba(28, 25, 23, 0.06), 0 1px 2px -1px rgba(28, 25, 23, 0.04)',
        md: '0 4px 10px -2px rgba(28, 25, 23, 0.06), 0 2px 4px -2px rgba(28, 25, 23, 0.04)',
        lg: '0 10px 24px -4px rgba(28, 25, 23, 0.08), 0 4px 8px -4px rgba(28, 25, 23, 0.04)',
        xl: '0 20px 32px -8px rgba(28, 25, 23, 0.10), 0 8px 16px -6px rgba(28, 25, 23, 0.05)',
        card: '0 2px 10px -2px rgba(28, 25, 23, 0.04), 0 6px 20px -4px rgba(28, 25, 23, 0.03)',
        elevated: '0 8px 30px -6px rgba(28, 25, 23, 0.07), 0 2px 8px -2px rgba(28, 25, 23, 0.04)',
        'glow-primary': '0 0 20px var(--primary-soft)',
      },
      borderRadius: {
        lg: '0.75rem',
        xl: '0.875rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        spin: 'spin 1s linear infinite',
        heartbeat: 'heartbeat 0.6s ease-out',
        'focus-glow': 'focus-glow 0.3s ease-out',
        strike: 'draw-strike 0.3s ease-out forwards',
        'success-burst': 'success-burst 0.4s ease-out forwards',
        cursor: 'cursor-blink 1s step-end infinite',
        'celebration-glow': 'celebration-glow 1.5s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        spin: {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        heartbeat: {
          '0%, 100%': { transform: 'scale(1)' },
          '25%': { transform: 'scale(1.25)' },
          '50%': { transform: 'scale(1)' },
          '75%': { transform: 'scale(1.12)' },
        },
        'focus-glow': {
          '0%': { boxShadow: '0 0 0 0 var(--primary-glow)' },
          '100%': { boxShadow: '0 0 0 3px var(--primary-soft)' },
        },
        'draw-strike': {
          from: { clipPath: 'inset(0 100% 0 0)' },
          to: { clipPath: 'inset(0 0 0 0)' },
        },
        'success-burst': {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.04)' },
          '100%': { transform: 'scale(0.98)', opacity: '0' },
        },
        'cursor-blink': {
          '0%, 50%': { opacity: '1' },
          '51%, 100%': { opacity: '0' },
        },
        'celebration-glow': {
          '0%, 100%': {
            boxShadow: '0 0 10px rgba(47, 111, 78, 0.2)',
            backgroundColor: 'rgba(47, 111, 78, 0.08)',
          },
          '50%': {
            boxShadow: '0 0 20px rgba(47, 111, 78, 0.35)',
            backgroundColor: 'rgba(47, 111, 78, 0.14)',
          },
        },
      },
    },
  },
  plugins: [],
};
