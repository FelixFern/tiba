import { create } from 'zustand';
import { createMMKV } from 'react-native-mmkv';
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
  stationHistory: Station[];
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
  hasNotificationPermission: boolean;
}

// ============================================================================
// Full Store Type
// ============================================================================

export interface TibaStore extends LocationState, TripState, SettingsState {
  // Location actions
  setCurrentPosition: (pos: Position | null) => void;
  setNearestStation: (station: Station | null) => void;
  setCurrentLine: (line: Line | null) => void;
  setDirection: (direction: 'increasing' | 'decreasing' | null) => void;
  setStationHistory: (stations: Station[]) => void;
  addToStationHistory: (station: Station) => void;
  clearStationHistory: () => void;

  // Trip actions
  setDestination: (station: Station | null) => void;
  setAlarmThreshold: (threshold: number) => void;
  setIsAlarmActive: (active: boolean) => void;
  setStationsRemaining: (count: number | null) => void;

  // Settings actions
  setIsTracking: (tracking: boolean) => void;
  setHasLocationPermission: (has: boolean) => void;
  setHasNotificationPermission: (has: boolean) => void;

  // Utility
  resetStore: () => void;
  loadPersistedState: () => void;
}

// ============================================================================
// MMKV Storage Instance
// ============================================================================

export const storage = createMMKV();

const MMKV_KEYS = {
  DESTINATION: 'tiba_destination',
  ALARM_THRESHOLD: 'tiba_alarm_threshold',
};

// ============================================================================
// Zustand Store
// ============================================================================

export const useTibaStore = create<TibaStore>((set, get) => {
  // Initialize from MMKV on first load
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
    // Location State (Transient)
    // ========================================================================
    currentPosition: null,
    nearestStation: null,
    currentLine: null,
    direction: null,
    stationHistory: [],

    // ========================================================================
    // Trip State (Partial Persistence)
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
    hasNotificationPermission: false,

    // ========================================================================
    // Location Actions
    // ========================================================================
    setCurrentPosition: (pos) =>
      set({ currentPosition: pos }),

    setNearestStation: (station) =>
      set({ nearestStation: station }),

    setCurrentLine: (line) =>
      set({ currentLine: line }),

    setDirection: (direction) =>
      set({ direction }),

    setStationHistory: (stations) =>
      set({ stationHistory: stations }),

    addToStationHistory: (station) =>
      set((state) => ({
        stationHistory: [station, ...state.stationHistory],
      })),

    clearStationHistory: () =>
      set({ stationHistory: [] }),

    // ========================================================================
    // Trip Actions (with MMKV Persistence)
    // ========================================================================
    setDestination: (station) => {
      set({ destination: station });

      // Persist to MMKV
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

      // Persist to MMKV
      try {
        storage.set(MMKV_KEYS.ALARM_THRESHOLD, threshold);
      } catch (e) {
        console.warn('Failed to persist alarm threshold:', e);
      }
    },

    setIsAlarmActive: (active) =>
      set({ isAlarmActive: active }),

    setStationsRemaining: (count) =>
      set({ stationsRemaining: count }),

    // ========================================================================
    // Settings Actions
    // ========================================================================
    setIsTracking: (tracking) =>
      set({ isTracking: tracking }),

    setHasLocationPermission: (has) =>
      set({ hasLocationPermission: has }),

    setHasNotificationPermission: (has) =>
      set({ hasNotificationPermission: has }),

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
        stationHistory: [],

        // Trip
        destination: null,
        alarmThreshold: 3,
        isAlarmActive: false,
        stationsRemaining: null,

        // Settings
        isTracking: false,
        hasLocationPermission: false,
        hasNotificationPermission: false,
      });
    },

    loadPersistedState: () => {
      const state = loadPersistedState();
      set(state);
    },
  };
});

export default useTibaStore;
