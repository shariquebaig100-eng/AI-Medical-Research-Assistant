/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        // Background palette — generates bg-bg-primary, text-bg-secondary, etc.
        bg: {
          primary:   '#0f172a',
          secondary: '#1e293b',
          tertiary:  '#334155',
          hover:     '#2d3f55',
        },
        // Brand colours — generates bg-brand-blue, text-brand-teal, etc.
        brand: {
          blue:    '#3b82f6',
          bluelt:  '#60a5fa',   // was 'blue-lt' — hyphen in key causes JIT issues
          bluedk:  '#1d4ed8',   // was 'blue-dk'
          teal:    '#14b8a6',
          purple:  '#8b5cf6',
          green:   '#22c55e',
          amber:   '#f59e0b',
          red:     '#ef4444',
        },
      },
      animation: {
        'fade-in':   'fadeIn 0.3s ease forwards',
        'slide-in':  'slideIn 0.3s ease forwards',
        'spin-slow': 'spin 0.7s linear infinite',
      },
      keyframes: {
        fadeIn:  { from: { opacity: '0', transform: 'translateY(8px)' },  to: { opacity: '1', transform: 'translateY(0)' } },
        slideIn: { from: { opacity: '0', transform: 'translateX(-8px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
      },
    },
  },
  plugins: [],
}