// Dark theme constants matching the VidStream design
export const darkTheme = {
  colors: {
    // Main colors from design
    background: '#0f0f23',      // dark-bg
    surface: '#1a1a2e',        // dark-surface  
    card: '#16213e',           // dark-card
    accent: '#e94560',         // accent/primary red
    
    // Text colors
    textPrimary: '#f5f7fa',    // text-primary
    textSecondary: '#a0a3bd',  // text-secondary
    
    // UI colors
    border: '#2a2a3e',         // darker border for better dark theme integration
    borderLight: '#374151',    // slightly lighter border option
    borderSubtle: '#1f2937',   // very subtle border for minimal separation
    white: '#ffffff',
    black: '#000000',
    
    // Status colors
    success: '#10b981',        // green-500
    warning: '#f59e0b',        // yellow-500
    error: '#ef4444',          // red-500
    
    // Additional grays for better UI
    gray50: '#f9fafb',
    gray100: '#f3f4f6',
    gray200: '#e5e7eb',
    gray300: '#d1d5db',
    gray400: '#9ca3af',
    gray500: '#6b7280',
    gray600: '#4b5563',
    gray700: '#374151',
    gray800: '#1f2937',
    gray900: '#111827',
    
    // Overlay colors
    overlay: 'rgba(0, 0, 0, 0.5)',
    overlayLight: 'rgba(0, 0, 0, 0.3)',
    overlayDark: 'rgba(0, 0, 0, 0.7)',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    huge: 40,
  },
  borderRadius: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    full: 9999,
  },
  fontSize: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    xxl: 20,
    xxxl: 24,
    huge: 28,
    massive: 32,
  },
  fontWeight: {
    light: '300' as const,
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },
  // Shadow styles for cards and elevated elements
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
  },
  // Animation durations
  animation: {
    fast: 150,
    normal: 250,
    slow: 350,
  },
};

export type Theme = typeof darkTheme;
