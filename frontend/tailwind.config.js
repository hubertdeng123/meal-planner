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
          soft: 'var(--secondary-soft)',
        },
        success: 'var(--success)',
        error: 'var(--error)',
        warning: 'var(--warning)',
      },
      fontFamily: {
        sans: [
          'Plus Jakarta Sans',
          'Manrope',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        display: [
          'Manrope',
          'Plus Jakarta Sans',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'sans-serif',
        ],
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        'glow-primary': '0 0 20px var(--primary-soft)',
      },
      borderRadius: {
        lg: '0.75rem',
        xl: '1rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        spin: 'spin 1s linear infinite',
        heartbeat: 'heartbeat 0.6s ease-out',
        'focus-glow': 'focus-glow 0.4s ease-out',
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
          '0%': { transform: 'translateY(10px)', opacity: '0' },
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
          '50%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(0.98)', opacity: '0' },
        },
        'cursor-blink': {
          '0%, 50%': { opacity: '1' },
          '51%, 100%': { opacity: '0' },
        },
        'celebration-glow': {
          '0%, 100%': {
            boxShadow: '0 0 10px rgba(5, 150, 105, 0.3)',
            backgroundColor: 'rgba(5, 150, 105, 0.1)',
          },
          '50%': {
            boxShadow: '0 0 25px rgba(5, 150, 105, 0.5)',
            backgroundColor: 'rgba(5, 150, 105, 0.2)',
          },
        },
      },
    },
  },
  plugins: [],
};
