/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        aether: {
          dark: '#0B0D13',
          panel: '#121620',
          surface: '#1A202E',
          border: '#283248',
          accent: '#6366F1',
          cyan: '#06B6D4',
          neon: '#10B981',
          gold: '#F59E0B',
          pink: '#EC4899',
          danger: '#EF4444'
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace']
      }
    },
  },
  plugins: [],
}
