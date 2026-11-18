import type { Config } from 'tailwindcss';

// Colours come from CSS variables (see app/globals.css) so the same class works in the light and dark themes.
// Light values are the original colours, so the light theme looks exactly as before.
const v = (name: string) => `rgb(var(--c-${name}) / <alpha-value>)`;

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: { 900: '#0B1F4D', 800: '#011D56' },
        brand: { DEFAULT: v('brand'), soft: v('brand-soft'), ink: v('brand-ink') },
        amber: { DEFAULT: '#F2A900', soft: v('amber-soft'), ink: v('amber-ink') },
        surface: v('surface'),
        card: v('card'),
        field: v('field'),
        ink: v('ink'),
        muted: v('muted'),
        faint: v('faint'),
        line: v('line'),
        edge: v('edge'),
        danger: { DEFAULT: v('danger'), soft: v('danger-soft') },
        ok: { DEFAULT: v('ok'), soft: v('ok-soft') },
      },
      fontFamily: { sans: ['var(--font-jakarta)', 'system-ui', 'sans-serif'] },
      boxShadow: { card: '0 18px 40px rgba(11,31,77,0.16)', hero: '0 16px 32px rgba(11,31,77,0.28)' },
    },
  },
  plugins: [],
};

export default config;
