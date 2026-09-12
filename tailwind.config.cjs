/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#09090b',
        surface: '#121215',
        'surface-hover': '#18181c',
        elevated: '#1c1c1e',
        'apple-border': 'rgba(255, 255, 255, 0.08)',
        'text-secondary': '#86868b',
        'text-muted': '#52525b',
        accent: '#0ea5e9',
        'accent-blue': '#0071e3',
        'sev-low': '#10b981',
        'sev-medium': '#f59e0b',
        'sev-high': '#f97316',
        'sev-critical': '#ef4444',
      },
      fontFamily: {
        sans: ['Inter', 'SF Pro Display', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        display: '-0.03em',
      },
      borderRadius: {
        card: '16px',
        btn: '10px',
        input: '8px',
      },
      backdropBlur: {
        glass: '24px',
      },
    },
  },
  plugins: [],
};
