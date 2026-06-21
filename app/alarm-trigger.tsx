import { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Vibration,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import { useTibaStore } from '../lib/store';
import { colors, fonts, lineColors } from '../lib/theme';

// ---------------------------------------------------------------------------
// Alarm Sound
// ---------------------------------------------------------------------------

async function loadAlarmSound(): Promise<Audio.Sound | null> {
  try {
    const { sound } = await Audio.Sound.createAsync(
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('../assets/sounds/alarm.mp3'),
      { shouldPlay: true, isLooping: true, volume: 1.0 },
    );
    return sound;
  } catch {
    // Graceful fallback – alarm.mp3 may not exist yet
    return null;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AlarmTriggerModal() {
  const router = useRouter();
  const soundRef = useRef<Audio.Sound | null>(null);

  const destination = useTibaStore((s) => s.destination);
  const currentLine = useTibaStore((s) => s.currentLine);
  const stationsRemaining = useTibaStore((s) => s.stationsRemaining);
  const setIsAlarmActive = useTibaStore((s) => s.setIsAlarmActive);

  const stationName = destination?.name?.toUpperCase() ?? 'DESTINATION';
  const remaining = stationsRemaining ?? 0;
  
  // Map LineId to lineColors key (tanjungpriok -> tanjungPriok)
  const getLineColor = (lineId: string | undefined): string => {
    if (!lineId) return '#FFFFFF';
    const colorKey = lineId === 'tanjungpriok' ? 'tanjungPriok' : lineId;
    return lineColors[colorKey as keyof typeof lineColors] ?? '#FFFFFF';
  };
  
  const lineColor = currentLine?.color ?? getLineColor(destination?.lines[0]);

  // ── Mount: start vibration + sound ────────────────────────────────────
  useEffect(() => {
    Vibration.vibrate([0, 1000, 1000], true);

    let mounted = true;

    void Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
    }).then(() => {
      if (!mounted) return;
      void loadAlarmSound().then((sound) => {
        if (!mounted) {
          void sound?.unloadAsync();
          return;
        }
        soundRef.current = sound;
      });
    });

    return () => {
      mounted = false;
      Vibration.cancel();
      void soundRef.current?.stopAsync();
      void soundRef.current?.unloadAsync();
    };
  }, []);

  // ── Block hardware back button ────────────────────────────────────────
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  // ── Dismiss handler ───────────────────────────────────────────────────
  const handleDismiss = useCallback(() => {
    Vibration.cancel();

    if (soundRef.current) {
      void soundRef.current.stopAsync();
      void soundRef.current.unloadAsync();
      soundRef.current = null;
    }

    setIsAlarmActive(false);
    router.back();
  }, [setIsAlarmActive, router]);

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Decorative curved graphics - behind content */}
      <View style={styles.decorativeArc1} />
      <View style={styles.decorativeArc2} />
      <View style={styles.decorativeArc3} />

      {/* Main content */}
      <View style={styles.content}>
        <Text style={styles.arrivingNow}>ARRIVING NOW</Text>

        <Text style={styles.destination}>{stationName}</Text>

        {/* Line color dot */}
        <View style={[styles.lineDot, { backgroundColor: lineColor }]} />

        <Text style={styles.subtitle}>Prepare to alight</Text>

        {/* Indicators row */}
        <Text style={styles.indicators}>● SOUND · VIBRATION</Text>
      </View>

      {/* Bottom section */}
      <View style={styles.bottomSection}>
        <Text style={styles.instructionText}>Tap to silence the alarm</Text>

        <Pressable
          onPress={handleDismiss}
          style={({ pressed }) => [
            styles.dismissButton,
            pressed && styles.dismissButtonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Dismiss alarm"
        >
          <Text style={styles.dismissText}>DISMISS</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.monoDanger,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Decorative curved graphics
  decorativeArc1: {
    position: 'absolute',
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    top: -100,
    right: -120,
    transform: [{ rotate: '-15deg' }],
  },
  decorativeArc2: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    top: -80,
    right: -100,
    transform: [{ rotate: '-15deg' }],
  },
  decorativeArc3: {
    position: 'absolute',
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    bottom: -150,
    left: -120,
    transform: [{ rotate: '-15deg' }],
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  arrivingNow: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.monoFg,
    textAlign: 'center',
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  destination: {
    fontFamily: fonts.bold,
    fontSize: 48,
    color: colors.monoFg,
    textAlign: 'center',
    lineHeight: 56,
  },
  lineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 12,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.monoFg,
    textAlign: 'center',
    marginTop: 16,
    opacity: 0.85,
  },
  indicators: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.monoFg,
    textAlign: 'center',
    marginTop: 24,
    opacity: 0.7,
  },
  bottomSection: {
    paddingBottom: 24,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
  },
  instructionText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.monoFg,
    textAlign: 'center',
    opacity: 0.6,
    marginBottom: 16,
  },
  dismissButton: {
    backgroundColor: colors.monoFg,
    height: 44,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  dismissButtonPressed: {
    opacity: 0.8,
  },
  dismissText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.monoDanger,
    letterSpacing: 1,
  },
});
