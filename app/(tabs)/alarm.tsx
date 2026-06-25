import { useMemo, useCallback, useState } from 'react';
import { View, Text, StyleSheet, SectionList, Pressable, TextInput } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { router } from 'expo-router';
import { fonts, spacing, fontSize, type Theme } from '../../lib/theme';
import { useTheme } from '../../lib/use-theme';
import { getAllLines, getStationsByLine, getLineById, getStationById } from '../../lib/data';
import { planRoute } from '../../lib/transit';
import { useTibaStore } from '../../lib/store';
import {
  startBackgroundTracking,
  stopBackgroundTracking,
} from '../../lib/background-location';
import { useScaleEntrance, useSpringPress, useSlideTransition } from '../../lib/animations';
import type { Station } from '../../lib/types';
import PageHeader from '../../components/PageHeader';

function StationRow({ item, isSelected, onSelect }: { item: Station; isSelected: boolean; onSelect: (s: Station) => void }) {
  const checkStyle = useScaleEntrance(isSelected);
  const { animatedStyle: rowPressStyle, onPressIn, onPressOut } = useSpringPress(0.98);
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <Animated.View style={rowPressStyle}>
      <Pressable
        onPress={() => onSelect(item)}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={[styles.stationRow, isSelected && styles.stationRowSelected]}
      >
        <Text style={[styles.stationName, isSelected && styles.stationNameSelected]}>
          {item.name}
        </Text>
        <Animated.View style={checkStyle}>
          {isSelected && <Ionicons name="checkmark" size={16} color={theme.accent} />}
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

export default function AlarmScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const destination = useTibaStore((s) => s.destination);
  const nearestStation = useTibaStore((s) => s.nearestStation);
  const alarmThreshold = useTibaStore((s) => s.alarmThreshold);
  const isTracking = useTibaStore((s) => s.isTracking);
  const setDestination = useTibaStore((s) => s.setDestination);
  const setTripPlan = useTibaStore((s) => s.setTripPlan);
  const setAlarmThreshold = useTibaStore((s) => s.setAlarmThreshold);

  const [searchQuery, setSearchQuery] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleSection = useCallback((lineId: string) => {
    setCollapsed((c) => ({ ...c, [lineId]: !c[lineId] }));
  }, []);

  const sections = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const all = getAllLines().map((line) => {
      const stations = getStationsByLine(line.id);
      const matched = query
        ? stations.filter((s) => s.name.toLowerCase().includes(query))
        : stations;
      // Collapse only applies when not searching, so matches always stay visible.
      const isCollapsed = !!collapsed[line.id] && !query;
      return {
        title: line.name,
        lineId: line.id,
        color: line.color,
        stationCount: stations.length,
        matchCount: matched.length,
        isCollapsed,
        data: isCollapsed ? [] : matched,
      };
    });
    return query ? all.filter((s) => s.matchCount > 0) : all;
  }, [searchQuery, collapsed]);

  const destinationLine = useMemo(() => {
    if (!destination) return null;
    const allLines = getAllLines();
    return allLines.find((line) => destination.lines.includes(line.id));
  }, [destination]);

  // Planned route from the current position to the destination (for the preview
  // and to seed the trip on START).
  const routePlan = useMemo(() => {
    if (!destination || !nearestStation) return null;
    return planRoute(nearestStation.id, destination.id);
  }, [destination, nearestStation]);

  const handleSelectStation = useCallback(
    (station: Station) => {
      setDestination(station);
    },
    [setDestination],
  );

  const handleStartTrip = useCallback(async () => {
    if (!destination) return;
    if (nearestStation) {
      const plan = planRoute(nearestStation.id, destination.id);
      if (plan) setTripPlan(plan);
    }
    await startBackgroundTracking();
    router.push('/(tabs)');
  }, [destination, nearestStation, setTripPlan]);

  const handleClearDestination = useCallback(async () => {
    setDestination(null);
    if (isTracking) {
      await stopBackgroundTracking();
    }
  }, [setDestination, isTracking]);

  const cardSlideStyle = useSlideTransition(!!destination, { from: 'bottom', distance: 20, duration: 280 });

  return (
    <View style={styles.container}>
      <PageHeader title="Set destination" />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color={theme.textDim} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search station…"
            placeholderTextColor={theme.textDim}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Destination Card */}
      {destination && (
        <Animated.View style={[styles.destinationCard, cardSlideStyle]}>
          <View style={styles.destinationInfo}>
            <Text style={styles.destinationLabel}>DESTINATION</Text>
            <View style={styles.destinationNameRow}>
              {destinationLine && (
                <View
                  style={[styles.destinationDot, { backgroundColor: destinationLine.color }]}
                />
              )}
              <Text style={styles.destinationStation}>{destination.name}</Text>
              {destinationLine && (
                <Text style={styles.destinationLineText}>
                  {destinationLine.name.toUpperCase()}
                </Text>
              )}
            </View>
          </View>
          <Pressable onPress={handleClearDestination} style={styles.clearButton}>
            <Ionicons name="close" size={16} color={theme.textMuted} />
          </Pressable>
        </Animated.View>
      )}

      {/* Route preview — shown when a transfer is required */}
      {routePlan && routePlan.legs.length > 1 && (
        <View style={styles.routePreview}>
          <Text style={styles.routePreviewLabel}>
            ROUTE · {routePlan.legs.length - 1} TRANSFER
            {routePlan.legs.length - 1 === 1 ? '' : 'S'}
          </Text>
          {routePlan.legs.map((leg, i) => {
            const line = getLineById(leg.lineId);
            const from = getStationById(leg.fromStationId)?.name ?? leg.fromStationId;
            const to = getStationById(leg.toStationId)?.name ?? leg.toStationId;
            return (
              <View key={`${leg.lineId}-${i}`} style={styles.routePreviewLeg}>
                <View
                  style={[styles.routePreviewDot, { backgroundColor: line?.color ?? theme.textDim }]}
                />
                <Text style={styles.routePreviewLine} numberOfLines={1}>
                  {line?.name ?? leg.lineId}
                </Text>
                <Text style={styles.routePreviewStations} numberOfLines={1}>
                  {from} → {to}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Threshold Section */}
      <View style={styles.thresholdSection}>
        <View style={styles.thresholdHeader}>
          <Text style={styles.thresholdLabel}>ALERT THRESHOLD</Text>
          <Text style={styles.thresholdValue}>
            {alarmThreshold} stations before
          </Text>
        </View>
        <Slider
          style={styles.slider}
          value={alarmThreshold}
          onValueChange={(v: number) => setAlarmThreshold(Math.round(v))}
          minimumValue={1}
          maximumValue={10}
          step={1}
          minimumTrackTintColor={theme.accent}
          maximumTrackTintColor={theme.dim}
          thumbTintColor={theme.fg}
        />
        <View style={styles.sliderLabels}>
          <Text style={styles.sliderLabel}>1</Text>
          <Text style={styles.sliderLabel}>10</Text>
        </View>
      </View>

      {/* Station List */}
      <SectionList
        sections={sections}
        keyExtractor={(item, index) => `${item.id}_${index}`}
        stickySectionHeadersEnabled={false}
        style={styles.stationList}
        renderSectionHeader={({ section }) => (
          <Pressable style={styles.sectionHeader} onPress={() => toggleSection(section.lineId)}>
            <View style={styles.sectionHeaderLeft}>
              <View style={[styles.sectionBar, { backgroundColor: section.color }]} />
              <Text style={styles.sectionTitle}>
                {section.title.toUpperCase()}
              </Text>
            </View>
            <View style={styles.sectionHeaderRight}>
              <Text style={styles.stationCount}>{section.stationCount} stations</Text>
              <Ionicons
                name={section.isCollapsed ? 'chevron-down' : 'chevron-up'}
                size={14}
                color={theme.textDim}
              />
            </View>
          </Pressable>
        )}
        renderItem={({ item }) => (
          <StationRow item={item} isSelected={item.id === destination?.id} onSelect={handleSelectStation} />
        )}
      />

      {/* CTA Button */}
      <View style={[styles.ctaContainer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Pressable
          onPress={handleStartTrip}
          style={[styles.ctaButton, !destination && styles.ctaButtonDisabled]}
          disabled={!destination}
        >
          <Text style={styles.ctaButtonText}>START TRIP</Text>
          <Ionicons name="arrow-forward" size={18} color="#0A0A0A" />
        </Pressable>
      </View>
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: t.bg,
  },
  searchContainer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    height: 44,
    borderWidth: 1,
    borderColor: t.border,
    borderRadius: 3,
    paddingHorizontal: 14,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: fontSize.body,
    color: t.fg,
    padding: 0,
  },
  destinationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.xl,
    marginBottom: spacing.lg,
    backgroundColor: 'rgba(59,130,246,0.08)',
    borderWidth: 1,
    borderColor: t.accent,
    borderRadius: 3,
    padding: 14,
  },
  destinationInfo: {
    flex: 1,
    gap: 6,
  },
  destinationLabel: {
    fontFamily: fonts.bold,
    fontSize: fontSize.sm,
    color: t.accent,
    letterSpacing: 1.8,
  },
  destinationNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  destinationDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  destinationStation: {
    fontFamily: fonts.bold,
    fontSize: fontSize.xl,
    color: t.fg,
    letterSpacing: -0.5,
  },
  destinationLineText: {
    fontFamily: fonts.regular,
    fontSize: fontSize.sm,
    color: t.textMuted,
    letterSpacing: 1,
  },
  clearButton: {
    width: 30,
    height: 30,
    borderWidth: 1,
    borderColor: t.border,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.md,
  },
  thresholdSection: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  thresholdHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  thresholdLabel: {
    fontFamily: fonts.bold,
    fontSize: fontSize.md,
    color: t.textMuted,
    letterSpacing: 1.5,
  },
  thresholdValue: {
    fontFamily: fonts.regular,
    fontSize: fontSize.md,
    color: t.fg,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderLabel: {
    fontFamily: fonts.regular,
    fontSize: fontSize.sm,
    color: t.dim,
  },
  stationList: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 1,
    backgroundColor: t.sectionBg,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  routePreview: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: t.border,
    borderRadius: 3,
    padding: spacing.md,
    gap: spacing.sm,
  },
  routePreviewLabel: {
    fontFamily: fonts.bold,
    fontSize: fontSize.sm,
    color: t.textMuted,
    letterSpacing: 1.6,
    marginBottom: spacing.xs,
  },
  routePreviewLeg: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  routePreviewDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  routePreviewLine: {
    fontFamily: fonts.bold,
    fontSize: fontSize.sm,
    color: t.fg,
    width: 96,
  },
  routePreviewStations: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: fontSize.sm,
    color: t.textDim,
  },
  sectionBar: {
    width: 3,
    height: 14,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: fontSize.md,
    color: t.fg,
    letterSpacing: 1.5,
  },
  stationCount: {
    fontFamily: fonts.regular,
    fontSize: fontSize.sm,
    color: t.dim,
  },
  stationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: t.divider,
  },
  stationRowSelected: {
    backgroundColor: 'rgba(59,130,246,0.10)',
    borderLeftWidth: 3,
    borderLeftColor: t.accent,
    paddingLeft: spacing.xl - 3,
  },
  stationName: {
    fontFamily: fonts.regular,
    fontSize: fontSize.body + 1,
    color: t.fg,
    flex: 1,
  },
  stationNameSelected: {
    fontFamily: fonts.bold,
  },
  checkmark: {
    fontFamily: fonts.bold,
    fontSize: fontSize.body,
    color: t.accent,
  },
  ctaContainer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: t.divider,
  },
  ctaButton: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: t.accent,
    height: 56,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaButtonText: {
    fontFamily: fonts.bold,
    fontSize: fontSize.body,
    color: '#0A0A0A',
    letterSpacing: 1.5,
  },
  ctaButtonDisabled: {
    opacity: 0.4,
  },
});
