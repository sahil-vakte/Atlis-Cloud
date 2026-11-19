import type { Config } from 'tailwindcss';
export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: '#00297B', 50: '#EEF2FA', 100: '#D6DFF1', 200: '#B3C0DB', 600: '#00297B', 700: '#00205F', 800: '#001847', 900: '#001033' },
        slate2: { DEFAULT: '#576E9A', light: '#B3C0DB' },
        teal: { DEFAULT: '#01E2C1', 50: '#E6FCF8', 600: '#00B89D', 700: '#008F7A' },
      },
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'] },
      boxShadow: { card: '0 1px 2px rgba(0,16,51,.06), 0 4px 16px rgba(0,16,51,.06)' },
    },
  },
  plugins: [],
} satisfies Config;
