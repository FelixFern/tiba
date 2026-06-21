import { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Vibration,
  BackHandler,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import { useTibaStore } from '../lib/store';
import { colors, fonts } from '../lib/theme';

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
  const stationsRemaining = useTibaStore((s) => s.stationsRemaining);
  const setIsAlarmActive = useTibaStore((s) => s.setIsAlarmActive);

  const stationName = destination?.name?.toUpperCase() ?? 'DESTINATION';
  const remaining = stationsRemaining ?? 0;

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
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.destination}>{stationName}</Text>
        <Text style={styles.approaching}>APPROACHING</Text>

        <Text style={styles.subtitle}>Prepare to alight</Text>

        <Text style={styles.remaining}>
          {remaining} {remaining === 1 ? 'station' : 'stations'} left
        </Text>
      </View>

      <View style={styles.buttonContainer}>
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
    </View>
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
    paddingHorizontal: 32,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  destination: {
    fontFamily: fonts.bold,
    fontSize: 48,
    color: colors.monoFg,
    textAlign: 'center',
    lineHeight: 56,
  },
  approaching: {
    fontFamily: fonts.bold,
    fontSize: 48,
    color: colors.monoFg,
    textAlign: 'center',
    lineHeight: 56,
    marginTop: 4,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 24,
    color: colors.monoFg,
    textAlign: 'center',
    marginTop: 24,
    opacity: 0.85,
  },
  remaining: {
    fontFamily: fonts.regular,
    fontSize: 20,
    color: colors.monoFg,
    textAlign: 'center',
    marginTop: 16,
    opacity: 0.7,
  },
  buttonContainer: {
    paddingBottom: 64,
    width: '100%',
  },
  dismissButton: {
    backgroundColor: colors.monoFg,
    paddingVertical: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  dismissButtonPressed: {
    opacity: 0.8,
  },
  dismissText: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: colors.monoDanger,
    letterSpacing: 2,
  },
});
