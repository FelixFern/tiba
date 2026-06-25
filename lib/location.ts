import * as Location from 'expo-location';
import { Vibration } from 'react-native';
import { findNearestStations, equirectangular, StationWithDistance } from './distance';
import { getAllStations, getLineById } from './data';
import { useTibaStore, Position } from './store';
import { Station, LineId } from './types';
import { predictDirection, inferLineFromStation } from './direction';
import { planRoute } from './transit';

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

// Station where the arrival alarm last fired, so a single trip arms the alarm
// exactly once per station even though location updates stream continuously.
let lastAlarmStationId: string | null = null;

// Station where the heads-up vibration last fired, so each stop inside the
// threshold window buzzes at most once.
let lastPrealertStationId: string | null = null;

// Last station we reported as nearest. Detection is "sticky": we only switch
// away from it when another candidate is closer by more than STICKY_MARGIN_M,
// which stops the displayed station flickering between two near-equidistant
// stops and absorbs small coordinate inaccuracies.
let lastNearestId: string | null = null;
const STICKY_MARGIN_M = 250;

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
 * The line(s) the trip is currently riding: the active leg's line when a route
 * is planned, otherwise the final destination's line(s). Returns null when no
 * trip is set (free position preview). Used to bias station/line detection so a
 * physically-close station on a *parallel* line can't hijack the current line.
 */
function activeTripLines(): LineId[] | null {
  const { tripPlan, currentLegIndex, destination } = useTibaStore.getState();
  const leg = tripPlan?.legs[currentLegIndex];
  if (leg) return [leg.lineId];
  if (destination) return destination.lines;
  return null;
}

/**
 * The set of station ids that make up the planned route (every leg, board →
 * alight). When a route is planned we predict position *along the route*: the
 * detected station can only be one we'll actually pass, so GPS noise can't snap
 * us to an off-route station even on the same line. Null when no route yet.
 */
function activeRouteStationIds(): Set<string> | null {
  const { tripPlan } = useTibaStore.getState();
  if (!tripPlan || tripPlan.legs.length === 0) return null;
  const ids = new Set<string>();
  for (const leg of tripPlan.legs) {
    for (const id of leg.stationIds) ids.add(id);
  }
  return ids.size > 0 ? ids : null;
}

/**
 * Resolve which line a station should be attributed to, biased toward the
 * active trip line so we don't flip onto a neighbouring parallel line.
 */
function resolveLineForStation(station: Station): LineId {
  const active = activeTripLines();
  const tripLines = active ? station.lines.filter((l) => active.includes(l)) : station.lines;
  const candidateLines = tripLines.length > 0 ? tripLines : station.lines;
  return inferLineFromStation({ ...station, lines: candidateLines }, lineHistory);
}

/**
 * Update the nearest station based on current position.
 *
 * Always reports the closest station (no distance gate), so the UI consistently
 * shows where the user is along the line rather than blanking out between
 * stations. The measured distance is kept in the store so callers can still
 * distinguish "at" a station from merely "nearest to" one.
 *
 * When a destination is set, candidate stations are restricted to that line so
 * a nearby station on a different line can't hijack the current position.
 *
 * @param position Current position {lat, lon}
 */
