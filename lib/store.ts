import { create } from 'zustand';
import { storage } from './storage';
import { Station, Line, LineId, TripPlan } from './types';

// ============================================================================
// Type Definitions
// ============================================================================

export interface Position {
  lat: number;
  lon: number;
}

// Re-export canonical types for convenience
export type { Station, Line, LineId };

// ============================================================================
// State Slices
// ============================================================================

export interface LocationState {
  currentPosition: Position | null;
  nearestStation: Station | null;
  currentLine: Line | null;
  direction: 'increasing' | 'decreasing' | null;
}

export interface TripState {
  // Final destination the user selected (persisted). Kept as a full Station for
  // the screens that only need the end point.
  destination: Station | null;
  // Computed multi-leg route from the user's position to the destination. Held
  // in memory and rebuilt lazily from the current location (so a cold start
  // mid-trip re-plans from where you actually are).
  tripPlan: TripPlan | null;
  currentLegIndex: number;
  alarmThreshold: number;
  isAlarmActive: boolean;
  // Distinguishes a transfer alarm (switch lines, trip continues) from the final
  // arrival alarm (trip ends) so the alarm screen and dismiss behave correctly.
  alarmKind: 'transfer' | 'arrival' | null;
  stationsRemaining: number | null;
}

export type ThemePref = 'light' | 'dark' | 'system';

export interface SettingsState {
  isTracking: boolean;
  hasLocationPermission: boolean;
  themePref: ThemePref;
  // Custom accent (hex). null → the default brand blue from the active palette.
  accentPref: string | null;
  // Hidden dev tools, revealed by tapping the "tiba" wordmark repeatedly.
  devUnlocked: boolean;
}

// ============================================================================
// Full Store Type
// ============================================================================

export interface TibaStore extends LocationState, TripState, SettingsState {
  // Trip actions (persisted to MMKV)
  setDestination: (station: Station | null) => void;
  setTripPlan: (plan: TripPlan | null) => void;
  advanceLeg: () => void;
  setAlarmThreshold: (threshold: number) => void;
  setIsAlarmActive: (active: boolean) => void;
  setThemePref: (pref: ThemePref) => void;
  setAccentPref: (hex: string | null) => void;
  unlockDev: () => void;

  // Reset the active journey (destination + transient location/trip state) while
  // keeping user preferences like the alarm threshold. Used when an arrival
  // alarm is dismissed — the trip is over, so return to a clean slate.
  resetTrip: () => void;

  // Utility
  resetStore: () => void;
}

// ============================================================================
// Persistence Keys
// ============================================================================

const MMKV_KEYS = {
  DESTINATION: 'tiba_destination',
  ALARM_THRESHOLD: 'tiba_alarm_threshold',
  THEME_PREF: 'tiba_theme_pref',
  ACCENT_PREF: 'tiba_accent_pref',
};

// Transient location/settings state mutated directly via useTibaStore.setState()
// from the location/notification layers (outside React) — no action creators
// needed for those.

// ============================================================================
// Zustand Store
// ============================================================================

