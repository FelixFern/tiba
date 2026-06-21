import { useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, SectionList, Pressable } from 'react-native';
import Slider from '@react-native-community/slider';
import { router } from 'expo-router';
import { colors, fonts } from '../../lib/theme';
import { getAllLines, getStationsByLine } from '../../lib/data';
import { useTibaStore } from '../../lib/store';
import {
  startBackgroundTracking,
  stopBackgroundTracking,
} from '../../lib/background-location';
import type { Station } from '../../lib/types';

export default function AlarmScreen() {
  const destination = useTibaStore((s) => s.destination);
  const alarmThreshold = useTibaStore((s) => s.alarmThreshold);
  const setDestination = useTibaStore((s) => s.setDestination);
  const setAlarmThreshold = useTibaStore((s) => s.setAlarmThreshold);

  const sections = useMemo(() => {
    return getAllLines().map((line) => ({
      title: line.name,
      lineId: line.id,
      color: line.color,
      data: getStationsByLine(line.id),
    }));
  }, []);

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

  return (
    <View style={styles.container}>
      <SectionList
        sections={sections}
        keyExtractor={(item, index) => `${item.id}_${index}`}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <Text style={styles.screenTitle}>SELECT DESTINATION</Text>
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <View
              style={[styles.lineBar, { backgroundColor: section.color }]}
            />
            <Text style={styles.sectionTitle}>
              {section.title.toUpperCase()}
            </Text>
          </View>
        )}
        renderItem={({ item, section }) => {
          const isSelected = item.id === destination?.id;
          return (
            <Pressable
              onPress={() => handleSelectStation(item)}
              style={[
                styles.stationRow,
                isSelected && styles.stationRowSelected,
              ]}
            >
              <Text
                style={[
                  styles.stationName,
                  isSelected && styles.stationNameSelected,
                ]}
              >
                {item.name}
              </Text>
              <View style={styles.lineBadge}>
                <View
                  style={[styles.lineDot, { backgroundColor: section.color }]}
                />
                <Text
                  style={[
                    styles.lineBadgeText,
                    isSelected && styles.lineBadgeTextSelected,
                  ]}
                >
                  {section.title}
                </Text>
              </View>
            </Pressable>
          );
        }}
        ListFooterComponent={
          <View style={styles.footer}>
            <View style={styles.thresholdSection}>
              <Text style={styles.label}>ALARM THRESHOLD</Text>
              <Slider
                style={styles.slider}
                value={alarmThreshold}
                onValueChange={(v: number) =>
                  setAlarmThreshold(Math.round(v))
                }
                minimumValue={1}
                maximumValue={10}
                step={1}
                minimumTrackTintColor={colors.monoAccent}
                maximumTrackTintColor={colors.monoGray2}
                thumbTintColor={colors.monoFg}
              />
              <Text style={styles.thresholdLabel}>
                {alarmThreshold}{' '}
                {alarmThreshold === 1 ? 'station' : 'stations'} before arrival
              </Text>
            </View>

            <Pressable
              onPress={handleStartTrip}
              style={[
                styles.startButton,
                !destination && styles.buttonDisabled,
              ]}
              disabled={!destination}
            >
              <Text style={styles.startButtonText}>START TRIP</Text>
            </Pressable>

            {destination != null && (
              <Pressable
                onPress={handleCancelAlarm}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelButtonText}>CANCEL ALARM</Text>
              </Pressable>
            )}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.monoBg,
  },
  screenTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.monoFg,
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 16,
    letterSpacing: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.monoGray1,
    gap: 8,
  },
  lineBar: {
    width: 24,
    height: 4,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.monoFg,
    letterSpacing: 1.5,
  },
  stationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.monoGray1,
  },
  stationRowSelected: {
    backgroundColor: colors.monoAccent,
  },
  stationName: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.monoFg,
    flex: 1,
  },
  stationNameSelected: {
    fontFamily: fonts.bold,
    color: colors.monoBg,
  },
  lineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  lineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  lineBadgeText: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.monoGray2,
  },
  lineBadgeTextSelected: {
    color: colors.monoBg,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 48,
    gap: 24,
  },
  thresholdSection: {
    gap: 8,
  },
  label: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.monoFg,
    letterSpacing: 2,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  thresholdLabel: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.monoFg,
    textAlign: 'center',
  },
  startButton: {
    backgroundColor: colors.monoAccent,
    paddingVertical: 16,
    alignItems: 'center',
  },
  startButtonText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.monoBg,
    letterSpacing: 2,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  cancelButton: {
    borderWidth: 2,
    borderColor: colors.monoDanger,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.monoDanger,
    letterSpacing: 2,
  },
});