export function updateNearestStation(position: Position): void {
  try {
    // Candidate stations, tightest constraint first:
    //   1. With a planned route → only stations on that route (predict by route).
    //   2. With a destination but no route yet → stations on the destination's line(s).
    //   3. Otherwise → every station (free position preview).
    const allStations = getAllStations();
    let candidates = allStations;

    const routeIds = activeRouteStationIds();
    if (routeIds) {
      const onRoute = allStations.filter((s) => routeIds.has(s.id));
      if (onRoute.length > 0) {
        candidates = onRoute;
      }
    } else {
      const active = activeTripLines();
      if (active && active.length > 0) {
        const onTripLines = allStations.filter((s) => s.lines.some((l) => active.includes(l)));
        if (onTripLines.length > 0) {
          candidates = onTripLines;
        }
      }
    }

    const nearestStations = findNearestStations(
      position.lat,
      position.lon,
      candidates,
      1
    );

    if (nearestStations.length === 0) {
      return;
    }

    let nearest: StationWithDistance = nearestStations[0];

    // Sticky hysteresis: keep the previously-reported station unless the new
    // nearest beats it by more than the margin. Prevents flicker between two
    // close stops and tolerates small coordinate errors.
    if (lastNearestId && lastNearestId !== nearest.id) {
      const prev = candidates.find((s) => s.id === lastNearestId);
      if (prev) {
        const prevDist = equirectangular(position.lat, position.lon, prev.lat, prev.lon);
        if (prevDist <= nearest.distance + STICKY_MARGIN_M) {
          nearest = { ...prev, distance: prevDist };
        }
      }
    }
    lastNearestId = nearest.id;

    const station: Station = {
      id: nearest.id,
      name: nearest.name,
      lat: nearest.lat,
      lon: nearest.lon,
      lines: nearest.lines,
      sequences: nearest.sequences,
    };

    // Keep the current line in sync, biased to the trip line for multi-line hubs.
    const inferredLine = getLineById(resolveLineForStation(station));

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
  lastAlarmStationId = null;
  lastPrealertStationId = null;
  lastNearestId = null;
}

// ============================================================================
// Evaluate Trip — stations remaining + arrival alarm
// ============================================================================

/**
 * Recompute progress for the active trip and decide what (if anything) should
 * fire. Writes `stationsRemaining` (stops to the current leg's alight) and, on a
 * fresh trigger, `isAlarmActive` + `alarmKind` to the store.
 *
 * This is the single source of truth shared by the foreground watcher and the
 * background TaskManager task (the background service isn't available in Expo
 * Go, where everything falls back to foreground watching).
 *
 * Behaviour per leg:
 *  - Within the threshold window (0 < remaining <= threshold): heads-up
 *    *vibration only*, once per station.
 *  - remaining === 0 on a transfer leg: transfer alarm (kind 'transfer').
 *  - remaining === 0 on the final leg: arrival alarm (kind 'arrival').
 *
 * The trip plan is rebuilt lazily from the current nearest station if missing,
 * so a cold start mid-journey re-plans from where the user actually is.
 *
 * @returns `triggered` (the alarm kind that just armed, or null) and
 * `prealertJustTriggered`, each at most once per station, so callers can post a
 * matching notification.
 */
export function evaluateTrip(): {
  stationsRemaining: number | null;
  triggered: 'transfer' | 'arrival' | null;
  prealertJustTriggered: boolean;
} {
  const idle = { stationsRemaining: null, triggered: null, prealertJustTriggered: false } as const;

  const state = useTibaStore.getState();
  const { nearestStation, destination, alarmThreshold, isAlarmActive, currentLegIndex } = state;

  if (!nearestStation || !destination) {
    return idle;
  }

  // Lazily plan a route once we know where we are (origin = current station).
  let plan = state.tripPlan;
  if (!plan) {
    plan = planRoute(nearestStation.id, destination.id);
    if (plan) {
      useTibaStore.setState({ tripPlan: plan, currentLegIndex: 0 });
    } else {
      return idle;
    }
  }

  const leg = plan.legs[currentLegIndex];
  if (!leg) return idle;

  // Stops to the leg's alight, straight from the ordered leg segment (the alight
  // is the last id). Null when the user isn't on this leg's known segment yet.
  const curIdx = leg.stationIds.indexOf(nearestStation.id);
  const stationsRemaining = curIdx === -1 ? null : leg.stationIds.length - 1 - curIdx;
  useTibaStore.setState({ stationsRemaining });

  if (stationsRemaining === null) {
    return { stationsRemaining, triggered: null, prealertJustTriggered: false };
  }

  let triggered: 'transfer' | 'arrival' | null = null;
  let prealertJustTriggered = false;

  if (stationsRemaining === 0) {
    if (!isAlarmActive && lastAlarmStationId !== nearestStation.id) {
      lastAlarmStationId = nearestStation.id;
      triggered = leg.isTransfer ? 'transfer' : 'arrival';
      useTibaStore.setState({ isAlarmActive: true, alarmKind: triggered });
    }
  } else if (stationsRemaining <= alarmThreshold && lastPrealertStationId !== nearestStation.id) {
    // Inside the threshold window but not there yet → heads-up vibration only.
    lastPrealertStationId = nearestStation.id;
    Vibration.vibrate([0, 350, 150, 350]);
    prealertJustTriggered = true;
  }

  return { stationsRemaining, triggered, prealertJustTriggered };
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

        // Recompute distance-to-destination and arm the alarm if we're close.
        // Without this the alarm never fires on the foreground path (which is
        // also the Expo Go fallback for background tracking).
        evaluateTrip();
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

    // Infer current line, biased to the trip line so a parallel-line station
    // can't flip us off the line we're actually riding.
    const inferredLineId = resolveLineForStation(nearestStation);
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
