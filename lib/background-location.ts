import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { updateNearestStation, updateDirectionDetection } from './location';
import { useTibaStore, Position, Station, LineId } from './store';
import { checkAlarmTrigger } from './alarm';
import { Platform } from 'react-native';

// ============================================================================
// Types
// ============================================================================

interface LocationTaskData {
  locations: Location.LocationObject[];
}

// ============================================================================
// Constants
// ============================================================================

const LOCATION_TASK_NAME = 'TIBA_LOCATION_TASK';
const NOTIFICATION_COLOR = '#3B82F6';

// ============================================================================
// Station Change Tracking
// ============================================================================

let lastNotifiedStationId: string | null = null;
let lastAlarmStationId: string | null = null;

// ============================================================================
// Calculate Stations Remaining
// ============================================================================

/**
 * Calculate how many stations remain between current and destination
 * @param currentStation - Current detected station
 * @param destination - Destination station
 * @param direction - Travel direction ('increasing' | 'decreasing')
 * @param lineId - Current line ID
 * @returns Number of stations remaining or null if cannot calculate
 */
function calculateStationsRemaining(
  currentStation: Station,
  destination: Station,
  direction: 'increasing' | 'decreasing' | null,
  lineId: LineId | null
): number | null {
  if (!direction || !lineId) {
    return null;
  }

  const currentSeq = currentStation.sequences[lineId];
  const destSeq = destination.sequences[lineId];

  if (currentSeq === undefined || destSeq === undefined) {
    return null;
  }

  if (direction === 'increasing') {
    return destSeq > currentSeq ? destSeq - currentSeq : null;
  } else {
    return currentSeq > destSeq ? currentSeq - destSeq : null;
  }
}

// ============================================================================
// Update Live Notification
// ============================================================================

/**
 * Update the persistent notification with live station information
 * @param station - Current station (null if detecting)
 * @param destination - Destination station (null if not set)
 * @param stationsRemaining - Number of stations left (null if unknown)
 */
export async function updateLiveNotification(
  station: Station | null,
  destination: Station | null,
  stationsRemaining: number | null
): Promise<void> {
  try {
    let title = 'Tiba - Tracking';
    let body = 'Detecting location...';

    if (station && destination) {
      title = 'Tiba - Tracking';
      if (stationsRemaining !== null) {
        body = `${station.name} → ${destination.name} • ${stationsRemaining} stations left`;
      } else {
        body = `${station.name} → ${destination.name}`;
      }
    } else if (station) {
      title = 'Tiba - Tracking';
      body = `At ${station.name}`;
    } else if (destination) {
      title = 'Tiba - Tracking';
      body = `Detecting location... → ${destination.name}`;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { persistent: true },
        priority: Notifications.AndroidNotificationPriority.DEFAULT,
      },
      trigger: null,
    });
  } catch (error) {
    // Silently fail notification updates
  }
}

Notifications.addNotificationResponseReceivedListener((response) => {
  const isAlarmNotification = response.notification.request.content.data?.alarm === true;
  if (isAlarmNotification) {
    router.push('/alarm-trigger');
  }
});

// ============================================================================
// Background Task Definition
// ============================================================================

/**
 * Define the background location task
 * This MUST be called at module scope before any Location.startLocationUpdatesAsync
 */
TaskManager.defineTask<LocationTaskData>(
  LOCATION_TASK_NAME,
  async ({ data, error }: TaskManager.TaskManagerTaskBody<LocationTaskData>) => {
    if (error) {
      return;
    }

    if (data) {
      const { locations } = data;
      if (!locations || locations.length === 0) {
        return;
      }

      const location = locations[0];
      const position: Position = {
        lat: location.coords.latitude,
        lon: location.coords.longitude,
      };

      try {
        const state = useTibaStore.getState();
        const previousStation = state.nearestStation;

        useTibaStore.setState({ currentPosition: position });

        updateNearestStation(position);
        updateDirectionDetection();

        const newState = useTibaStore.getState();
        const { nearestStation, destination, direction, currentLine } = newState;

        let stationsRemaining: number | null = null;
        if (nearestStation && destination && direction && currentLine) {
          stationsRemaining = calculateStationsRemaining(
            nearestStation,
            destination,
            direction,
            currentLine.id
          );
          useTibaStore.setState({ stationsRemaining });
        }

        const { alarmThreshold, isAlarmActive } = newState;
        if (
          !isAlarmActive &&
          nearestStation &&
          destination &&
          currentLine &&
          direction &&
          stationsRemaining !== null
        ) {
          const shouldTrigger = checkAlarmTrigger(
            nearestStation,
            destination,
            currentLine,
            direction,
            alarmThreshold
          );

          if (shouldTrigger && lastAlarmStationId !== nearestStation.id) {
            lastAlarmStationId = nearestStation.id;
            useTibaStore.setState({ isAlarmActive: true });

            await Notifications.scheduleNotificationAsync({
              content: {
                title: `ALARM: ${destination.name} Approaching`,
                body: `${stationsRemaining} ${stationsRemaining === 1 ? 'station' : 'stations'} remaining`,
                sound: true,
                data: { alarm: true },
                priority: Notifications.AndroidNotificationPriority.MAX,
                ...Platform.select({
                  ios: {
                    interruptionLevel: 'critical' as const,
                  },
                }),
              },
              trigger: null,
            });
          }
        }

        const currentStationId = nearestStation?.id || null;
        if (currentStationId !== lastNotifiedStationId) {
          lastNotifiedStationId = currentStationId;
          await updateLiveNotification(nearestStation, destination, stationsRemaining);
        }
      } catch (taskError) {
        // Silently handle errors in background task
      }
    }
  }
);

// ============================================================================
// Start Background Tracking
// ============================================================================

/**
 * Start background location tracking with foreground service
 * Requests background permissions and starts location updates
 * Shows persistent notification on Android
 */
export async function startBackgroundTracking(): Promise<void> {
  try {
    const foregroundStatus = await Location.getForegroundPermissionsAsync();
    if (!foregroundStatus.granted) {
      const foregroundRequest = await Location.requestForegroundPermissionsAsync();
      if (!foregroundRequest.granted) {
        return;
      }
    }

    const backgroundStatus = await Location.getBackgroundPermissionsAsync();
    if (!backgroundStatus.granted) {
      const backgroundRequest = await Location.requestBackgroundPermissionsAsync();
      if (!backgroundRequest.granted) {
        return;
      }
    }

    const isRegistered = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    if (isRegistered) {
      return;
    }

    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.Balanced,
      distanceInterval: 50,
      foregroundService: {
        notificationTitle: 'Tiba - Tracking',
        notificationBody: 'Detecting location...',
        notificationColor: NOTIFICATION_COLOR,
      },
      showsBackgroundLocationIndicator: Platform.OS === 'ios',
    });

    useTibaStore.setState({ isTracking: true });

    const state = useTibaStore.getState();
    await updateLiveNotification(
      state.nearestStation,
      state.destination,
      state.stationsRemaining
    );
  } catch (error) {
    useTibaStore.setState({ isTracking: false });
  }
}

// ============================================================================
// Stop Background Tracking
// ============================================================================

/**
 * Stop background location tracking and cleanup
 */
export async function stopBackgroundTracking(): Promise<void> {
  try {
    const isRegistered = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    if (isRegistered) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    }

    lastNotifiedStationId = null;
    lastAlarmStationId = null;

    useTibaStore.setState({ isTracking: false });
  } catch (error) {
    // Silently handle cleanup errors
  }
}
