import * as Location from 'expo-location';
import { findNearestStations, StationWithDistance } from './distance';
import { getAllStations, getLineById } from './data';
import { useTibaStore, Position } from './store';
import { Station, LineId } from './types';
import { predictDirection, inferLineFromStation } from './direction';

// ============================================================================
// Types
// ============================================================================

type LocationSubscription = Location.LocationSubscription | null;

// ============================================================================
// Module State
// ============================================================================

let locationSubscription: LocationSubscription = null;

// Circular buffer for tracking detected stations (max 3)
let detectedStations: Station[] = [];

// Line history for inferring current line on multi-line stations
let lineHistory: LineId[] = [];

// ============================================================================
// Request Location Permissions
// ============================================================================

/**
 * Request foreground location permissions from user
 * Uses expo-location requestForegroundPermissionsAsync for iOS/Android
 * @returns Promise<boolean> - true if permission granted, false otherwise
 */
export async function requestLocationPermissions(): Promise<boolean> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    const granted = status === 'granted';
    useTibaStore.setState({ hasLocationPermission: granted });
    return granted;
  } catch (error) {
    console.error('Error requesting location permissions:', error);
    return false;
  }
}

// ============================================================================
// Update Nearest Station Detection
// ============================================================================

/**
 * Update the nearest station based on current position.
 *
 * Always reports the closest station (no distance gate), so the UI consistently
 * shows where the user is along the line rather than blanking out between
 * stations. The measured distance is kept in the store so callers can still
 * distinguish "at" a station from merely "nearest to" one.
 *
 * @param position Current position {lat, lon}
 */
export function updateNearestStation(position: Position): void {
  try {
    const allStations = getAllStations();
    const nearestStations = findNearestStations(
      position.lat,
      position.lon,
      allStations,
      1
    );

    if (nearestStations.length === 0) {
      return;
    }

    const nearest: StationWithDistance = nearestStations[0];
    const station: Station = {
      id: nearest.id,
      name: nearest.name,
      lat: nearest.lat,
      lon: nearest.lon,
      lines: nearest.lines,
      sequences: nearest.sequences,
    };

    // Always keep the current line in sync with the nearest station, inferring
    // from line history for multi-line hubs, so the UI can show it at all times
    // (even before enough movement has resolved a travel direction).
    const inferredLine = getLineById(inferLineFromStation(station, lineHistory));

    useTibaStore.setState({
      nearestStation: station,
      currentLine: inferredLine ?? useTibaStore.getState().currentLine,
    });
  } catch (error) {
    console.error('Error updating nearest station:', error);
  }
}

/**
 * Take a single location reading and update the nearest station / line.
 *
 * Used to populate "current position" on screen load without starting a full
 * tracking session, so the home screen can always show where the user is.
 * No-op if foreground permission hasn't been granted.
 */
export async function refreshCurrentLocationOnce(): Promise<void> {
  try {
    const { granted } = await Location.getForegroundPermissionsAsync();
    if (!granted) return;

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const position: Position = {
      lat: location.coords.latitude,
      lon: location.coords.longitude,
    };

    useTibaStore.setState({ currentPosition: position });
    updateNearestStation(position);
    updateDirectionDetection();
  } catch (error) {
    // Best-effort only.
  }
}

/**
 * Reset the in-memory station/line history used for direction prediction.
 * Call when (re)starting tracking so a stale buffer doesn't leak into a new trip.
 */
export function resetDetectionState(): void {
  detectedStations = [];
  lineHistory = [];
}

// ============================================================================
// Start Foreground Location Tracking
// ============================================================================

/**
 * Start watching user's foreground location
 * Uses Location.watchPositionAsync with Accuracy.Balanced and 50m distance interval
 * Updates currentPosition in store on each update
 * @returns Promise<void>
 */
export async function startForegroundTracking(): Promise<void> {
  try {
    // Clean up any existing subscription
    if (locationSubscription) {
      locationSubscription.remove();
    }

    // Request permissions first
    const hasPermission = await requestLocationPermissions();
    if (!hasPermission) {
      console.warn('Location permissions not granted');
      return;
    }

    // Fresh trip — clear any stale direction history.
    resetDetectionState();

    // Start watching position. Tighter cadence + higher accuracy so the nearest
    // station and predicted direction stay responsive as the train moves.
    locationSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 3000, // ms
        distanceInterval: 15, // meters
      },
      (location) => {
        const position: Position = {
          lat: location.coords.latitude,
          lon: location.coords.longitude,
        };

        // Update current position in store
        useTibaStore.setState({ currentPosition: position });

        // Update nearest station, then refine line + direction prediction.
        updateNearestStation(position);
        updateDirectionDetection();
      }
    );

    useTibaStore.setState({ isTracking: true });
  } catch (error) {
    console.error('Error starting location tracking:', error);
    useTibaStore.setState({ isTracking: false });
  }
}

// ============================================================================
// Stop Foreground Location Tracking
// ============================================================================

/**
 * Stop watching user's location and cleanup subscription
 * @returns void
 */
export function stopForegroundTracking(): void {
  try {
    if (locationSubscription) {
      locationSubscription.remove();
      locationSubscription = null;
    }
    resetDetectionState();
    useTibaStore.setState({ isTracking: false });
  } catch (error) {
    console.error('Error stopping location tracking:', error);
  }
}

// ============================================================================
// Update Direction Detection
// ============================================================================

/**
 * Update direction and inferred line based on station history
 * Maintains circular buffer of last 3 detected stations
 * Infers current line from most common line in history (for multi-line stations)
 * Calls detectDirection and updates store with result
 *
 * This function should be called whenever nearestStation is updated
 * to continuously refine direction and line detection
 *
 * @returns void
 */
export function updateDirectionDetection(): void {
  try {
    const state = useTibaStore.getState();
    const { nearestStation } = state;

    if (!nearestStation) {
      return;
    }

    // Only record a new sample when the nearest station actually changes —
    // repeated identical samples would otherwise swamp the buffer and prevent
    // a direction from ever resolving.
    const lastDetected = detectedStations[0];
    if (!lastDetected || lastDetected.id !== nearestStation.id) {
      detectedStations.unshift(nearestStation);
      if (detectedStations.length > 5) {
        detectedStations.pop();
      }

      for (const line of nearestStation.lines) {
        lineHistory.unshift(line);
      }
      if (lineHistory.length > 6) {
        lineHistory.length = 6;
      }
    }

    // Infer current line from most recent station and line history.
    const inferredLineId = inferLineFromStation(nearestStation, lineHistory);
    const inferredLine = getLineById(inferredLineId);

    if (!inferredLine) {
      return;
    }

    // Predict direction; keep the last known direction if not yet determinable
    // (e.g. only one distinct station so far) so the UI doesn't flicker to null.
    const predicted = predictDirection(detectedStations, inferredLine);

    useTibaStore.setState({
      currentLine: inferredLine,
      direction: predicted ?? state.direction,
    });
  } catch (error) {
    console.error('Error updating direction detection:', error);
  }
}
