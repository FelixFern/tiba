import * as Location from 'expo-location';
import { findNearestStations, StationWithDistance } from './distance';
import { getAllStations, getLineById } from './data';
import { useTibaStore, Position } from './store';
import { Station, LineId } from './types';
import { detectDirection, inferLineFromStation } from './direction';

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
 * Update the nearest station based on current position
 * Calls findNearestStations, checks if distance <200m
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

    if (nearestStations.length > 0) {
      const nearest: StationWithDistance = nearestStations[0];
      const STATION_THRESHOLD = 200; // meters

      if (nearest.distance < STATION_THRESHOLD) {
        // Extract Station properties (exclude distance)
        const station: Station = {
          id: nearest.id,
          name: nearest.name,
          lat: nearest.lat,
          lon: nearest.lon,
          lines: nearest.lines,
          sequences: nearest.sequences,
        };
        useTibaStore.setState({ nearestStation: station });
      } else {
        useTibaStore.setState({ nearestStation: null });
      }
    } else {
      useTibaStore.setState({ nearestStation: null });
    }
  } catch (error) {
    console.error('Error updating nearest station:', error);
  }
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

    // Start watching position
    locationSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        distanceInterval: 50, // meters
      },
      (location) => {
        const position: Position = {
          lat: location.coords.latitude,
          lon: location.coords.longitude,
        };

        // Update current position in store
        useTibaStore.setState({ currentPosition: position });

        // Update nearest station detection
        updateNearestStation(position);
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

    // Add station to circular buffer (max 3 stations)
    detectedStations.unshift(nearestStation);
    if (detectedStations.length > 3) {
      detectedStations.pop();
    }

    // Track line from this station
    for (const line of nearestStation.lines) {
      lineHistory.unshift(line);
    }
    if (lineHistory.length > 3) {
      lineHistory.pop();
    }

    // Need at least one station to infer a line
    if (detectedStations.length === 0) {
      return;
    }

    // Infer current line from most recent station and line history
    const inferredLineId = inferLineFromStation(nearestStation, lineHistory);
    const inferredLine = getLineById(inferredLineId);

    if (!inferredLine) {
      return;
    }

    // Detect direction using station history and inferred line
    const direction = detectDirection(detectedStations, inferredLine);

    // Update store with inferred line and detected direction
    useTibaStore.setState({
      currentLine: inferredLine,
      direction,
    });
  } catch (error) {
    console.error('Error updating direction detection:', error);
  }
}
