import { useCallback, useEffect, useMemo, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';
import { useAnimatedCounter, usePulse, useSpringPress, useFlowDown } from '../../lib/animations';
import { fonts, spacing, fontSize, badgeColors, readableTextOn, withAlpha, type Theme } from '../../lib/theme';
import { useTheme } from '../../lib/use-theme';
import { useTibaStore } from '../../lib/store';
import { refreshCurrentLocationOnce } from '../../lib/location';
import {
  startBackgroundTracking,
  stopBackgroundTracking,
} from '../../lib/background-location';
import { planRoute } from '../../lib/transit';
import { getStationById, getLineById } from '../../lib/data';
import type { Station, LineId } from '../../lib/types';
import PageHeader from '../../components/PageHeader';

type RouteStatus = 'passed' | 'current' | 'upcoming' | 'destination' | 'transfer';

interface RouteRow {
  station: Station;
  status: RouteStatus;
  passed: boolean;
  dotColor: string;
  topColor: string;
  bottomColor: string;
  transferToLine?: string;
}

export default function HomeScreen() {
  const nearestStation = useTibaStore((s) => s.nearestStation);
  const destination = useTibaStore((s) => s.destination);
  const unlockDev = useTibaStore((s) => s.unlockDev);
  const tripPlan = useTibaStore((s) => s.tripPlan);
  const currentLegIndex = useTibaStore((s) => s.currentLegIndex);
  const stationsRemaining = useTibaStore((s) => s.stationsRemaining);
  const isTracking = useTibaStore((s) => s.isTracking);
  const alarmThreshold = useTibaStore((s) => s.alarmThreshold);

  const scrollRef = useRef<ScrollView>(null);

  // Hidden dev-tools unlock: 7 taps on the "tiba" wordmark within 1.5s.
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleTitleTap = useCallback(() => {
    tapCountRef.current += 1;
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    tapTimerRef.current = setTimeout(() => {
      tapCountRef.current = 0;
    }, 1500);
    if (tapCountRef.current >= 7) {
      tapCountRef.current = 0;
      unlockDev();
    }
  }, [unlockDev]);
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  // Populate current position/line on load without a full tracking session.
  useEffect(() => {
    if (!isTracking && !nearestStation) {
      void refreshCurrentLocationOnce();
    }
    // Only on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStartTracking = async () => {
    await startBackgroundTracking();
  };

  const handleStopTracking = async () => {
    await stopBackgroundTracking();
  };

  // The active plan: the stored route while tracking, or a live preview computed
  // from the current position + destination before the trip starts.
  const plan = useMemo(() => {
    if (tripPlan) return tripPlan;
    if (nearestStation && destination) return planRoute(nearestStation.id, destination.id);
    return null;
  }, [tripPlan, nearestStation, destination]);

  const activeLeg = plan?.legs[currentLegIndex] ?? null;
  const legLine = activeLeg ? getLineById(activeLeg.lineId) : null;
  const legTarget = activeLeg ? getStationById(activeLeg.toStationId) ?? destination : destination;
  const isTransferTarget = activeLeg?.isTransfer ?? false;
  const nextLegLineId = plan && activeLeg ? plan.legs[currentLegIndex + 1]?.lineId : undefined;
  const nextLineName = nextLegLineId ? getLineById(nextLegLineId)?.name : undefined;

  const lineColor = legLine?.color ?? theme.accent;
  // Drop the redundant "LINE" suffix so the label stays short next to the
  // "STATIONS TO GO" header.
  const lineLabel = (legLine?.name ?? '').toUpperCase().replace(/\s*LINE$/, '');

  // Stops to the current leg's alight — the store value while tracking, else
  // derived from the leg's ordered segment (index-based, never negative).
  const remaining = useMemo(() => {
    if (stationsRemaining !== null) return stationsRemaining;
    if (!activeLeg || !nearestStation) return null;
    const i = activeLeg.stationIds.indexOf(nearestStation.id);
    return i === -1 ? null : activeLeg.stationIds.length - 1 - i;
  }, [stationsRemaining, activeLeg, nearestStation]);
  const displayRemaining = remaining;

  // Full multi-leg route: every station origin → destination, transfers marked.
  const routeRows = useMemo<RouteRow[]>(() => {
    if (!plan || !nearestStation) return [];
    type Flat = { sid: string; legIndex: number; lineId: LineId; isTransferPoint: boolean };
    const flat: Flat[] = [];
    plan.legs.forEach((leg, li) => {
      leg.stationIds.forEach((sid, i) => {
        if (li > 0 && i === 0) return; // dedupe the shared interchange station
        flat.push({
          sid,
          legIndex: li,
          lineId: leg.lineId,
          isTransferPoint: leg.isTransfer && i === leg.stationIds.length - 1,
        });
      });
    });
    const curPos = flat.findIndex((f) => f.sid === nearestStation.id);
    const lastIdx = flat.length - 1;
    const rows: RouteRow[] = [];
    flat.forEach((f, idx) => {
      const station = getStationById(f.sid);
      if (!station) return;
      const legColor = getLineById(f.lineId)?.color ?? theme.accent;
      const nextLeg = plan.legs[f.legIndex + 1];
      const nextColor = nextLeg ? getLineById(nextLeg.lineId)?.color ?? legColor : legColor;
      const passed = curPos !== -1 && idx < curPos;
      let status: RouteStatus;
      if (f.sid === nearestStation.id) status = 'current';
      else if (idx === lastIdx) status = 'destination';
      else if (f.isTransferPoint) status = 'transfer';
      else status = passed ? 'passed' : 'upcoming';
      rows.push({
        station,
        status,
        passed,
        dotColor: legColor,
        topColor: legColor,
        bottomColor: f.isTransferPoint ? nextColor : legColor,
        transferToLine: f.isTransferPoint && nextLeg ? getLineById(nextLeg.lineId)?.name : undefined,
      });
    });
    return rows;
  }, [plan, nearestStation]);

  // Keep the current station in view as the trip progresses.
  const currentRowIndex = routeRows.findIndex((r) => r.status === 'current');
  // A marker that flows down the rail from the current station toward the next,
  // signalling direction of travel.
  const flowStyle = useFlowDown(currentRowIndex >= 0, ROW_HEIGHT);
  useEffect(() => {
    if (currentRowIndex > 0 && scrollRef.current) {
      scrollRef.current.scrollTo({
        y: Math.max(0, (currentRowIndex - 1) * ROW_HEIGHT),
        animated: true,
      });
    }
  }, [currentRowIndex]);

  // Alarm status row text (adapts for transfer vs final-arrival legs).
  const { statusSquareColor, statusLeftText, statusRightText } = useMemo(() => {
    if (remaining === 0) {
      return isTransferTarget
        ? {
            statusSquareColor: theme.warning,
            statusLeftText: 'Transfer now',
            statusRightText: nextLineName ? `change to ${nextLineName}` : 'change lines',
          }
        : {
            statusSquareColor: badgeColors.tracking,
            statusLeftText: 'Arrived',
            statusRightText: "you're here",
          };
    }
    if (remaining !== null && remaining > 0 && remaining <= alarmThreshold) {
      return {
        statusSquareColor: theme.accent,
        statusLeftText: isTransferTarget ? 'Transfer soon' : 'Alarm armed',
        statusRightText: `${remaining} stop${remaining === 1 ? '' : 's'} · ${
          isTransferTarget ? 'prepare to change' : 'prepare to alight'
        }`,
      };
    }
    if (remaining !== null && remaining > 0) {
      return {
        statusSquareColor: theme.accent,
        statusLeftText: 'Alarm armed',
        statusRightText: `${remaining} stations to ${isTransferTarget ? 'transfer' : 'destination'}`,
      };
    }
    return {
      statusSquareColor: theme.accent,
      statusLeftText: isTracking ? 'Detecting…' : 'Alarm armed',
      statusRightText: '',
    };
  }, [remaining, alarmThreshold, isTracking, isTransferTarget, nextLineName, theme]);

  const { animatedStyle: counterAnimStyle } = useAnimatedCounter(displayRemaining);
  const pulseStyle = usePulse(true);
  const livePulseStyle = usePulse(isTracking);
  const { animatedStyle: startPressStyle, onPressIn: startPressIn, onPressOut: startPressOut } =
    useSpringPress(0.95);
  const { animatedStyle: stopPressStyle, onPressIn: stopPressIn, onPressOut: stopPressOut } =
    useSpringPress(0.95);

  const trackingBadge = (
    <View style={styles.trackingBadge}>
      <Animated.View style={isTracking ? livePulseStyle : undefined}>
        <View
          style={[
            styles.trackingDot,
            { backgroundColor: isTracking ? badgeColors.tracking : theme.dim },
          ]}
        />
      </Animated.View>
      <Text style={[styles.trackingText, { color: isTracking ? theme.textMuted : theme.dim }]}>
        {isTracking ? 'TRACKING' : 'IDLE'}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <PageHeader title="tiba" right={trackingBadge} onTitlePress={handleTitleTap} />

      {destination ? (
        <>
          {/* Hero countdown card */}
          <View style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <Text style={styles.heroLabel}>STATIONS TO GO</Text>
              {!!lineLabel && (
                <Text style={styles.heroLineLabel} numberOfLines={1}>
                  {lineLabel}
                </Text>
              )}
            </View>

            <View style={styles.heroNumberRow}>
              <Animated.View style={counterAnimStyle}>
                <Text style={styles.heroNumber}>
                  {displayRemaining !== null ? displayRemaining : '—'}
                </Text>
              </Animated.View>
              <View style={styles.heroDestBlock}>
                <View style={styles.heroDestNameRow}>
                  <View style={[styles.heroDestDot, { backgroundColor: lineColor }]} />
                  <Text style={styles.heroDestName} numberOfLines={1} adjustsFontSizeToFit>
                    {legTarget?.name ?? destination.name}
                  </Text>
                </View>
                <Text style={styles.heroDestSub}>
                  {isTransferTarget
                    ? nextLineName
                      ? `transfer · ${nextLineName}`
                      : 'transfer'
                    : 'final destination'}
                </Text>
              </View>
            </View>

            <View style={styles.heroDivider} />

            <View style={styles.heroStatusRow}>
              <View style={styles.heroStatusLeft}>
                <View style={[styles.heroStatusSquare, { backgroundColor: statusSquareColor }]} />
                <Text style={styles.heroStatusText}>{statusLeftText}</Text>
              </View>
              {!!statusRightText && <Text style={styles.heroStatusRight}>{statusRightText}</Text>}
            </View>
          </View>

          {/* YOUR ROUTE — main section */}
          <View style={styles.routeSection}>
            <Text style={styles.routeLabel}>YOUR ROUTE</Text>
            {routeRows.length > 0 ? (
              <ScrollView
                ref={scrollRef}
                style={styles.routeTimeline}
                showsVerticalScrollIndicator={false}
              >
                {routeRows.map((row, idx) => {
                  const isFirst = idx === 0;
                  const isLast = idx === routeRows.length - 1;
                  const { station, status } = row;
                  return (
                    <View
                      key={`${station.id}-${idx}`}
                      style={[styles.routeRow, row.passed && styles.routeRowPassed]}
                    >
                      <View style={styles.rail}>
                        {!isFirst && (
                          <View style={[styles.railLineTop, { backgroundColor: row.topColor }]} />
                        )}
                        {!isLast && (
                          <View
                            style={[styles.railLineBottom, { backgroundColor: row.bottomColor }]}
                          />
                        )}
                        {status === 'current' && !isLast && (
                          <Animated.View
                            pointerEvents="none"
                            style={[styles.flowArrow, flowStyle]}
                          >
                            <Ionicons name="chevron-down" size={14} color={row.bottomColor} />
                          </Animated.View>
                        )}
                        <View style={styles.railDotWrap}>
                          {status === 'current' ? (
                            <View
                              style={[
                                styles.dotCurrentGlow,
                                { backgroundColor: withAlpha(row.dotColor, 0.18) },
                              ]}
                            >
                              <Animated.View
                                style={[
                                  styles.dotCurrent,
                                  { backgroundColor: row.dotColor },
                                  pulseStyle,
                                ]}
                              />
                            </View>
                          ) : status === 'destination' ? (
                            <View style={[styles.dotDestination, { borderColor: row.dotColor }]} />
                          ) : status === 'transfer' ? (
                            <View style={[styles.dotTransfer, { borderColor: row.dotColor }]} />
                          ) : status === 'upcoming' ? (
                            <View style={styles.dotUpcoming} />
                          ) : (
                            <View style={styles.dotPassed} />
                          )}
                        </View>
                      </View>
                      <View style={styles.routeContent}>
                        <Text
                          style={[
                            styles.routeName,
                            status === 'passed' && styles.routeNamePassed,
                            status === 'upcoming' && styles.routeNameUpcoming,
                            status === 'current' && styles.routeNameCurrent,
                            (status === 'destination' || status === 'transfer') &&
                              styles.routeNameDestination,
                          ]}
                          numberOfLines={1}
                        >
                          {station.name}
                        </Text>
                        {status === 'current' && (
                          <Text style={[styles.youAreHere, { color: row.dotColor }]}>
                            YOU ARE HERE
                          </Text>
                        )}
                        {status === 'transfer' && (
                          <View style={[styles.destBadge, { borderColor: row.dotColor }]}>
                            <Text style={[styles.destBadgeText, { color: row.dotColor }]}>
                              {row.transferToLine
                                ? `TRANSFER · ${row.transferToLine.toUpperCase()}`
                                : 'TRANSFER'}
                            </Text>
                          </View>
                        )}
                        {status === 'destination' && (
                          <View style={[styles.destBadge, { borderColor: row.dotColor }]}>
                            <Text style={[styles.destBadgeText, { color: row.dotColor }]}>
                              DESTINATION
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            ) : (
              <Text style={styles.directionPending}>
                {isTracking ? 'Mapping your route…' : 'Start tracking to map your route'}
              </Text>
            )}
          </View>
        </>
      ) : (
        <View style={styles.noDestinationContainer}>
          <Text style={styles.noDestinationTitle}>No destination armed</Text>
          <Text style={styles.noDestinationHint}>Pick where you&apos;re heading to arm the alarm</Text>
        </View>
      )}

      {/* Bottom action button — STOP while tracking, SET DESTINATION when none is
          armed (tracking needs a destination), otherwise START. */}
      {isTracking ? (
        <Animated.View style={[styles.buttonWrap, stopPressStyle]}>
          <Pressable
            onPress={handleStopTracking}
            onPressIn={stopPressIn}
            onPressOut={stopPressOut}
            style={styles.buttonStop}
          >
            <Text style={styles.buttonStopText}>STOP TRACKING</Text>
          </Pressable>
        </Animated.View>
      ) : !destination ? (
        <Animated.View style={[styles.buttonWrap, startPressStyle]}>
          <Pressable
            onPress={() => router.push('/(tabs)/alarm')}
            onPressIn={startPressIn}
            onPressOut={startPressOut}
            style={styles.buttonStart}
          >
            <Text style={styles.buttonStartText}>SET DESTINATION</Text>
          </Pressable>
        </Animated.View>
      ) : (
        <Animated.View style={[styles.buttonWrap, startPressStyle]}>
          <Pressable
            onPress={handleStartTracking}
            onPressIn={startPressIn}
            onPressOut={startPressOut}
            style={styles.buttonStart}
          >
            <Text style={styles.buttonStartText}>START TRACKING</Text>
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}

// Rail is wide enough to fully contain the current-station glow ring (22px) so
// the pulsing dot is never clipped by the column edges.
const RAIL_WIDTH = 22;
const RAIL_LINE_LEFT = RAIL_WIDTH / 2 - 1;
const ROW_HEIGHT = 46;

const makeStyles = (t: Theme) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: t.bg,
  },

  // Tracking pill (header right slot)
  trackingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderWidth: 1,
    borderColor: t.border,
    borderRadius: 2,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  trackingDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  trackingText: {
    fontFamily: fonts.bold,
    fontSize: fontSize.sm,
    letterSpacing: 1.4,
  },

  // Hero countdown card
  heroCard: {
    marginHorizontal: spacing.xl,
    borderWidth: 1,
    borderColor: t.border,
    borderRadius: 3,
    padding: 20,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: spacing.md,
  },
  heroLabel: {
    flexShrink: 0,
    fontFamily: fonts.bold,
    fontSize: fontSize.sm,
    color: t.textMuted,
    letterSpacing: 1.8,
  },
  heroLineLabel: {
    flexShrink: 1,
    textAlign: 'right',
    fontFamily: fonts.bold,
    fontSize: fontSize.sm,
    color: t.textMuted,
    letterSpacing: 1.6,
  },
  heroNumberRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.lg,
    marginTop: spacing.xs,
  },
  heroNumber: {
    fontFamily: fonts.bold,
    fontSize: 80,
    lineHeight: 74,
    color: t.fg,
    letterSpacing: -3,
  },
  heroDestBlock: {
    flex: 1,
    paddingBottom: spacing.md,
  },
  heroDestNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  heroDestDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  heroDestName: {
    flex: 1,
    fontFamily: fonts.bold,
    fontSize: 24,
    color: t.fg,
    letterSpacing: -0.5,
  },
  heroDestSub: {
    fontFamily: fonts.regular,
    fontSize: fontSize.md,
    color: t.textMuted,
    marginTop: spacing.xs,
  },
  heroDivider: {
    height: 1,
    backgroundColor: t.border,
    marginVertical: spacing.lg,
  },
  heroStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroStatusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  heroStatusSquare: {
    width: 8,
    height: 8,
    borderRadius: 1,
  },
  heroStatusText: {
    fontFamily: fonts.regular,
    fontSize: fontSize.md,
    color: t.fg,
  },
  heroStatusRight: {
    flexShrink: 1,
    textAlign: 'right',
    fontFamily: fonts.regular,
    fontSize: fontSize.sm + 1,
    color: t.textMuted,
  },

  // Route section (main)
  routeSection: {
    flex: 1,
    marginTop: 20,
    paddingHorizontal: spacing.xl,
  },
  routeLabel: {
    fontFamily: fonts.bold,
    fontSize: fontSize.sm,
    color: t.textMuted,
    letterSpacing: 1.8,
    marginBottom: spacing.sm,
  },
  routeTimeline: {
    flex: 1,
  },
  routeRow: {
    flexDirection: 'row',
    height: ROW_HEIGHT,
    alignItems: 'stretch',
  },
  routeRowPassed: {
    opacity: 0.5,
  },
  rail: {
    width: RAIL_WIDTH,
    position: 'relative',
  },
  railLineTop: {
    position: 'absolute',
    left: RAIL_LINE_LEFT,
    top: 0,
    height: '50%',
    width: 2,
    backgroundColor: t.border,
  },
  railLineBottom: {
    position: 'absolute',
    left: RAIL_LINE_LEFT,
    top: '50%',
    bottom: 0,
    width: 2,
    backgroundColor: t.border,
  },
  flowArrow: {
    position: 'absolute',
    left: RAIL_LINE_LEFT - 6,
    top: '50%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  railDotWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotPassed: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: t.dim,
  },
  dotUpcoming: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: t.bg,
    borderWidth: 2,
    borderColor: t.dim,
  },
  dotDestination: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: t.bg,
    borderWidth: 2,
  },
  dotTransfer: {
    width: 12,
    height: 12,
    borderRadius: 3,
    backgroundColor: t.bg,
    borderWidth: 2,
  },
  // The "you are here" marker is tinted with the active line color (filled dot
  // + a soft same-color glow). Colors are applied inline per-row.
  dotCurrentGlow: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: withAlpha(t.accent, 0.18),
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotCurrent: {
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: t.accent,
  },
  routeContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 14,
  },
  routeName: {
    flexShrink: 1,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: t.fg,
  },
  routeNamePassed: {
    fontSize: 14,
    color: t.textDim,
  },
  routeNameUpcoming: {
    fontSize: 15,
    color: t.textFaint,
  },
  routeNameCurrent: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: t.fg,
  },
  routeNameDestination: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: t.fg,
  },
  youAreHere: {
    fontFamily: fonts.bold,
    fontSize: fontSize.xs + 1,
    color: t.accent,
    letterSpacing: 1.1,
  },
  destBadge: {
    borderWidth: 1,
    borderRadius: 2,
    paddingVertical: 3,
    paddingHorizontal: 6,
  },
  destBadgeText: {
    fontFamily: fonts.bold,
    fontSize: fontSize.xs + 1,
    letterSpacing: 1,
  },
  directionPending: {
    fontFamily: fonts.regular,
    fontSize: fontSize.body,
    color: t.dim,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },

  // No destination
  noDestinationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
  },
  noDestinationTitle: {
    fontFamily: fonts.bold,
    fontSize: fontSize.lg,
    color: t.textMuted,
  },
  noDestinationHint: {
    fontFamily: fonts.regular,
    fontSize: fontSize.md,
    color: t.dim,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },

  // Bottom button
  buttonWrap: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  buttonStart: {
    backgroundColor: t.accent,
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
    borderRadius: 3,
  },
  buttonStartText: {
    fontFamily: fonts.bold,
    fontSize: fontSize.body,
    color: readableTextOn(t.accent),
    letterSpacing: 1.8,
  },
  buttonStop: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: t.dim,
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
    borderRadius: 3,
  },
  buttonStopText: {
    fontFamily: fonts.bold,
    fontSize: fontSize.body,
    color: t.fg,
    letterSpacing: 1.8,
  },
});
