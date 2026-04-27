/**
 * Mereka Brand Configuration
 * Shared across all apps in the workspace
 */

export const BRAND_COLORS = {
  primary: {
    DEFAULT: '#1a1623',
    dark: '#000000',
    light: '#2d2438',
  },
  accent: '#000000',
  neutral: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
} as const;

export const BRAND_FONTS = {
  sans: ['Lato', 'sans-serif'],
} as const;

export const BRAND_SPACING = {
  0: '0px',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  7: '28px',
  8: '32px',
  10: '40px',
} as const;

export const BRAND_BORDER_RADIUS = {
  sm: '4px',
  DEFAULT: '8px',
  md: '12px',
  lg: '16px',
  full: '9999px',
} as const;

export const BRAND_SHADOWS = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  DEFAULT: '0 2px 8px 0 rgba(0, 0, 0, 0.1)',
  md: '0 4px 16px 0 rgba(0, 0, 0, 0.1)',
  lg: '0 8px 32px 0 rgba(0, 0, 0, 0.15)',
} as const;

export const BRAND_CONFIG = {
  name: 'Mereka',
  colors: BRAND_COLORS,
  fonts: BRAND_FONTS,
  spacing: BRAND_SPACING,
  borderRadius: BRAND_BORDER_RADIUS,
  shadows: BRAND_SHADOWS,
} as const;

export type BrandColors = typeof BRAND_COLORS;
export type BrandConfig = typeof BRAND_CONFIG;
