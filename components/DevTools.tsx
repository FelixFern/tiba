import { useState, useMemo } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useTibaStore } from '../lib/store';
import { findNearestStations } from '../lib/distance';
import { getAllStations } from '../lib/data';
import { fonts, fontSize, spacing, type Theme } from '../lib/theme';
import { useTheme } from '../lib/use-theme';

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value} numberOfLines={1}>{value ?? '—'}</Text>
    </View>
  );
}

export default function DevTools() {
  const [visible, setVisible] = useState(false);
  const devUnlocked = useTibaStore((s) => s.devUnlocked);
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const currentPosition = useTibaStore((s) => s.currentPosition);
  const nearestStation = useTibaStore((s) => s.nearestStation);
  const currentLine = useTibaStore((s) => s.currentLine);
  const direction = useTibaStore((s) => s.direction);
  const destination = useTibaStore((s) => s.destination);
  const stationsRemaining = useTibaStore((s) => s.stationsRemaining);
  const isTracking = useTibaStore((s) => s.isTracking);
  const hasLocationPermission = useTibaStore((s) => s.hasLocationPermission);
  const alarmThreshold = useTibaStore((s) => s.alarmThreshold);

  const nearestWithDistance = useMemo(() => {
    if (!currentPosition) return null;
    const all = getAllStations();
    const nearest = findNearestStations(currentPosition.lat, currentPosition.lon, all, 3);
    return nearest;
  }, [currentPosition]);

  // Hidden until unlocked via the tap gesture on the "tiba" wordmark.
  if (!devUnlocked) {
    return null;
  }

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

        {/* Test triggers */}
        <Text style={styles.section}>TEST</Text>
        <Pressable
          style={styles.testBtn}
          onPress={() => {
            const s = useTibaStore.getState();
            if (!s.destination) s.setDestination(getAllStations()[0]);
            useTibaStore.setState({ isAlarmActive: true, alarmKind: 'arrival' });
            setVisible(false);
          }}
        >
          <Text style={styles.testBtnText}>ARM ALARM (arrival)</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    fab: {
      position: 'absolute',
      bottom: 100,
      right: 16,
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: t.sectionBg,
      borderWidth: 1,
      borderColor: t.accent,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      opacity: 0.9,
    },
    fabText: {
      fontFamily: fonts.bold,
      fontSize: fontSize.sm,
      color: t.accent,
      letterSpacing: 0.5,
    },
    overlay: {
      position: 'absolute',
      top: 60,
      left: 12,
      right: 12,
      maxHeight: '70%',
      backgroundColor: t.bg,
      borderWidth: 1,
      borderColor: t.border,
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
      borderBottomColor: t.border,
      backgroundColor: t.sectionBg,
    },
    title: {
      fontFamily: fonts.bold,
      fontSize: fontSize.sm,
      color: t.accent,
      letterSpacing: 2,
    },
    closeBtn: {
      fontFamily: fonts.bold,
      fontSize: fontSize.body,
      color: t.textDim,
    },
    body: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    section: {
      fontFamily: fonts.bold,
      fontSize: fontSize.xs,
      color: t.textDim,
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
      color: t.textMuted,
      flex: 1,
    },
    value: {
      fontFamily: fonts.regular,
      fontSize: fontSize.sm,
      color: t.fg,
      flex: 2,
      textAlign: 'right',
    },
    testBtn: {
      marginTop: spacing.sm,
      paddingVertical: spacing.sm,
      borderWidth: 1,
      borderColor: t.accent,
      borderRadius: 3,
      alignItems: 'center',
    },
    testBtnText: {
      fontFamily: fonts.bold,
      fontSize: fontSize.sm,
      color: t.accent,
      letterSpacing: 1,
    },
  });
