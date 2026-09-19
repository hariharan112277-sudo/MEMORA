/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'] },
      colors: {
        ink: { 900: '#0b0f19', 950: '#030712' },
        stable: '#10b981',
        weak: '#f59e0b',
        critical: '#ef4444',
        brand: { 500: '#6366f1', 600: '#8b5cf6' },
      },
      boxShadow: { glow: '0 0 24px rgba(99,102,241,.45)' },
    },
  },
  plugins: [],
};
