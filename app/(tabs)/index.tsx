import { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import Animated from 'react-native-reanimated';
import { useAnimatedCounter, usePulse, useSpringPress, useSlideTransition } from '../../lib/animations';
import { colors, fonts, spacing, fontSize, borderColors, badgeColors } from '../../lib/theme';
import { useTibaStore } from '../../lib/store';
import {
  requestLocationPermissions,
  startForegroundTracking,
  stopForegroundTracking,
} from '../../lib/location';
import { calculateStationsRemaining } from '../../lib/alarm';
import { getStationsByLine } from '../../lib/data';
import PageHeader from '../../components/PageHeader';

export default function HomeScreen() {
  const nearestStation = useTibaStore((s) => s.nearestStation);
  const currentLine = useTibaStore((s) => s.currentLine);
  const direction = useTibaStore((s) => s.direction);
  const destination = useTibaStore((s) => s.destination);
  const stationsRemaining = useTibaStore((s) => s.stationsRemaining);
  const isTracking = useTibaStore((s) => s.isTracking);
  const alarmThreshold = useTibaStore((s) => s.alarmThreshold);

  const handleStartTracking = async () => {
    await requestLocationPermissions();
    await startForegroundTracking();
  };

  const handleStopTracking = () => {
    stopForegroundTracking();
  };

  // Foreground fallback computation for stationsRemaining
  const computedStationsRemaining = useMemo(() => {
    if (stationsRemaining !== null) return stationsRemaining;
    if (!nearestStation || !destination || !currentLine || !direction) return null;
    return calculateStationsRemaining(nearestStation, destination, currentLine, direction);
  }, [stationsRemaining, nearestStation, destination, currentLine, direction]);

  // Route computation for timeline
  const routeStations = useMemo(() => {
    if (!currentLine || !direction || !nearestStation || !destination) return [];
    const lineStations = getStationsByLine(currentLine.id);
    const currentIdx = lineStations.findIndex(s => s.id === nearestStation.id);
    const destIdx = lineStations.findIndex(s => s.id === destination.id);
    if (currentIdx === -1 || destIdx === -1) return [];
    const start = Math.min(currentIdx, destIdx);
    const end = Math.max(currentIdx, destIdx);
    const slice = lineStations.slice(start, end + 1);
    return direction === 'decreasing' ? slice.reverse() : slice;
  }, [currentLine, direction, nearestStation, destination]);

  // Determine alarm status message
  const alarmStatusMessage = useMemo(() => {
    if (computedStationsRemaining === null) return null;
    if (computedStationsRemaining === 0) {
      return { text: '● Arrived', color: badgeColors.tracking };
    }
    if (computedStationsRemaining <= alarmThreshold) {
      return { text: `● ${computedStationsRemaining} stops out · prepare to alight`, color: '#FFA500' };
    }
    return { text: '● Alarm armed', color: badgeColors.tracking };
  }, [computedStationsRemaining, alarmThreshold]);

  const { animatedStyle: counterAnimStyle } = useAnimatedCounter(computedStationsRemaining);
  const pulseStyle = usePulse(true);
  const { animatedStyle: startPressStyle, onPressIn: startPressIn, onPressOut: startPressOut } = useSpringPress(0.95);
  const { animatedStyle: stopPressStyle, onPressIn: stopPressIn, onPressOut: stopPressOut } = useSpringPress(0.95);
  const badgeSlideStyle = useSlideTransition(isTracking, { from: 'top', distance: 12 });

  const trackingBadge = (
    <Animated.View
      style={[styles.trackingBadge, badgeSlideStyle]}
      pointerEvents={isTracking ? 'auto' : 'none'}
    >
      <View style={styles.trackingDot} />
      <Text style={styles.trackingText}>TRACKING</Text>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <PageHeader title="tiba" right={trackingBadge} />

      {/* Content based on state */}
      {!isTracking && !destination ? (
        /* State (a): Not tracking, no destination */
        <View style={styles.noStationContainer}>
          <Text style={styles.noStation}>No station detected</Text>
        </View>
      ) : !destination && isTracking ? (
        /* State (b): Tracking, no destination */
        <View style={styles.currentStationCard}>
          {nearestStation && (
            <>
              <Text style={styles.stationNameLarge}>{nearestStation.name.toUpperCase()}</Text>
              {currentLine && (
                <View style={styles.lineBadge}>
                  <View style={[styles.lineDot, { backgroundColor: currentLine.color }]} />
                  <Text style={styles.lineText}>{currentLine.name.toUpperCase()}</Text>
                </View>
              )}
            </>
          )}
        </View>
      ) : destination ? (
        /* States (c), (d), (e): Destination is set */
        <>
          {/* Stations Counter Section */}
          <View style={styles.counterSection}>
            <View style={styles.counterLeft}>
              <Text style={styles.counterLabel}>STATIONS TO GO</Text>
              {currentLine && (
                <View style={styles.lineInfo}>
                  <View style={[styles.lineIndicatorDot, { backgroundColor: currentLine.color }]} />
                  <Text style={styles.lineInfoText}>{currentLine.name.toUpperCase()}</Text>
                </View>
              )}
            </View>
            <View style={styles.counterRight}>
              <Animated.View style={counterAnimStyle}>
                <Text style={styles.counterNumber}>
                  {computedStationsRemaining !== null ? computedStationsRemaining : '—'}
                </Text>
              </Animated.View>
              <Text style={styles.destinationName}>{destination.name.toUpperCase()}</Text>
              <Text style={styles.destinationSubtitle}>final destination</Text>
            </View>
          </View>

          {/* Alarm Status Row */}
          {alarmStatusMessage && (
            <View style={styles.alarmStatusRow}>
              <Text style={[styles.alarmStatusText, { color: alarmStatusMessage.color }]}>
                {alarmStatusMessage.text}
              </Text>
            </View>
          )}

          {/* Route Timeline Section */}
          {currentLine && direction && routeStations.length > 0 ? (
            /* State (d): Full route timeline */
            <View style={styles.routeSection}>
              <Text style={styles.routeLabel}>YOUR ROUTE</Text>
              <ScrollView style={styles.routeTimeline} showsVerticalScrollIndicator={false}>
                {routeStations.map((station, idx) => {
                  const isFirst = idx === 0;
                  const isLast = idx === routeStations.length - 1;
                  return (
                    <View key={station.id} style={[styles.routeStationRow, !isFirst && !isLast && { opacity: 0.65 }]}>
                      <View style={styles.timelineColumn}>
                        {isFirst ? (
                          <Animated.View style={pulseStyle}>
                            <View style={[styles.routeDotCurrent, { borderColor: '#3B82F6' }]} />
                          </Animated.View>
                        ) : isLast ? (
                          <View style={[styles.routeDotDestination, { borderColor: currentLine.color }]} />
                        ) : (
                          <View style={[styles.routeDot, { backgroundColor: currentLine.color }]} />
                        )}
                        {!isLast && (
                          <View style={[styles.routeLine, { backgroundColor: currentLine.color }]} />
                        )}
                      </View>
                      <View style={styles.routeStationInfo}>
                        <Text style={styles.routeStationName}>{station.name}</Text>
                        {isFirst && <Text style={styles.routeLabelCurrent}>YOU ARE HERE</Text>}
                        {isLast && <Text style={styles.routeLabelDestination}>DESTINATION</Text>}
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          ) : (
            /* State (c): Direction unknown, show placeholder */
            <View style={styles.routeSection}>
              <Text style={styles.directionPending}>Detecting direction…</Text>
            </View>
          )}
        </>
      ) : null}

      {/* Bottom Button */}
      {isTracking ? (
        <Animated.View style={stopPressStyle}>
          <Pressable
            onPress={handleStopTracking}
            onPressIn={stopPressIn}
            onPressOut={stopPressOut}
            style={styles.buttonStop}
          >
            <Text style={styles.buttonText}>STOP TRACKING</Text>
          </Pressable>
        </Animated.View>
      ) : (
        <Animated.View style={startPressStyle}>
          <Pressable
            onPress={handleStartTracking}
            onPressIn={startPressIn}
            onPressOut={startPressOut}
            style={styles.buttonStart}
          >
            <Text style={styles.buttonText}>START TRACKING</Text>
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.monoBg,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  trackingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: badgeColors.tracking,
    marginRight: spacing.sm,
  },
  trackingText: {
    fontFamily: fonts.bold,
    fontSize: fontSize.md,
    color: badgeColors.tracking,
    letterSpacing: 1,
  },
  noStationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noStation: {
    fontFamily: fonts.regular,
    fontSize: fontSize.xl,
    color: colors.monoGray2,
  },
  currentStationCard: {
    flex: 1,
    justifyContent: 'center',
  },
  stationNameLarge: {
    fontFamily: fonts.bold,
    fontSize: fontSize.display,
    color: colors.monoFg,
    marginBottom: spacing.lg,
  },
  lineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  lineText: {
    fontFamily: fonts.bold,
    fontSize: fontSize.md,
    color: colors.monoFg,
    letterSpacing: 1,
  },
  counterSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: borderColors.subtle,
  },
  counterLeft: {
    justifyContent: 'space-between',
  },
  counterLabel: {
    fontFamily: fonts.bold,
    fontSize: fontSize.md,
    color: '#999999',
    letterSpacing: 1.5,
    marginBottom: spacing.sm,
  },
  lineInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lineIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  lineInfoText: {
    fontFamily: fonts.bold,
    fontSize: fontSize.md,
    color: colors.monoFg,
    letterSpacing: 1,
  },
  counterRight: {
    alignItems: 'flex-end',
  },
  counterNumber: {
    fontFamily: fonts.bold,
    fontSize: 64,
    color: colors.monoFg,
    lineHeight: 64,
  },
  destinationName: {
    fontFamily: fonts.bold,
    fontSize: fontSize.xl,
    color: colors.monoFg,
    marginTop: spacing.sm,
  },
  destinationSubtitle: {
    fontFamily: fonts.regular,
    fontSize: fontSize.md,
    color: '#999999',
    marginTop: spacing.xs,
  },
  alarmStatusRow: {
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: borderColors.subtle,
  },
  alarmStatusText: {
    fontFamily: fonts.bold,
    fontSize: fontSize.body,
    letterSpacing: 0.5,
  },
  routeSection: {
    flex: 1,
    paddingTop: spacing.xl,
  },
  routeLabel: {
    fontFamily: fonts.bold,
    fontSize: fontSize.md,
    color: '#999999',
    letterSpacing: 1.5,
    marginBottom: spacing.lg,
  },
  routeTimeline: {
    flex: 1,
  },
  routeStationRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  timelineColumn: {
    alignItems: 'center',
    marginRight: spacing.lg,
    width: 10,
  },
  routeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  routeDotCurrent: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3B82F6',
    borderWidth: 2,
  },
  routeDotDestination: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  routeLine: {
    width: 2,
    flex: 1,
    marginVertical: 2,
    opacity: 0.3,
  },
  routeStationInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  routeStationName: {
    fontFamily: fonts.regular,
    fontSize: fontSize.body,
    color: colors.monoFg,
  },
  routeLabelCurrent: {
    fontFamily: fonts.bold,
    fontSize: fontSize.sm,
    color: '#3B82F6',
    marginTop: spacing.xs,
    letterSpacing: 0.5,
  },
  routeLabelDestination: {
    fontFamily: fonts.bold,
    fontSize: fontSize.sm,
    color: colors.monoDanger,
    marginTop: spacing.xs,
    letterSpacing: 0.5,
  },
  directionPending: {
    fontFamily: fonts.regular,
    fontSize: fontSize.body,
    color: colors.monoGray2,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  buttonStart: {
    backgroundColor: colors.monoAccent,
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
  },
  buttonStop: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: borderColors.subtle,
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
  },
  buttonText: {
    fontFamily: fonts.bold,
    fontSize: fontSize.lg,
    color: colors.monoFg,
    letterSpacing: 2,
  },
});
