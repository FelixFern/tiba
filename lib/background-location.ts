import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import {
  updateNearestStation,
  updateDirectionDetection,
  startForegroundTracking,
  stopForegroundTracking,
  resetDetectionState,
} from './location';
import { useTibaStore, Position, Station, LineId } from './store';
import { checkAlarmTrigger } from './alarm';
import { isExpoGo } from './env';
import {
  LIVE_NOTIFICATION_ID,
  LIVE_CHANNEL_ID,
  ALARM_CHANNEL_ID,
  LIVE_CATEGORY_ID,
  ACTION_STOP,
} from './notifications';
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
    const lineName = useTibaStore.getState().currentLine?.name?.toUpperCase();

    // Default (still locating).
    let title = 'tiba · tracking';
    let body = 'Detecting location…';
    let subtitle: string | undefined;

    if (station && destination) {
      // Matches design screen 04: "Citayam → Bogor" / "3 stations left · alarm armed".
      title = `${station.name} → ${destination.name}`;
      if (stationsRemaining !== null) {
        body =
          stationsRemaining === 0
            ? 'Arriving now · prepare to alight'
            : `${stationsRemaining} ${stationsRemaining === 1 ? 'station' : 'stations'} left · alarm armed`;
      } else {
        body = 'Alarm armed · detecting distance';
      }
      subtitle = lineName;
    } else if (station) {
      title = station.name;
      body = lineName ? `Near ${station.name} · ${lineName}` : `Near ${station.name}`;
    }

    // Re-using a stable identifier means each update replaces the single ongoing
    // notification instead of stacking a new one. The channelId trigger delivers
    // it immediately on the silent live channel.
    await Notifications.scheduleNotificationAsync({
      identifier: LIVE_NOTIFICATION_ID,
      content: {
        title,
        subtitle,
        body,
        data: { persistent: true },
        categoryIdentifier: LIVE_CATEGORY_ID,
        color: NOTIFICATION_COLOR,
        sticky: true,
        autoDismiss: false,
        priority: Notifications.AndroidNotificationPriority.DEFAULT,
      },
      trigger: { channelId: LIVE_CHANNEL_ID },
    });
  } catch (error) {
    // Silently fail
  }
}

/**
 * Dismiss the persistent live-tracking notification.
 */
export async function clearLiveNotification(): Promise<void> {
  try {
    await Notifications.dismissNotificationAsync(LIVE_NOTIFICATION_ID);
    await Notifications.cancelScheduledNotificationAsync(LIVE_NOTIFICATION_ID);
  } catch {
    // ignore
  }
}

Notifications.addNotificationResponseReceivedListener((response) => {
  const { actionIdentifier, notification } = response;

  // "Stop" action on the live notification ends tracking.
  if (actionIdentifier === ACTION_STOP) {
    void stopBackgroundTracking();
    return;
  }

  // Tapping the alarm (or its body) opens the full-screen alarm.
  const isAlarmNotification = notification.request.content.data?.alarm === true;
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
                title: `ARRIVING: ${destination.name}`,
                body: `${stationsRemaining} ${stationsRemaining === 1 ? 'station' : 'stations'} remaining · prepare to alight`,
                sound: true,
                data: { alarm: true },
                color: NOTIFICATION_COLOR,
                priority: Notifications.AndroidNotificationPriority.MAX,
                ...Platform.select({
                  ios: {
                    interruptionLevel: 'critical' as const,
                  },
                }),
              },
              trigger: { channelId: ALARM_CHANNEL_ID },
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
    // Expo Go can't run the background TaskManager location service, so fall
    // back to foreground watching there. This keeps the full flow usable for
    // UI slicing; a dev/prod build gets the real background service.
    if (isExpoGo) {
      await startForegroundTracking();
      return;
    }

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

    resetDetectionState();

    // Tighter cadence than before (was 50m / Balanced) for snappier station and
    // direction updates while still being battery-reasonable for a train ride.
    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.High,
      timeInterval: 5000,
      distanceInterval: 20,
      foregroundService: {
        notificationTitle: 'tiba · tracking',
        notificationBody: 'Detecting location…',
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
    if (isExpoGo) {
      stopForegroundTracking();
    } else {
      const isRegistered = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
      if (isRegistered) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      }
    }

    await clearLiveNotification();

    lastNotifiedStationId = null;
    lastAlarmStationId = null;
    resetDetectionState();

    useTibaStore.setState({ isTracking: false });
  } catch (error) {
    // Silently handle cleanup errors
  }
}
