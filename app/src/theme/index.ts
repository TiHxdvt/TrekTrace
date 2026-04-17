/**
 * Theme constants based on glassmorphism design
 * Reference: /resources/generated-page.html
 */

// Dark Colors (default)
export const DARK_COLORS = {
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
    SUMMARY: 'rgba(28, 30, 38, 0.85)',
    BLUR_DARK: 'rgba(28, 30, 38, 0.65)',
    BLUR_LIGHT: 'rgba(28, 30, 38, 0.7)',
    GPS_SIM: 'rgba(255, 255, 255, 0.15)',
  },

  // Borders
  BORDER: {
    LIGHT: 'rgba(255, 255, 255, 0.05)',
    MEDIUM: 'rgba(255, 255, 255, 0.1)',
    HEAVY: 'rgba(255, 255, 255, 0.2)',
    ACCENT: 'rgba(59, 130, 246, 0.3)',
  },

  // Status colors
  SUCCESS: '#22c55e',
  ERROR: '#ef4444',
  WARNING: '#f59e0b',
  INFO: '#3b82f6',

  // Error state overlays
  ERROR_OVERLAY: {
    BACKGROUND: 'rgba(239, 68, 68, 0.05)',
    BORDER: 'rgba(239, 68, 68, 0.5)',
    BUTTON_BG: 'rgba(239, 68, 68, 0.2)',
    BUTTON_BORDER: 'rgba(239, 68, 68, 0.3)',
    SIM_BG: 'rgba(239, 68, 68, 0.5)',
    SIM_BORDER: 'rgba(239, 68, 68, 0.7)',
  },

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

// Light Colors
export const LIGHT_COLORS = {
  // Primary background
  BACKGROUND: '#f2f2f7',
  BACKGROUND_LIGHT: '#ffffff',

  // Primary accent
  PRIMARY: '#3b82f6',
  PRIMARY_DARK: '#2563eb',
  PRIMARY_LIGHT: '#60a5fa',

  // Text colors with opacity
  TEXT: {
    PRIMARY: '#1c1e26',
    SECONDARY: 'rgba(28, 30, 38, 0.8)',
    TERTIARY: 'rgba(28, 30, 38, 0.5)',
    QUATERNARY: 'rgba(28, 30, 38, 0.4)',
    QUINARY: 'rgba(28, 30, 38, 0.3)',
    DISABLED: 'rgba(28, 30, 38, 0.2)',
    PLACEHOLDER: 'rgba(28, 30, 38, 0.35)',
  },

  // Overlay & backgrounds
  OVERLAY: {
    LIGHT: 'rgba(255, 255, 255, 0.6)',
    MEDIUM: 'rgba(255, 255, 255, 0.75)',
    HEAVY: 'rgba(255, 255, 255, 0.85)',
    CARD: 'rgba(255, 255, 255, 0.7)',
    NAV: 'rgba(255, 255, 255, 0.75)',
    SUMMARY: 'rgba(255, 255, 255, 0.85)',
    BLUR_DARK: 'rgba(255, 255, 255, 0.65)',
    BLUR_LIGHT: 'rgba(255, 255, 255, 0.7)',
    GPS_SIM: 'rgba(0, 0, 0, 0.06)',
  },

  // Borders
  BORDER: {
    LIGHT: 'rgba(0, 0, 0, 0.05)',
    MEDIUM: 'rgba(0, 0, 0, 0.08)',
    HEAVY: 'rgba(0, 0, 0, 0.12)',
    ACCENT: 'rgba(59, 130, 246, 0.25)',
  },

  // Status colors
  SUCCESS: '#22c55e',
  ERROR: '#ef4444',
  WARNING: '#f59e0b',
  INFO: '#3b82f6',

  // Error state overlays
  ERROR_OVERLAY: {
    BACKGROUND: 'rgba(239, 68, 68, 0.06)',
    BORDER: 'rgba(239, 68, 68, 0.4)',
    BUTTON_BG: 'rgba(239, 68, 68, 0.12)',
    BUTTON_BORDER: 'rgba(239, 68, 68, 0.2)',
    SIM_BG: 'rgba(239, 68, 68, 0.35)',
    SIM_BORDER: 'rgba(239, 68, 68, 0.5)',
  },

  // Gradient colors for background effects
  GRADIENT: {
    BLUE: 'rgba(59, 130, 246, 0.08)',
    PURPLE: 'rgba(147, 51, 234, 0.05)',
    PINK: 'rgba(236, 72, 153, 0.03)',
    BLUE_LIGHT: 'rgba(59, 130, 246, 0.06)',
    PINK_MID: 'rgba(236, 72, 153, 0.04)',
    PURPLE_LIGHT: 'rgba(147, 51, 234, 0.04)',
  },
} as const;

// Type for theme colors
export type ThemeColors = {
  BACKGROUND: string;
  BACKGROUND_LIGHT: string;
  PRIMARY: string;
  PRIMARY_DARK: string;
  PRIMARY_LIGHT: string;
  TEXT: {
    PRIMARY: string;
    SECONDARY: string;
    TERTIARY: string;
    QUATERNARY: string;
    QUINARY: string;
    DISABLED: string;
    PLACEHOLDER: string;
  };
  OVERLAY: {
    LIGHT: string;
    MEDIUM: string;
    HEAVY: string;
    CARD: string;
    NAV: string;
    SUMMARY: string;
    BLUR_DARK: string;
    BLUR_LIGHT: string;
    GPS_SIM: string;
  };
  BORDER: {
    LIGHT: string;
    MEDIUM: string;
    HEAVY: string;
    ACCENT: string;
  };
  SUCCESS: string;
  ERROR: string;
  WARNING: string;
  INFO: string;
  ERROR_OVERLAY: {
    BACKGROUND: string;
    BORDER: string;
    BUTTON_BG: string;
    BUTTON_BORDER: string;
    SIM_BG: string;
    SIM_BORDER: string;
  };
  GRADIENT: {
    BLUE: string;
    PURPLE: string;
    PINK: string;
    BLUE_LIGHT: string;
    PINK_MID: string;
    PURPLE_LIGHT: string;
  };
};

// Theme map
export const THEMES: { dark: ThemeColors; light: ThemeColors } = {
  dark: DARK_COLORS,
  light: LIGHT_COLORS,
};

// Backward-compatible export (points to dark colors)
export const COLORS = DARK_COLORS;

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

// Common styles (accept colors parameter for dynamic theming)
export const getGlassCardStyle = (colors: ThemeColors) => ({
  backgroundColor: colors.OVERLAY.CARD,
  borderWidth: 1,
  borderColor: colors.BORDER.MEDIUM,
});

export const getGlassOverlayStyle = (colors: ThemeColors) => ({
  backgroundColor: colors.OVERLAY.LIGHT,
  borderWidth: 1,
  borderColor: colors.BORDER.LIGHT,
});

// Static glassmorphism styles (backward compatible, uses dark colors)
export const GLASSMORPHISM = {
  CARD: {
    backgroundColor: COLORS.OVERLAY.CARD,
    borderWidth: 1,
    borderColor: COLORS.BORDER.MEDIUM,
  },
  OVERLAY: {
    backgroundColor: COLORS.OVERLAY.LIGHT,
    borderWidth: 1,
    borderColor: COLORS.BORDER.LIGHT,
  },
} as const;

// Helper function to create glassmorphism card style (dynamic version)
export const createGlassCardStyle = (colors: ThemeColors, customStyles = {}) => ({
  backgroundColor: colors.OVERLAY.CARD,
  borderWidth: 1,
  borderColor: colors.BORDER.MEDIUM,
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
