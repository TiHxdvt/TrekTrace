/**
 * Theme constants based on glassmorphism design
 * Reference: /resources/generated-page.html
 */

// Core Colors
export const COLORS = {
  // Primary background
  BACKGROUND: '#1c1e26',
  BACKGROUND_LIGHT: '#181a22',

  // Primary accent
  PRIMARY: '#3b82f6',
  PRIMARY_DARK: '#2563eb',
  PRIMARY_LIGHT: '#60a5fa',

  // Text colors with opacity
  TEXT: {
    PRIMARY: '#ffffff',
    SECONDARY: 'rgba(255, 255, 255, 0.8)',
    TERTIARY: 'rgba(255, 255, 255, 0.5)',
    QUATERNARY: 'rgba(255, 255, 255, 0.4)',
    QUINARY: 'rgba(255, 255, 255, 0.3)',
    DISABLED: 'rgba(255, 255, 255, 0.2)',
    PLACEHOLDER: 'rgba(255, 255, 255, 0.3)',
  },

  // Overlay & backgrounds
  OVERLAY: {
    LIGHT: 'rgba(255, 255, 255, 0.05)',
    MEDIUM: 'rgba(255, 255, 255, 0.1)',
    HEAVY: 'rgba(255, 255, 255, 0.2)',
    CARD: 'rgba(28, 30, 38, 0.6)',
    NAV: 'rgba(24, 26, 34, 0.75)',
  },

  // Borders
  BORDER: {
    LIGHT: 'rgba(255, 255, 255, 0.05)',
    MEDIUM: 'rgba(255, 255, 255, 0.1)',
    HEAVY: 'rgba(255, 255, 255, 0.2)',
  },

  // Status colors
  SUCCESS: '#22c55e',
  ERROR: '#ef4444',
  WARNING: '#f59e0b',
  INFO: '#3b82f6',

  // Gradient colors for background effects
  GRADIENT: {
    BLUE: 'rgba(59, 130, 246, 0.2)',
    PURPLE: 'rgba(147, 51, 234, 0.15)',
    PINK: 'rgba(236, 72, 153, 0.08)',
    BLUE_LIGHT: 'rgba(59, 130, 246, 0.15)',
    PINK_MID: 'rgba(236, 72, 153, 0.1)',
    PURPLE_LIGHT: 'rgba(147, 51, 234, 0.1)',
  },
} as const;

// Spacing
export const SPACING = {
  XS: 4,
  SM: 8,
  MD: 12,
  LG: 16,
  XL: 20,
  XXL: 24,
  XXXL: 32,
} as const;

// Border Radius
export const BORDER_RADIUS = {
  SM: 8,
  MD: 12,
  LG: 16,
  XL: 20,
  XXL: 24,
  XXXL: 32,
  FULL: 9999,
  G2: {
    SM: 12,
    MD: 16,
    LG: 24,
    XL: 32,
    XXL: 48,
  },
} as const;

// Shadows
export const SHADOWS = {
  SMALL: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  MEDIUM: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  LARGE: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.37,
    shadowRadius: 7.49,
    elevation: 12,
  },
  PRIMARY: {
    shadowColor: COLORS.PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
} as const;

// Typography
export const TYPOGRAPHY = {
  FONT_FAMILY: {
    REGULAR: 'System',
    MEDIUM: 'System',
    SEMIBOLD: 'System',
    BOLD: 'System',
  },
  FONT_SIZE: {
    XS: 10,
    SM: 12,
    BASE: 14,
    MD: 16,
    LG: 18,
    XL: 20,
    XXL: 24,
    XXXL: 32,
  },
  LINE_HEIGHT: {
    TIGHT: 1.2,
    NORMAL: 1.5,
    RELAXED: 1.75,
  },
} as const;

// Animation durations
export const ANIMATION = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
} as const;

// Common styles
export const GLASSMORPHISM = {
  CARD: {
    backgroundColor: COLORS.OVERLAY.CARD,
    borderWidth: 1,
    borderColor: COLORS.BORDER.MEDIUM,
    // Note: backdrop-blur is not directly supported in React Native
    // Use react-native-blur package for blur effects
  },
  OVERLAY: {
    backgroundColor: COLORS.OVERLAY.LIGHT,
    borderWidth: 1,
    borderColor: COLORS.BORDER.LIGHT,
  },
} as const;

// Helper function to create glassmorphism card style
export const createGlassCardStyle = (customStyles = {}) => ({
  backgroundColor: COLORS.OVERLAY.CARD,
  borderWidth: 1,
  borderColor: COLORS.BORDER.MEDIUM,
  borderRadius: BORDER_RADIUS.XXL,
  ...customStyles,
});

// Helper function to create button shadow based on variant
export const getButtonShadow = (variant: 'primary' | 'secondary' | 'ghost' = 'primary') => {
  if (variant === 'primary') {
    return SHADOWS.PRIMARY;
  }
  return {};
};
