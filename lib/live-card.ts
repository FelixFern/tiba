import { Platform } from 'react-native';

// ============================================================================
// Live card — platform abstraction over the lock-screen presence
// ============================================================================
//
//  - iOS: a Live Activity (lock screen + Dynamic Island) via expo-widgets.
//  - Android: a custom RemoteViews ongoing notification via the local
//    tiba-live-notification module.
//  - Anywhere the native piece is unavailable (Expo Go, web, iOS < 16.1):
//    start/update/end are no-ops and `isLiveCardActive()` stays false, so the
//    caller falls back to the plain text live notification.
//
// Native modules are required lazily so importing this file never crashes in
// environments where they aren't present.

export interface LiveCardState {
  fromName: string;
  toName: string;
  stopsLeft: number;
  statusText: string;
  lineColor: string;
  total: number;
  current: number;
}

let active = false;
// The iOS LiveActivity instance (typed loosely to avoid a static import).
let iosActivity: { update: (p: LiveCardState) => void; end: (policy?: string) => void } | null =
  null;

function iosFactory() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('../widgets/TibaTripActivity').TibaTripActivity as {
    start: (p: LiveCardState, url?: string) => typeof iosActivity;
  };
}

function androidModule() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('../modules/tiba-live-notification').default as {
    update: (s: LiveCardState) => void;
    end: () => void;
  };
}

export function startLiveCard(state: LiveCardState): void {
  try {
    if (Platform.OS === 'ios') {
      iosActivity = iosFactory().start(state);
      active = !!iosActivity;
    } else if (Platform.OS === 'android') {
      androidModule().update(state);
      active = true;
    }
  } catch {
    active = false;
  }
}

export function updateLiveCard(state: LiveCardState): void {
  if (!active) {
    startLiveCard(state);
    return;
  }
  try {
    if (Platform.OS === 'ios') {
      iosActivity?.update(state);
    } else if (Platform.OS === 'android') {
      androidModule().update(state);
    }
  } catch {
    // Keep the trip going even if a single update fails.
  }
}

export function endLiveCard(): void {
  try {
    if (Platform.OS === 'ios') {
      iosActivity?.end('immediate');
    } else if (Platform.OS === 'android') {
      androidModule().end();
    }
  } catch {
    // ignore
  }
  iosActivity = null;
  active = false;
}

export function isLiveCardActive(): boolean {
  return active;
}
