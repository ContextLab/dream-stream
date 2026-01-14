/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.{js,jsx,ts,tsx}',
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Primary: Green (matches theme/tokens.ts)
        primary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
        // Secondary: Purple accent
        secondary: {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7c3aed',
          800: '#6b21a8',
          900: '#581c87',
          950: '#3b0764',
        },
        // Gray scale (matches theme/tokens.ts)
        gray: {
          50: '#fafafa',
          100: '#f4f4f5',
          200: '#e4e4e7',
          300: '#d4d4d8',
          400: '#a1a1aa',
          500: '#71717a',
          600: '#52525b',
          700: '#3f3f46',
          800: '#27272a',
          900: '#18181b',
          950: '#09090b',
        },
        // Semantic colors (matches theme/tokens.ts darkTheme)
        background: {
          light: '#fafafa',
          dark: '#09090b',
        },
        surface: {
          light: '#ffffff',
          dark: '#18181b',
        },
        surfaceAlt: {
          light: '#f4f4f5',
          dark: '#27272a',
        },
        // Accent colors
        accent: {
          cyan: '#22d3ee',
          purple: '#a855f7',
          amber: '#fbbf24',
          rose: '#fb7185',
        },
        // Semantic
        success: '#22c55e',
        warning: '#fbbf24',
        error: '#ef4444',
        info: '#22d3ee',
      },
      fontFamily: {
        sans: ['CourierPrime_400Regular', 'Courier', 'monospace'],
        mono: ['CourierPrime_400Regular', 'Courier', 'monospace'],
      },
      spacing: {
        18: '4.5rem',
        22: '5.5rem',
      },
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
};
