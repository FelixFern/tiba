import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import {
  updateNearestStation,
  updateDirectionDetection,
  evaluateTrip,
  startForegroundTracking,
  stopForegroundTracking,
  resetDetectionState,
} from './location';
import { useTibaStore, Position, Station, LineId } from './store';
import { getStationById, getLineById } from './data';
import { getTripView } from './trip-view';
import {
  startLiveCard,
  updateLiveCard,
  endLiveCard,
  isLiveCardActive,
  type LiveCardState,
} from './live-card';
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
      // Show the current leg's target (transfer or final destination) plus leg
      // progress for multi-leg trips, e.g. "Citayam → Tanah Abang (1/2)".
      const { tripPlan, currentLegIndex } = useTibaStore.getState();
      const leg = tripPlan?.legs[currentLegIndex];
      const target = leg ? (getStationById(leg.toStationId) ?? destination) : destination;
      const legSuffix =
        tripPlan && tripPlan.legs.length > 1 ? ` (${currentLegIndex + 1}/${tripPlan.legs.length})` : '';
      const transferring = leg?.isTransfer ?? false;

      title = `${station.name} → ${target.name}${legSuffix}`;
      if (stationsRemaining !== null) {
        if (stationsRemaining === 0) {
          body = transferring ? 'Transfer now · change lines' : 'Arriving now · prepare to alight';
        } else {
          const stops = `${stationsRemaining} ${stationsRemaining === 1 ? 'station' : 'stations'} left`;
          body = transferring ? `${stops} · transfer ahead` : `${stops} · alarm armed`;
        }
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
 * Build the live-card snapshot from current trip state, or null if there's no
 * active position/destination to show.
 */
function buildLiveCardState(): LiveCardState | null {
  const st = useTibaStore.getState();
  if (!st.nearestStation || !st.destination) return null;
  const view = getTripView({
    tripPlan: st.tripPlan,
    currentLegIndex: st.currentLegIndex,
    nearestStationId: st.nearestStation.id,
    destination: st.destination,
    stationsRemaining: st.stationsRemaining,
  });
  if (!view) return null;

  const statusText =
    view.status === 'transfer'
      ? view.nextLineName
        ? `transfer · ${view.nextLineName}`
        : 'transfer'
      : view.status === 'arrived'
        ? 'arriving'
        : 'alarm armed';

  return {
    fromName: st.nearestStation.name,
    toName: view.target?.name ?? st.destination.name,
    stopsLeft: view.stopsLeft ?? 0,
    statusText,
    lineColor: view.line?.color ?? NOTIFICATION_COLOR,
    total: view.progress.total,
    current: view.progress.current,
  };
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

  // Tapping the alarm (or its body) brings up the full-screen alarm overlay,
  // which the root layout renders whenever isAlarmActive is true.
  const isAlarmNotification = notification.request.content.data?.alarm === true;
  if (isAlarmNotification) {
    useTibaStore.setState({ isAlarmActive: true });
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

        // Shared with the foreground path: recompute progress, buzz the
        // threshold heads-up (inside evaluateTrip), and arm the transfer/arrival
        // alarm.
        const { stationsRemaining, triggered } = evaluateTrip();
        const newState = useTibaStore.getState();
        const { nearestStation, destination, tripPlan, currentLegIndex } = newState;

        if (triggered) {
          const leg = tripPlan?.legs[currentLegIndex];
          const isTransfer = triggered === 'transfer';
          const alightName =
            getStationById(leg?.toStationId ?? '')?.name ?? destination?.name ?? 'your stop';
          const nextLineName = isTransfer
            ? getLineById(tripPlan?.legs[currentLegIndex + 1]?.lineId as LineId)?.name
            : undefined;

          await Notifications.scheduleNotificationAsync({
            content: {
              title: isTransfer ? `TRANSFER: ${alightName}` : `ARRIVED: ${alightName}`,
              body: isTransfer
                ? `Change here${nextLineName ? ` · ${nextLineName}` : ''} · get ready`
                : 'You have arrived · prepare to alight',
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

        // Rich lock-screen card (iOS Live Activity / Android custom notification).
        const cardState = buildLiveCardState();
        if (cardState) updateLiveCard(cardState);

        const currentStationId = nearestStation?.id || null;
        if (currentStationId !== lastNotifiedStationId) {
          lastNotifiedStationId = currentStationId;
          // Fall back to the plain text notification only when the rich card
          // isn't available (Expo Go, web, iOS < 16.1).
          if (!isLiveCardActive()) {
            await updateLiveNotification(nearestStation, destination, stationsRemaining);
          }
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

    // Foreground permission is mandatory — without it we can't read location.
    const foregroundStatus = await Location.getForegroundPermissionsAsync();
    if (!foregroundStatus.granted) {
      const foregroundRequest = await Location.requestForegroundPermissionsAsync();
      if (!foregroundRequest.granted) {
        return;
      }
    }

    // Background ("Allow all the time") is best-effort. If the user doesn't
    // grant it, we still track via a foreground watch while the app is open
    // rather than doing nothing — the in-app alarm works either way. Otherwise
    // declining the Android background prompt made "Start Tracking" a no-op.
    const backgroundStatus = await Location.getBackgroundPermissionsAsync();
    let backgroundGranted = backgroundStatus.granted;
    if (!backgroundGranted) {
      backgroundGranted = (await Location.requestBackgroundPermissionsAsync()).granted;
    }
    if (!backgroundGranted) {
      await startForegroundTracking();
      return;
    }

    const isRegistered = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    if (isRegistered) {
      useTibaStore.setState({ isTracking: true });
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

    // Kick off the rich lock-screen card; fall back to the text notification
    // only if the native card isn't available.
    const cardState = buildLiveCardState();
    if (cardState) startLiveCard(cardState);

    if (!isLiveCardActive()) {
      const state = useTibaStore.getState();
      await updateLiveNotification(state.nearestStation, state.destination, state.stationsRemaining);
    }
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

    endLiveCard();
    await clearLiveNotification();

    lastNotifiedStationId = null;
    resetDetectionState();

    useTibaStore.setState({ isTracking: false });
  } catch (error) {
    // Silently handle cleanup errors
  }
}
