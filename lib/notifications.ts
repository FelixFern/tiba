import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Stable identifiers so the live "tracking" notification updates a single entry
// in place (per design screen 04) instead of stacking new notifications.
export const LIVE_NOTIFICATION_ID = 'tiba-live-tracking';
export const LIVE_CHANNEL_ID = 'tiba-live';
export const ALARM_CHANNEL_ID = 'tiba-alarm';
export const LIVE_CATEGORY_ID = 'tiba-live-actions';

// Notification action identifiers (handled in the response listener).
export const ACTION_STOP = 'STOP_TRACKING';
export const ACTION_OPEN = 'OPEN_APP';

let configured = false;

/**
 * Configure notification presentation, Android channels, and the live-tracking
 * action category. Idempotent and safe to call on every app start. Wrapped so a
 * restricted environment (e.g. Expo Go) degrades gracefully rather than crashing.
 */
export async function configureNotifications(): Promise<void> {
  if (configured) return;
  configured = true;

  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    if (Platform.OS === 'android') {
      // Low-importance ongoing channel for the live tracking notification —
      // visible and persistent but silent so it doesn't buzz on every update.
      await Notifications.setNotificationChannelAsync(LIVE_CHANNEL_ID, {
        name: 'Live tracking',
        importance: Notifications.AndroidImportance.LOW,
        sound: undefined,
        enableVibrate: false,
        showBadge: false,
      });

      // High-importance channel for the wake-up alarm.
      await Notifications.setNotificationChannelAsync(ALARM_CHANNEL_ID, {
        name: 'Arrival alarm',
        importance: Notifications.AndroidImportance.MAX,
        sound: 'default',
        enableVibrate: true,
        vibrationPattern: [0, 400, 200, 400],
        bypassDnd: true,
      });
    }

    await Notifications.setNotificationCategoryAsync(LIVE_CATEGORY_ID, [
      { identifier: ACTION_OPEN, buttonTitle: 'Open', options: { opensAppToForeground: true } },
      { identifier: ACTION_STOP, buttonTitle: 'Stop', options: { opensAppToForeground: false } },
    ]);
  } catch {
    // Notifications unavailable in this environment — ignore for UI slicing.
  }
}
