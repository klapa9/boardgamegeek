import type { Config } from 'tailwindcss';

/*
 * Vermeulen Games V2 palette (Adventure + Modern Playful), gedeeld met vermeulengames.com.
 * navy #14213D · cream #FFF7EA · sun #FFC857 · coral #F07857 · sage #6C9A92
 *
 * De bestaande componenten gebruiken veel `slate-*`, `emerald-*` en `amber-*`.
 * Die schalen worden hier herdefinieerd op basis van het merkpalet, zodat de hele
 * app in één keer de nieuwe stijl krijgt zonder elke component te herschrijven.
 */
const navy = {
  50: '#f5f6f9',
  100: '#eceef3',
  200: '#d8dce6',
  300: '#b9c0d0',
  400: '#8a94ab',
  500: '#5f6b85',
  600: '#48546f',
  700: '#36425e',
  800: '#253252',
  900: '#1b2847',
  950: '#14213D'
};

const sage = {
  50: '#eef5f3',
  100: '#d9e8e4',
  200: '#b9d4ce',
  300: '#93bab2',
  400: '#6C9A92',
  500: '#578079',
  600: '#466862',
  700: '#375a54',
  800: '#2c4945',
  900: '#233b38',
  950: '#172826'
};

const sun = {
  50: '#fff8e6',
  100: '#ffefc2',
  200: '#ffe29a',
  300: '#ffd477',
  400: '#FFC857',
  500: '#f0ad2e',
  600: '#c98a14',
  700: '#9a6a0e',
  800: '#7a530d',
  900: '#5f410c',
  950: '#3d2906'
};

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        slate: navy,
        emerald: sage,
        amber: sun,
        navy: { DEFAULT: '#14213D', ...navy },
        cream: '#FFF7EA',
        sun: { DEFAULT: '#FFC857', ...sun },
        coral: { DEFAULT: '#F07857', light: '#fde3d9', dark: '#8f3a22' },
        sage: { DEFAULT: '#6C9A92', ...sage }
      },
      fontFamily: {
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Georgia', 'serif']
      },
      boxShadow: {
        soft: '0 18px 45px rgba(20, 33, 61, 0.10)'
      }
    }
  },
  plugins: []
};
export default config;
