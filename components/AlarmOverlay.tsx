import { useEffect, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Vibration, BackHandler } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';
import Animated from 'react-native-reanimated';
import { useTibaStore } from '../lib/store';
import { stopBackgroundTracking } from '../lib/background-location';
import { resetDetectionState } from '../lib/location';
import { getStationById, getLineById } from '../lib/data';
import { fonts } from '../lib/theme';
import { useEntryAnimation, usePulse, usePulseRing, useSpringPress } from '../lib/animations';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const alarmSource = require('../assets/sounds/alarm.mp3');

// Matches the design's alarm-red field (screen 03).
const ALARM_BG = '#D9342B';

/**
 * Full-screen arrival/transfer alarm. Rendered as a store-gated overlay (not a
 * route) by the root layout when `isAlarmActive` is true — dismissing it just
 * flips store state, so there's no navigation and therefore no blank-screen
 * transition.
 */
export default function AlarmOverlay() {
  const player = useAudioPlayer(alarmSource);

  const destination = useTibaStore((s) => s.destination);
  const tripPlan = useTibaStore((s) => s.tripPlan);
  const currentLegIndex = useTibaStore((s) => s.currentLegIndex);
  const alarmKind = useTibaStore((s) => s.alarmKind);
  const resetTrip = useTibaStore((s) => s.resetTrip);
  const advanceLeg = useTibaStore((s) => s.advanceLeg);

  const isTransfer = alarmKind === 'transfer';
  const leg = tripPlan?.legs[currentLegIndex];
  const nextLegLine = tripPlan?.legs[currentLegIndex + 1]?.lineId;
  const stationName = isTransfer
    ? getStationById(leg?.toStationId ?? '')?.name ?? 'Transfer'
    : destination?.name ?? 'Destination';
  const nextLineName = isTransfer && nextLegLine ? getLineById(nextLegLine)?.name : undefined;
  const headline = isTransfer ? 'TRANSFER NOW' : 'ARRIVING NOW';
  const subtitleText = isTransfer
    ? nextLineName
      ? `Change to ${nextLineName}`
      : 'Change lines here'
    : 'Prepare to alight';

  // ── Animations ────────────────────────────────────────────────────────
  const entryStyle = useEntryAnimation({ fromScale: 0.85, duration: 350 });
  const ring1Style = usePulseRing(true, { delay: 0 });
  const ring2Style = usePulseRing(true, { delay: 1400 });
  const blinkStyle = usePulse(true, { minScale: 0.7, maxScale: 1, duration: 1000 });
  const { animatedStyle: dismissPressStyle, onPressIn, onPressOut } = useSpringPress(0.95);

  // ── Mount: start vibration + sound ────────────────────────────────────
  useEffect(() => {
    Vibration.vibrate([0, 1000, 1000], true);

    void setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
    }).then(() => {
      player.loop = true;
      player.volume = 1.0;
      player.play();
    });

    return () => {
      Vibration.cancel();
      player.pause();
    };
  }, [player]);

  // ── Block hardware back button while the alarm is up ──────────────────
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  // ── Dismiss handler (no navigation — just store state) ────────────────
  const handleDismiss = useCallback(async () => {
    Vibration.cancel();
    player.pause();

    if (isTransfer) {
      // Mid-journey: advance to the next leg and keep tracking. Reset detection
      // so the next leg's line/direction re-resolve from the interchange.
      advanceLeg();
      resetDetectionState();
      useTibaStore.setState({ isAlarmActive: false, alarmKind: null });
    } else {
      // Final arrival: trip is over — stop tracking and reset to a clean slate.
      // resetTrip() flips isAlarmActive false, which unmounts this overlay.
      await stopBackgroundTracking();
      resetTrip();
    }
  }, [player, isTransfer, advanceLeg, resetTrip]);

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <View style={styles.overlay}>
      {/* Concentric pulse rings, centered behind the content */}
      <View style={styles.ringWrap} pointerEvents="none">
        <Animated.View style={[styles.ring, ring1Style]} />
        <Animated.View style={[styles.ring, ring2Style]} />
      </View>

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <Animated.View style={[styles.content, entryStyle]}>
          <Text style={styles.arrivingNow}>{headline}</Text>
          <Text style={styles.destination}>{stationName}</Text>
          <Text style={styles.subtitle}>{subtitleText}</Text>

          <View style={styles.pill}>
            <Animated.View style={blinkStyle}>
              <View style={styles.pillDot} />
            </Animated.View>
            <Text style={styles.pillText}>SOUND · VIBRATION</Text>
          </View>
        </Animated.View>

        <View style={styles.bottom}>
          <Text style={styles.hint}>Tap to silence the alarm</Text>
          <Animated.View style={[styles.dismissWrap, dismissPressStyle]}>
            <Pressable
              onPress={handleDismiss}
              onPressIn={onPressIn}
              onPressOut={onPressOut}
              style={styles.dismissButton}
              accessibilityRole="button"
              accessibilityLabel="Dismiss alarm"
            >
              <Text style={styles.dismissText}>DISMISS</Text>
            </Pressable>
          </Animated.View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: ALARM_BG,
    zIndex: 1000,
    elevation: 1000,
  },
  ringWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 120,
  },
  ring: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
  },
  safe: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  arrivingNow: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 4,
  },
  destination: {
    fontFamily: fonts.bold,
    fontSize: 56,
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -1.5,
    marginTop: 20,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 18,
    opacity: 0.94,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginTop: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
    borderRadius: 2,
    paddingVertical: 8,
    paddingHorizontal: 13,
  },
  pillDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#FFFFFF',
  },
  pillText: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: '#FFFFFF',
    letterSpacing: 1.6,
  },
  bottom: {
    paddingHorizontal: 26,
    paddingBottom: 24,
    width: '100%',
    alignItems: 'center',
  },
  hint: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: '#FFFFFF',
    textAlign: 'center',
    opacity: 0.82,
    letterSpacing: 0.6,
    marginBottom: 16,
  },
  dismissWrap: {
    width: '100%',
  },
  dismissButton: {
    backgroundColor: '#FFFFFF',
    height: 66,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  dismissText: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: ALARM_BG,
    letterSpacing: 3,
  },
});
