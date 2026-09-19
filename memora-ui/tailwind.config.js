/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        obsidian: '#0f172a',
        royal: { 600: '#4338ca', 500: '#4f46e5' },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        glass: '0 10px 35px -10px rgba(15, 23, 42, 0.05)',
        lift: '0 24px 50px -18px rgba(15, 23, 42, 0.16)',
        pill: '0 8px 20px -8px rgba(15, 23, 42, 0.45)',
      },
      keyframes: {
        drift: {
          '0%, 100%': { transform: 'translate3d(0,0,0) scale(1)' },
          '50%': { transform: 'translate3d(2.5%, 3%, 0) scale(1.06)' },
        },
        driftAlt: {
          '0%, 100%': { transform: 'translate3d(0,0,0) scale(1)' },
          '50%': { transform: 'translate3d(-3%, 2%, 0) scale(1.05)' },
        },
        pop: {
          '0%': { transform: 'scale(0.96)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        toastIn: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        draw: {
          '0%': { strokeDashoffset: '1' },
          '100%': { strokeDashoffset: '0' },
        },
      },
      animation: {
        drift: 'drift 22s ease-in-out infinite',
        'drift-alt': 'driftAlt 28s ease-in-out infinite',
        pop: 'pop 160ms ease-out both',
        'toast-in': 'toastIn 180ms ease-out both',
        draw: 'draw 2.4s ease-out 0.3s both',
      },
    },
  },
  plugins: [],
};
