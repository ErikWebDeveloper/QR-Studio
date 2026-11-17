/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#09090f',
        panel: '#111119',
        panel2: '#171722',
        line: '#272735',
        ink: '#f4f4f7',
        muted: '#8e8ea6',
        accent: {
          DEFAULT: '#7c5cff',
          hover: '#6a48f5',
          soft: 'rgba(124, 92, 255, 0.14)',
        },
        success: '#34d399',
        danger: '#f87171',
        warning: '#fbbf24',
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'sans-serif',
        ],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        panel: '0 16px 50px -24px rgba(0, 0, 0, 0.9)',
        glow: '0 0 0 1px rgba(124,92,255,.35), 0 12px 40px -12px rgba(124,92,255,.45)',
      },
      borderRadius: {
        xl: '14px',
        '2xl': '20px',
      },
    },
  },
  plugins: [],
};
