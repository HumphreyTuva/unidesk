import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: { 900: '#0B1F4D', 800: '#011D56' },
        brand: { DEFAULT: '#1B3A8A', soft: '#E6ECFB' },
        amber: { DEFAULT: '#F2A900', soft: '#FDF1D0', ink: '#8A5A00' },
        surface: '#F4F6FB',
        ink: '#0E1B33',
        muted: '#4A5878',
        line: '#DDE3F0',
        edge: '#C9D2E6',
      },
      fontFamily: { sans: ['var(--font-jakarta)', 'system-ui', 'sans-serif'] },
      boxShadow: { card: '0 18px 40px rgba(11,31,77,0.16)', hero: '0 16px 32px rgba(11,31,77,0.28)' },
    },
  },
  plugins: [],
};

export default config;
