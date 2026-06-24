import { create } from 'zustand';
import { storage } from './storage';
import { Station, Line, LineId } from './types';

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
  destination: Station | null;
  alarmThreshold: number;
  isAlarmActive: boolean;
  stationsRemaining: number | null;
}

export interface SettingsState {
  isTracking: boolean;
  hasLocationPermission: boolean;
}

// ============================================================================
// Full Store Type
// ============================================================================

export interface TibaStore extends LocationState, TripState, SettingsState {
  // Trip actions (persisted to MMKV)
  setDestination: (station: Station | null) => void;
  setAlarmThreshold: (threshold: number) => void;
  setIsAlarmActive: (active: boolean) => void;

  // Utility
  resetStore: () => void;
}

// ============================================================================
// Persistence Keys
// ============================================================================

const MMKV_KEYS = {
  DESTINATION: 'tiba_destination',
  ALARM_THRESHOLD: 'tiba_alarm_threshold',
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
    alarmThreshold: persistedState.alarmThreshold ?? 3,
    isAlarmActive: false,
    stationsRemaining: null,

    // ========================================================================
    // Settings State
    // ========================================================================
    isTracking: false,
    hasLocationPermission: false,

    // ========================================================================
    // Trip Actions (with MMKV Persistence)
    // ========================================================================
    setDestination: (station) => {
      set({ destination: station });

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

    setAlarmThreshold: (threshold) => {
      set({ alarmThreshold: threshold });

      try {
        storage.set(MMKV_KEYS.ALARM_THRESHOLD, threshold);
      } catch (e) {
        console.warn('Failed to persist alarm threshold:', e);
      }
    },

    setIsAlarmActive: (active) => set({ isAlarmActive: active }),

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
        alarmThreshold: 3,
        isAlarmActive: false,
        stationsRemaining: null,

        // Settings
        isTracking: false,
        hasLocationPermission: false,
      });
    },
  };
});

export default useTibaStore;
