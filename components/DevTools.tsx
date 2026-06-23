import { useState, useMemo } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useTibaStore } from '../lib/store';
import { findNearestStations } from '../lib/distance';
import { getAllStations } from '../lib/data';
import { colors, fonts, fontSize, spacing } from '../lib/theme';

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value} numberOfLines={1}>{value ?? '—'}</Text>
    </View>
  );
}

export default function DevTools() {
  const [visible, setVisible] = useState(false);

  const currentPosition = useTibaStore((s) => s.currentPosition);
  const nearestStation = useTibaStore((s) => s.nearestStation);
  const currentLine = useTibaStore((s) => s.currentLine);
  const direction = useTibaStore((s) => s.direction);
  const destination = useTibaStore((s) => s.destination);
  const stationsRemaining = useTibaStore((s) => s.stationsRemaining);
  const isTracking = useTibaStore((s) => s.isTracking);
  const hasLocationPermission = useTibaStore((s) => s.hasLocationPermission);
  const alarmThreshold = useTibaStore((s) => s.alarmThreshold);
  const stationHistory = useTibaStore((s) => s.stationHistory);

  const nearestWithDistance = useMemo(() => {
    if (!currentPosition) return null;
    const all = getAllStations();
    const nearest = findNearestStations(currentPosition.lat, currentPosition.lon, all, 3);
    return nearest;
  }, [currentPosition]);

  if (!visible) {
    return (
      <Pressable style={styles.fab} onPress={() => setVisible(true)}>
        <Text style={styles.fabText}>DBG</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.overlay}>
      <View style={styles.header}>
        <Text style={styles.title}>DEVTOOLS</Text>
        <Pressable onPress={() => setVisible(false)} hitSlop={8}>
          <Text style={styles.closeBtn}>X</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        {/* Position */}
        <Text style={styles.section}>POSITION</Text>
        <Row label="lat" value={currentPosition?.lat.toFixed(6)} />
        <Row label="lon" value={currentPosition?.lon.toFixed(6)} />
        <Row label="permission" value={hasLocationPermission ? 'granted' : 'denied'} />
        <Row label="tracking" value={isTracking ? 'active' : 'off'} />

        {/* Nearest Stations */}
        <Text style={styles.section}>NEAREST STATIONS</Text>
        {nearestWithDistance && nearestWithDistance.length > 0 ? (
          nearestWithDistance.map((s, i) => (
            <Row
              key={s.id}
              label={`#${i + 1} ${s.id}`}
              value={`${s.name} (${Math.round(s.distance)}m)`}
            />
          ))
        ) : (
          <Row label="status" value="no position data" />
        )}

        {/* Detection */}
        <Text style={styles.section}>DETECTION</Text>
        <Row label="detected" value={nearestStation ? `${nearestStation.name} [${nearestStation.id}]` : 'none (<200m)'} />
        <Row label="line" value={currentLine ? `${currentLine.name} (${currentLine.id})` : null} />
        <Row label="direction" value={direction} />

        {/* Trip */}
        <Text style={styles.section}>TRIP</Text>
        <Row label="destination" value={destination ? `${destination.name} [${destination.id}]` : null} />
        <Row label="remaining" value={stationsRemaining !== null ? `${stationsRemaining} stations` : null} />
        <Row label="threshold" value={`${alarmThreshold} stations`} />

        {/* History */}
        <Text style={styles.section}>STATION HISTORY</Text>
        {stationHistory.length > 0 ? (
          stationHistory.slice(0, 5).map((s, i) => (
            <Row key={`${s.id}-${i}`} label={`[${i}]`} value={`${s.name} (${s.id})`} />
          ))
        ) : (
          <Row label="history" value="empty" />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    opacity: 0.85,
  },
  fabText: {
    fontFamily: fonts.bold,
    fontSize: fontSize.sm,
    color: '#3B82F6',
    letterSpacing: 0.5,
  },
  overlay: {
    position: 'absolute',
    top: 60,
    left: 12,
    right: 12,
    maxHeight: '70%',
    backgroundColor: '#0d0d0d',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 4,
    zIndex: 9999,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
    backgroundColor: '#111111',
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: fontSize.sm,
    color: '#3B82F6',
    letterSpacing: 2,
  },
  closeBtn: {
    fontFamily: fonts.bold,
    fontSize: fontSize.body,
    color: '#666',
  },
  body: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  section: {
    fontFamily: fonts.bold,
    fontSize: fontSize.xs,
    color: '#555',
    letterSpacing: 1.5,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  label: {
    fontFamily: fonts.regular,
    fontSize: fontSize.sm,
    color: '#777',
    flex: 1,
  },
  value: {
    fontFamily: fonts.regular,
    fontSize: fontSize.sm,
    color: colors.monoFg,
    flex: 2,
    textAlign: 'right',
  },
});
