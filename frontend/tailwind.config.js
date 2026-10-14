/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'rgb(var(--primary-rgb) / <alpha-value>)',
          hover: 'var(--primary-hover)',
          soft: 'var(--primary-soft)',
          glow: 'var(--primary-glow)',
          ink: 'var(--primary-ink)',
        },
        accent: {
          DEFAULT: 'rgb(var(--accent-rgb) / <alpha-value>)',
          soft: 'var(--accent-soft)',
          ink: 'var(--accent-ink)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          soft: 'var(--secondary-soft)',
        },
        paper: 'var(--page-bg)',
        ink: 'var(--text-primary)',
        success: 'var(--success)',
        error: 'var(--error)',
        warning: 'var(--warning)',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'Cambria', 'Times New Roman', 'serif'],
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgb(28 25 23 / 0.04)',
        sm: '0 1px 2px 0 rgb(28 25 23 / 0.05), 0 1px 3px 0 rgb(28 25 23 / 0.04)',
        md: '0 4px 12px -2px rgb(28 25 23 / 0.08), 0 2px 4px -2px rgb(28 25 23 / 0.05)',
        lg: '0 12px 28px -8px rgb(28 25 23 / 0.14), 0 4px 8px -4px rgb(28 25 23 / 0.06)',
        xl: '0 24px 48px -12px rgb(28 25 23 / 0.22)',
        'glow-primary': '0 0 0 4px var(--primary-soft)',
      },
      borderRadius: {
        lg: '0.625rem',
        xl: '0.875rem',
        '2xl': '1.125rem',
        '3xl': '1.5rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        spin: 'spin 1s linear infinite',
        heartbeat: 'heartbeat 0.6s ease-out',
        strike: 'draw-strike 0.3s ease-out forwards',
        'success-burst': 'success-burst 0.4s ease-out forwards',
        cursor: 'cursor-blink 1s step-end infinite',
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
          '25%': { transform: 'scale(1.3)' },
          '50%': { transform: 'scale(1)' },
          '75%': { transform: 'scale(1.15)' },
        },
        'draw-strike': {
          from: { clipPath: 'inset(0 100% 0 0)' },
          to: { clipPath: 'inset(0 0 0 0)' },
        },
        'success-burst': {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(0.98)', opacity: '0' },
        },
        'cursor-blink': {
          '0%, 50%': { opacity: '1' },
          '51%, 100%': { opacity: '0' },
        },
      },
    },
  },
  plugins: [],
};
