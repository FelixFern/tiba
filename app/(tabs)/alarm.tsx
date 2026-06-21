import { useMemo, useCallback, useState } from 'react';
import { View, Text, StyleSheet, SectionList, Pressable, TextInput } from 'react-native';
import Animated from 'react-native-reanimated';
import Slider from '@react-native-community/slider';
import { router } from 'expo-router';
import { colors, fonts, spacing, fontSize, borderColors } from '../../lib/theme';
import { getAllLines, getStationsByLine } from '../../lib/data';
import { useTibaStore } from '../../lib/store';
import {
  startBackgroundTracking,
  stopBackgroundTracking,
} from '../../lib/background-location';
import { useScaleEntrance, useSpringPress, useSlideTransition } from '../../lib/animations';
import type { Station } from '../../lib/types';

function StationRow({ item, isSelected, onSelect }: { item: Station; isSelected: boolean; onSelect: (s: Station) => void }) {
  const checkStyle = useScaleEntrance(isSelected);
  const { animatedStyle: rowPressStyle, onPressIn, onPressOut } = useSpringPress(0.98);

  return (
    <Animated.View style={rowPressStyle}>
      <Pressable onPress={() => onSelect(item)} onPressIn={onPressIn} onPressOut={onPressOut} style={styles.stationRow}>
        <Text style={styles.stationName}>{item.name}</Text>
        <Animated.View style={checkStyle}>
          {isSelected && <Text style={styles.checkmark}>✓</Text>}
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

export default function AlarmScreen() {
  const destination = useTibaStore((s) => s.destination);
  const alarmThreshold = useTibaStore((s) => s.alarmThreshold);
  const isTracking = useTibaStore((s) => s.isTracking);
  const setDestination = useTibaStore((s) => s.setDestination);
  const setAlarmThreshold = useTibaStore((s) => s.setAlarmThreshold);

  const [searchQuery, setSearchQuery] = useState('');

  const sections = useMemo(() => {
    const allSections = getAllLines().map((line) => ({
      title: line.name,
      lineId: line.id,
      color: line.color,
      data: getStationsByLine(line.id),
      stationCount: getStationsByLine(line.id).length,
    }));
    if (!searchQuery.trim()) return allSections;
    const query = searchQuery.toLowerCase();
    return allSections
      .map((section) => ({
        ...section,
        data: section.data.filter((s) => s.name.toLowerCase().includes(query)),
      }))
      .filter((section) => section.data.length > 0);
  }, [searchQuery]);

  const destinationLine = useMemo(() => {
    if (!destination) return null;
    const allLines = getAllLines();
    return allLines.find((line) => destination.lines.includes(line.id));
  }, [destination]);

  const handleSelectStation = useCallback(
    (station: Station) => {
      setDestination(station);
    },
    [setDestination],
  );

  const handleStartTrip = useCallback(async () => {
    if (!destination) return;
    await startBackgroundTracking();
    router.push('/(tabs)');
  }, [destination]);

  const handleCancelAlarm = useCallback(async () => {
    setDestination(null);
    await stopBackgroundTracking();
  }, [setDestination]);

  const handleClearDestination = useCallback(async () => {
    setDestination(null);
    if (isTracking) {
      await stopBackgroundTracking();
    }
  }, [setDestination, isTracking]);

  const handleBackPress = useCallback(() => {
    router.push('/(tabs)');
  }, []);

  const cardSlideStyle = useSlideTransition(!!destination, { from: 'bottom', distance: 20, duration: 280 });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleBackPress} style={styles.backButton}>
          <Text style={styles.backArrow}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>SET DESTINATION</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search station…"
          placeholderTextColor="#666666"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Destination Card */}
      {destination && (
        <Animated.View style={[styles.destinationCard, cardSlideStyle]}>
          <Text style={styles.destinationLabel}>DESTINATION</Text>
          <View style={styles.destinationContent}>
            <View style={styles.destinationInfo}>
              <Text style={styles.destinationStation}>{destination.name}</Text>
              {destinationLine && (
                <View style={styles.destinationLine}>
                  <View
                    style={[
                      styles.destinationLineDot,
                      { backgroundColor: destinationLine.color },
                    ]}
                  />
                  <Text style={styles.destinationLineText}>
                    {destinationLine.name.toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
            <Pressable
              onPress={handleClearDestination}
              style={styles.clearButton}
            >
              <Text style={styles.clearButtonText}>✕</Text>
            </Pressable>
          </View>
        </Animated.View>
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
          minimumTrackTintColor={colors.monoAccent}
          maximumTrackTintColor={colors.monoGray2}
          thumbTintColor={colors.monoFg}
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
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <View
                style={[styles.sectionDot, { backgroundColor: section.color }]}
              />
              <Text style={styles.sectionTitle}>
                {section.title.toUpperCase()}
              </Text>
            </View>
            <Text style={styles.stationCount}>
              {section.data.length} stations
            </Text>
          </View>
        )}
        renderItem={({ item }) => (
          <StationRow item={item} isSelected={item.id === destination?.id} onSelect={handleSelectStation} />
        )}
      />

      {/* CTA Button */}
      <View style={styles.ctaContainer}>
        <Pressable
          onPress={handleStartTrip}
          style={[styles.ctaButton, !destination && styles.ctaButtonDisabled]}
          disabled={!destination}
        >
          <Text style={styles.ctaButtonText}>START TRIP →</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.monoBg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: 64,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  backButton: {
    padding: spacing.sm,
    marginLeft: -spacing.sm,
  },
  backArrow: {
    fontFamily: fonts.regular,
    fontSize: 24,
    color: colors.monoFg,
  },
  headerTitle: {
    fontFamily: fonts.bold,
    fontSize: fontSize.lg,
    color: colors.monoFg,
    letterSpacing: 2,
  },
  searchContainer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  searchInput: {
    height: 40,
    backgroundColor: '#222222',
    borderWidth: 1,
    borderColor: borderColors.subtle,
    borderRadius: 0,
    paddingHorizontal: spacing.md,
    fontFamily: fonts.regular,
    fontSize: fontSize.md,
    color: colors.monoFg,
  },
  destinationCard: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.lg,
    backgroundColor: '#222222',
    borderLeftWidth: 4,
    borderLeftColor: borderColors.active,
    padding: spacing.md,
  },
  destinationLabel: {
    fontFamily: fonts.bold,
    fontSize: fontSize.sm,
    color: '#999999',
    letterSpacing: 1.5,
    marginBottom: spacing.sm,
  },
  destinationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  destinationInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  destinationStation: {
    fontFamily: fonts.bold,
    fontSize: fontSize.body,
    color: colors.monoFg,
  },
  destinationLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  destinationLineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  destinationLineText: {
    fontFamily: fonts.regular,
    fontSize: fontSize.sm,
    color: colors.monoGray2,
  },
  clearButton: {
    padding: spacing.sm,
  },
  clearButtonText: {
    fontFamily: fonts.regular,
    fontSize: fontSize.lg,
    color: colors.monoFg,
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
    color: '#999999',
    letterSpacing: 1.5,
  },
  thresholdValue: {
    fontFamily: fonts.regular,
    fontSize: fontSize.md,
    color: colors.monoFg,
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
    color: colors.monoGray2,
  },
  stationList: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.monoGray1,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: fontSize.md,
    color: colors.monoFg,
    letterSpacing: 1.5,
  },
  stationCount: {
    fontFamily: fonts.regular,
    fontSize: fontSize.sm,
    color: colors.monoGray2,
  },
  stationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  stationName: {
    fontFamily: fonts.regular,
    fontSize: fontSize.body,
    color: colors.monoFg,
    flex: 1,
  },
  checkmark: {
    fontFamily: fonts.regular,
    fontSize: fontSize.body,
    color: colors.monoAccent,
  },
  ctaContainer: {
    paddingHorizontal: 0,
    paddingBottom: 0,
  },
  ctaButton: {
    backgroundColor: colors.monoAccent,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaButtonText: {
    fontFamily: fonts.bold,
    fontSize: fontSize.body,
    color: colors.monoFg,
    letterSpacing: 2,
  },
  ctaButtonDisabled: {
    opacity: 0.4,
  },
});
