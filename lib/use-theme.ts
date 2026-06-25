import { useColorScheme } from 'react-native';
import { useTibaStore } from './store';
import { darkTheme, lightTheme, type Theme } from './theme';

/**
 * Resolve the active theme from the user's preference and the OS appearance.
 * `system` follows `useColorScheme()` (defaulting to dark when unknown).
 */
export function useTheme(): Theme {
  const pref = useTibaStore((s) => s.themePref);
  const system = useColorScheme();
  const mode = pref === 'system' ? (system ?? 'dark') : pref;
  return mode === 'light' ? lightTheme : darkTheme;
}

/** The resolved 'light' | 'dark' mode (for the status bar, etc.). */
export function useThemeMode(): 'light' | 'dark' {
  return useTheme().mode;
}
