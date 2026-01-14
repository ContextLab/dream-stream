export const colors = {
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
  accent: {
    cyan: '#22d3ee',
    purple: '#a855f7',
    amber: '#fbbf24',
    rose: '#fb7185',
  },
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
  success: '#22c55e',
  warning: '#fbbf24',
  error: '#ef4444',
  info: '#22d3ee',
} as const;

export const darkTheme = {
  background: '#09090b',
  surface: '#18181b',
  surfaceAlt: '#27272a',
  text: '#fafafa',
  textSecondary: '#a1a1aa',
  textMuted: '#52525b',
  border: '#3f3f46',
  borderFocus: '#22c55e',
};

export const lightTheme = {
  background: '#fafafa',
  surface: '#ffffff',
  surfaceAlt: '#f4f4f5',
  text: '#18181b',
  textSecondary: '#52525b',
  textMuted: '#a1a1aa',
  border: '#e4e4e7',
  borderFocus: '#16a34a',
};

export const fontFamily = {
  regular: 'CourierPrime_400Regular',
  italic: 'CourierPrime_400Regular_Italic',
  bold: 'CourierPrime_700Bold',
  boldItalic: 'CourierPrime_700Bold_Italic',
  fallback: 'Courier, monospace',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  smd: 12,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
} as const;

export const borderRadius = {
  none: 0,
  sm: 2,
  md: 4,
  lg: 8,
  xl: 12,
  '2xl': 16,
  full: 9999,
} as const;

export const fontSize = {
  xs: 11,
  sm: 13,
  base: 15,
  lg: 17,
  xl: 19,
  '2xl': 23,
  '3xl': 29,
  '4xl': 35,
} as const;

export const fontWeight = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

import { Platform } from 'react-native';

const nativeShadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  glow: {
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 0,
  },
};

const webShadows = {
  sm: { boxShadow: '0 1px 2px rgba(0, 0, 0, 0.2)' },
  md: { boxShadow: '0 2px 4px rgba(0, 0, 0, 0.25)' },
  lg: { boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)' },
  glow: { boxShadow: '0 0 12px rgba(34, 197, 94, 0.4)' },
};

export const shadows = Platform.OS === 'web' ? webShadows : nativeShadows;

export const touchTargetMinSize = 44;

export type Theme = {
  background: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  borderFocus: string;
};
