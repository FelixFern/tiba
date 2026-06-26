import { useColorScheme } from 'react-native';
import { useTibaStore } from './store';
import { darkTheme, lightTheme, type Theme } from './theme';

/**
 * Resolve the active theme from the user's preference and the OS appearance.
 * `system` follows `useColorScheme()` (defaulting to dark when unknown).
 */
export function useTheme(): Theme {
  const pref = useTibaStore((s) => s.themePref);
  const accentPref = useTibaStore((s) => s.accentPref);
  const system = useColorScheme();
  const mode = pref === 'system' ? (system ?? 'dark') : pref;
  const base = mode === 'light' ? lightTheme : darkTheme;
  return accentPref ? { ...base, accent: accentPref } : base;
}

/** The resolved 'light' | 'dark' mode (for the status bar, etc.). */
export function useThemeMode(): 'light' | 'dark' {
  return useTheme().mode;
}
