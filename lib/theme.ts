// ============================================================================
// Theme — light + dark semantic palettes
// ============================================================================
//
// Screens read the active palette via `useTheme()` (lib/use-theme.ts) and build
// their StyleSheet with a `makeStyles(theme)` factory. Brand colors (line
// colors, the blue accent, the alarm reds/greens) are intentionally constant
// across themes; only surfaces, text, and dividers flip.

export interface Theme {
  mode: 'light' | 'dark';
  bg: string; // screen background
  fg: string; // primary text
  border: string; // card/control borders
  divider: string; // hairline row separators
  sectionBg: string; // list section header background
  inputBg: string; // text input background
  textMuted: string; // section labels / secondary text
  textDim: string; // placeholders / tertiary text
  textFaint: string; // upcoming station names
  dim: string; // inactive dots / icons
  accent: string; // primary action (brand blue)
  danger: string; // destructive text
  dangerBorder: string; // destructive control border
  warning: string; // wrong-direction / caution
  success: string; // granted / tracking green
}

export const darkTheme: Theme = {
  mode: 'dark',
  bg: '#0A0A0A',
  fg: '#FAFAFA',
  border: '#2A2A2A',
  divider: '#1C1C1C',
  sectionBg: '#141414',
  inputBg: '#222222',
  textMuted: '#7A7A7A',
  textDim: '#5A5A5A',
  textFaint: '#C8C8C8',
  dim: '#4A4A4A',
  accent: '#3B82F6',
  danger: '#EF4444',
  dangerBorder: '#4A2422',
  warning: '#FFA500',
  success: '#43A047',
};

export const lightTheme: Theme = {
  mode: 'light',
  bg: '#FFFFFF',
  fg: '#16181B',
  border: '#E2E3E6',
  divider: '#ECECEE',
  sectionBg: '#F4F4F6',
  inputBg: '#F0F0F2',
  textMuted: '#6B6E73',
  textDim: '#9A9DA3',
  textFaint: '#54575C',
  dim: '#C4C6CC',
  accent: '#3B82F6',
  danger: '#DC2626',
  dangerBorder: '#F2C9C9',
  warning: '#C2710B',
  success: '#2E9E45',
};

// ----------------------------------------------------------------------------
// Constant (theme-independent) tokens
// ----------------------------------------------------------------------------

export const lineColors = {
  bogor: '#E53935',
  cikarang: '#1E88E5',
  rangkasbitung: '#43A047',
  tangerang: '#6D4C41',
  tanjungPriok: '#EC407A',
} as const;

// Selectable accent colors (Settings → ACCENT). `null` accentPref → the
// palette default (`blue`). Tuned to stay legible on both light and dark fields.
export const accentOptions = [
  { id: 'blue', color: '#3B82F6' },
  { id: 'indigo', color: '#6366F1' },
  { id: 'violet', color: '#8B5CF6' },
  { id: 'pink', color: '#EC4899' },
  { id: 'red', color: '#EF4444' },
  { id: 'orange', color: '#F97316' },
  { id: 'amber', color: '#F59E0B' },
  { id: 'green', color: '#22C55E' },
  { id: 'teal', color: '#14B8A6' },
  { id: 'cyan', color: '#06B6D4' },
] as const;

export const fonts = {
  regular: 'JetBrainsMono-Regular',
  bold: 'JetBrainsMono-Bold',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const fontSize = {
  xs: 8,
  sm: 10,
  md: 12,
  body: 14,
  lg: 16,
  xl: 20,
  xxl: 28,
  display: 48,
} as const;

// Brand badge colors — same in both themes.
export const badgeColors = {
  granted: '#43A047',
  enable: '#3B82F6',
  tracking: '#43A047',
} as const;

// ----------------------------------------------------------------------------
// Legacy dark constants — kept for surfaces that are always dark regardless of
// theme (the red alarm overlay, the dev tools overlay).
// ----------------------------------------------------------------------------

export const colors = {
  monoBg: '#0A0A0A',
  monoFg: '#FAFAFA',
  monoGray1: '#2A2A2A',
  monoGray2: '#4A4A4A',
  monoAccent: '#3B82F6',
  monoDanger: '#EF4444',
} as const;

export const borderColors = {
  subtle: '#333333',
  active: '#4A90E2',
  danger: '#E63946',
} as const;
