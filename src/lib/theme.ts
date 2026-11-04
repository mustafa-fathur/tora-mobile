import { DefaultTheme, type Theme } from 'expo-router';

// The same colours as global.css, as plain strings, for places that take a
// colour value instead of a className (tab bar, navigation headers, icons).
export const COLORS = {
  background: '#ffffff',
  foreground: '#101b15',
  primary: '#115c3b', // Tora logo green
  primaryForeground: '#ffffff',
  muted: '#f2f6f4',
  mutedForeground: '#5a675f',
  border: '#dee7e2',
  destructive: '#e7000b',
  income: '#115c3b',
  expense: '#dc785f',
  warning: '#e49e22',
  secondary: '#e5f7ec',
} as const;

// Category colours for charts: Tora's coral and greens first, then neutral tints.
// The last one is for "Other".
export const CATEGORY_COLORS = ['#dc785f', '#115c3b', '#e49e22', '#55ad7f', '#a85a46', '#91ceab'] as const;
export const OTHER_COLOR = '#c9d3ce';

// Colours for React Navigation's own UI (headers, screen backgrounds).
export const NAV_THEME: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: COLORS.background,
    border: COLORS.border,
    card: COLORS.background,
    notification: COLORS.destructive,
    primary: COLORS.primary,
    text: COLORS.foreground,
  },
};
