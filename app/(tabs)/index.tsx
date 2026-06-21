import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, fonts } from '../../lib/theme';
import { useTibaStore } from '../../lib/store';
import {
  requestLocationPermissions,
  startForegroundTracking,
  stopForegroundTracking,
} from '../../lib/location';
import { haversine } from '../../lib/distance';

export default function HomeScreen() {
  const {
    nearestStation,
    currentLine,
    currentPosition,
    direction,
    destination,
    stationsRemaining,
    isTracking,
  } = useTibaStore();

  const handleStartTracking = async () => {
    await requestLocationPermissions();
    await startForegroundTracking();
  };

  const handleStopTracking = () => {
    stopForegroundTracking();
  };

  const distanceMeters =
    currentPosition && nearestStation
      ? Math.round(
          haversine(
            currentPosition.lat,
            currentPosition.lon,
            nearestStation.lat,
            nearestStation.lon,
          ),
        )
      : null;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>TIBA</Text>

      <View style={styles.card}>
        {nearestStation ? (
          <>
            <Text style={styles.stationName}>
              {nearestStation.name.toUpperCase()}
            </Text>
            {currentLine && (
              <View style={styles.lineBadge}>
                <View
                  style={[
                    styles.lineDot,
                    { backgroundColor: currentLine.color },
                  ]}
                />
                <Text style={styles.lineText}>{currentLine.name}</Text>
              </View>
            )}
            {direction ? (
              <Text style={styles.direction}>
                {direction === 'increasing' ? '→' : '←'}{' '}
                {direction === 'increasing' ? 'Increasing' : 'Decreasing'}
              </Text>
            ) : (
              <Text style={styles.directionPending}>
                Detecting direction...
              </Text>
            )}
            {distanceMeters !== null && distanceMeters > 200 && (
              <Text style={styles.distance}>{distanceMeters}m away</Text>
            )}
          </>
        ) : (
          <Text style={styles.noStation}>No station detected</Text>
        )}
      </View>

      {destination && stationsRemaining !== null && (
        <View style={styles.card}>
          <Text style={styles.countdown}>
            → {destination.name} • {stationsRemaining} stations left
          </Text>
        </View>
      )}

      {isTracking ? (
        <Pressable
          onPress={handleStopTracking}
          style={[styles.button, styles.buttonStop]}
        >
          <Text style={styles.buttonText}>STOP TRACKING</Text>
        </Pressable>
      ) : (
        <Pressable
          onPress={handleStartTracking}
          style={[styles.button, styles.buttonStart]}
        >
          <Text style={styles.buttonText}>START TRACKING</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.monoBg,
    paddingHorizontal: 24,
    paddingTop: 72,
  },
  header: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.monoFg,
    letterSpacing: 4,
    marginBottom: 32,
  },
  card: {
    backgroundColor: colors.monoGray1,
    borderRadius: 0,
    padding: 24,
    marginBottom: 16,
  },
  stationName: {
    fontFamily: fonts.bold,
    fontSize: 48,
    color: colors.monoFg,
    lineHeight: 56,
    marginBottom: 16,
  },
  lineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  lineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  lineText: {
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.monoFg,
  },
  direction: {
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.monoFg,
    marginTop: 8,
  },
  directionPending: {
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.monoGray2,
    marginTop: 8,
  },
  noStation: {
    fontFamily: fonts.regular,
    fontSize: 24,
    color: colors.monoGray2,
  },
  distance: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.monoGray2,
    marginTop: 8,
  },
  countdown: {
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.monoFg,
  },
  button: {
    borderRadius: 0,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonStart: {
    backgroundColor: colors.monoAccent,
  },
  buttonStop: {
    backgroundColor: colors.monoGray2,
  },
  buttonText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.monoFg,
    letterSpacing: 2,
  },
});