export const useTibaStore = create<TibaStore>((set) => {
  // Initialize persisted preferences from MMKV on first load.
  const loadPersistedState = () => {
    const savedDestination = storage.getString(MMKV_KEYS.DESTINATION);
    const savedAlarmThreshold = storage.getNumber(MMKV_KEYS.ALARM_THRESHOLD);

    const initialState: Partial<TibaStore> = {};

    if (savedDestination) {
      try {
        initialState.destination = JSON.parse(savedDestination);
      } catch (e) {
        console.warn('Failed to parse saved destination:', e);
      }
    }

    if (savedAlarmThreshold !== undefined) {
      initialState.alarmThreshold = savedAlarmThreshold;
    }

    const savedThemePref = storage.getString(MMKV_KEYS.THEME_PREF);
    if (savedThemePref === 'light' || savedThemePref === 'dark' || savedThemePref === 'system') {
      initialState.themePref = savedThemePref;
    }

    const savedAccentPref = storage.getString(MMKV_KEYS.ACCENT_PREF);
    if (savedAccentPref) {
      initialState.accentPref = savedAccentPref;
    }

    return initialState;
  };

  const persistedState = loadPersistedState();

  return {
    // ========================================================================
    // Location State (transient)
    // ========================================================================
    currentPosition: null,
    nearestStation: null,
    currentLine: null,
    direction: null,

    // ========================================================================
    // Trip State (partial persistence)
    // ========================================================================
    destination: persistedState.destination || null,
    tripPlan: null,
    currentLegIndex: 0,
    alarmThreshold: persistedState.alarmThreshold ?? 3,
    isAlarmActive: false,
    alarmKind: null,
    stationsRemaining: null,

    // ========================================================================
    // Settings State
    // ========================================================================
    isTracking: false,
    hasLocationPermission: false,
    // Default to dark — the app's core "mono" design is dark. Light / system
    // remain selectable in Settings; defaulting to system surprised users on
    // light-mode devices with an all-white UI that read as a broken screen.
    themePref: persistedState.themePref ?? 'dark',
    accentPref: persistedState.accentPref ?? null,
    devUnlocked: false,

    // ========================================================================
    // Trip Actions (with MMKV Persistence)
    // ========================================================================
    setDestination: (station) => {
      // Changing the destination invalidates any planned route / progress, so
      // reset the trip-derived state. The next location update re-plans from the
      // current position to the new destination.
      set({
        destination: station,
        tripPlan: null,
        currentLegIndex: 0,
        stationsRemaining: null,
        isAlarmActive: false,
        alarmKind: null,
      });

      if (station) {
        try {
          storage.set(MMKV_KEYS.DESTINATION, JSON.stringify(station));
        } catch (e) {
          console.warn('Failed to persist destination:', e);
        }
      } else {
        storage.remove(MMKV_KEYS.DESTINATION);
      }
    },

    // tripPlan is intentionally NOT persisted — it's rebuilt from the live
    // position so resuming mid-trip re-plans from where you actually are.
    setTripPlan: (plan) => set({ tripPlan: plan, currentLegIndex: 0 }),

    advanceLeg: () => set((s) => ({ currentLegIndex: s.currentLegIndex + 1 })),

    setAlarmThreshold: (threshold) => {
      set({ alarmThreshold: threshold });

      try {
        storage.set(MMKV_KEYS.ALARM_THRESHOLD, threshold);
      } catch (e) {
        console.warn('Failed to persist alarm threshold:', e);
      }
    },

    setIsAlarmActive: (active) => set({ isAlarmActive: active }),

    setThemePref: (pref) => {
      set({ themePref: pref });
      try {
        storage.set(MMKV_KEYS.THEME_PREF, pref);
      } catch (e) {
        console.warn('Failed to persist theme preference:', e);
      }
    },

    setAccentPref: (hex) => {
      set({ accentPref: hex });
      try {
        if (hex) storage.set(MMKV_KEYS.ACCENT_PREF, hex);
        else storage.remove(MMKV_KEYS.ACCENT_PREF);
      } catch (e) {
        console.warn('Failed to persist accent preference:', e);
      }
    },

    unlockDev: () => set({ devUnlocked: true }),

    resetTrip: () => {
      storage.remove(MMKV_KEYS.DESTINATION);
      set({
        // Trip
        destination: null,
        tripPlan: null,
        currentLegIndex: 0,
        isAlarmActive: false,
        alarmKind: null,
        stationsRemaining: null,
        // Transient location/direction state from the finished journey
        nearestStation: null,
        currentLine: null,
        direction: null,
      });
    },

    // ========================================================================
    // Utility Actions
    // ========================================================================
    resetStore: () => {
      storage.remove(MMKV_KEYS.DESTINATION);
      storage.remove(MMKV_KEYS.ALARM_THRESHOLD);

      set({
        // Location
        currentPosition: null,
        nearestStation: null,
        currentLine: null,
        direction: null,

        // Trip
        destination: null,
        tripPlan: null,
        currentLegIndex: 0,
        alarmThreshold: 3,
        isAlarmActive: false,
        alarmKind: null,
        stationsRemaining: null,

        // Settings
        isTracking: false,
        hasLocationPermission: false,
      });
    },
  };
});

export default useTibaStore;
