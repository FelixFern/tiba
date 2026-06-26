import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useTibaStore } from '../../lib/store';
import { stopBackgroundTracking } from '../../lib/background-location';
import { accentOptions, badgeColors, fontSize, fonts, readableTextOn, spacing, type Theme } from '../../lib/theme';
import { useTheme } from '../../lib/use-theme';
import { useSpringPress } from '../../lib/animations';
import PageHeader from '../../components/PageHeader';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';

function AnimatedPressable({
  onPress,
  disabled,
  style,
  children,
}: {
  onPress: () => void;
  disabled?: boolean;
  style?: object;
  children: React.ReactNode;
}) {
  const { animatedStyle, onPressIn, onPressOut } = useSpringPress(0.95);
  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={disabled}
        style={style}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

function GrantedPill() {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <View style={styles.grantedPill}>
      <View style={styles.grantedDot} />
      <Text style={styles.grantedText}>GRANTED</Text>
    </View>
  );
}

function EnableButton({ onPress, disabled }: { onPress: () => void; disabled?: boolean }) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <AnimatedPressable onPress={onPress} disabled={disabled} style={styles.enableButton}>
      <Text style={styles.enableButtonText}>ENABLE</Text>
    </AnimatedPressable>
  );
}

export default function SettingsScreen() {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const themePref = useTibaStore((s) => s.themePref);
  const setThemePref = useTibaStore((s) => s.setThemePref);
  const accentPref = useTibaStore((s) => s.accentPref);
  const setAccentPref = useTibaStore((s) => s.setAccentPref);
  const activeAccent = accentPref ?? accentOptions[0].color;
  const [locationStatus, setLocationStatus] = useState<'granted' | 'denied'>('denied');
  const [notificationStatus, setNotificationStatus] = useState<'granted' | 'denied'>('denied');
  const [isLoading, setIsLoading] = useState(false);
  const [clearVisible, setClearVisible] = useState(false);

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    try {
      const loc = await Location.getForegroundPermissionsAsync();
      setLocationStatus(loc.granted ? 'granted' : 'denied');

      const notif = await Notifications.getPermissionsAsync();
      setNotificationStatus(notif.granted ? 'granted' : 'denied');
    } catch (err) {
      console.warn('Failed to check permissions:', err);
    }
  };

  const handleRequestLocation = async () => {
    setIsLoading(true);
    try {
      const foreground = await Location.requestForegroundPermissionsAsync();
      if (foreground.granted) {
        await Location.requestBackgroundPermissionsAsync();
      }
      await checkPermissions();
    } catch (err) {
      console.warn('Failed to request location permission:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestNotification = async () => {
    setIsLoading(true);
    try {
      await Notifications.requestPermissionsAsync();
      await checkPermissions();
    } catch (err) {
      console.warn('Failed to request notification permission:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearData = () => setClearVisible(true);

  const confirmClearData = async () => {
    setClearVisible(false);
    const s = useTibaStore.getState();
    if (s.isTracking) await stopBackgroundTracking();
    s.resetTrip();
  };

  const handlePreciseLocation = () => {
    Alert.alert(
      'Precise Location',
      'Enable precise location in your device Settings for better station detection accuracy.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]
    );
  };

  const version = Constants.expoConfig?.version || '1.0.0';

  return (
    <View style={styles.container}>
      <PageHeader title="Settings" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      {/* PERMISSIONS */}
      <Text style={styles.sectionLabel}>PERMISSIONS</Text>
      <View style={styles.card}>
        <View style={[styles.permissionRow, styles.rowDivider]}>
          <View style={styles.permissionLeft}>
            <Text style={styles.permissionLabel}>Location</Text>
            <Text style={styles.permissionDescription}>Always · background tracking</Text>
          </View>
          {locationStatus === 'granted' ? (
            <GrantedPill />
          ) : (
            <EnableButton onPress={handleRequestLocation} disabled={isLoading} />
          )}
        </View>

        <View style={[styles.permissionRow, styles.rowDivider]}>
          <View style={styles.permissionLeft}>
            <Text style={styles.permissionLabel}>Notifications</Text>
            <Text style={styles.permissionDescription}>Alarms & live updates</Text>
          </View>
          {notificationStatus === 'granted' ? (
            <GrantedPill />
          ) : (
            <EnableButton onPress={handleRequestNotification} disabled={isLoading} />
          )}
        </View>

        <View style={styles.permissionRow}>
          <View style={styles.permissionLeft}>
            <Text style={styles.permissionLabel}>Precise location</Text>
            <Text style={styles.permissionDescription}>Improves station accuracy</Text>
          </View>
          <EnableButton onPress={handlePreciseLocation} />
        </View>
      </View>

      {/* APPEARANCE */}
      <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>APPEARANCE</Text>
      <View style={styles.segmented}>
        {(['light', 'dark', 'system'] as const).map((pref) => {
          const active = themePref === pref;
          return (
            <Pressable
              key={pref}
              onPress={() => setThemePref(pref)}
              style={[styles.segment, active && styles.segmentActive]}
            >
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                {pref.toUpperCase()}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* ACCENT */}
      <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>ACCENT</Text>
      <View style={styles.swatchGrid}>
        {accentOptions.map((opt) => {
          const active = activeAccent.toLowerCase() === opt.color.toLowerCase();
          return (
            <Pressable
              key={opt.id}
              onPress={() => setAccentPref(opt.id === 'blue' ? null : opt.color)}
              style={[
                styles.swatch,
                { borderColor: active ? opt.color : 'transparent' },
              ]}
            >
              <View style={[styles.swatchFill, { backgroundColor: opt.color }]}>
                {active && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* ABOUT */}
      <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>ABOUT</Text>
      <View style={styles.card}>
        <View style={styles.aboutHeader}>
          <View style={styles.appIcon}>
            <Text style={styles.appIconGlyph}>t</Text>
          </View>
          <View>
            <Text style={styles.appName}>tiba</Text>
            <Text style={styles.versionText}>v{version} · KRL Jabodetabek alarm</Text>
          </View>
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.offlineRow}>
          <View style={styles.greenDot} />
          <Text style={styles.offlineText}>All features work offline</Text>
        </View>
        <Text style={styles.dataSourceText}>
          Station data: Indonesian Ministry of Transportation, Wikipedia, OpenStreetMap. No
          accounts, no servers, no telemetry.
        </Text>
      </View>

      {/* CLEAR DATA */}
      <AnimatedPressable onPress={handleClearData} style={styles.clearButton}>
        <Text style={styles.clearText}>CLEAR SAVED TRIP DATA</Text>
      </AnimatedPressable>
      </ScrollView>

      <ConfirmDialog
        visible={clearVisible}
        title="Clear saved trip?"
        message="This clears your saved destination and current route, and stops tracking. Your alarm threshold and theme are kept."
        confirmLabel="Clear"
        destructive
        onConfirm={confirmClearData}
        onCancel={() => setClearVisible(false)}
      />
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: t.bg,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  sectionLabel: {
    fontFamily: fonts.bold,
    fontSize: fontSize.sm,
    color: t.textMuted,
    letterSpacing: 1.8,
    marginBottom: 10,
  },
  sectionLabelSpaced: {
    marginTop: spacing.xl,
  },
  segmented: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: t.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  segment: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: {
    backgroundColor: t.accent,
  },
  segmentText: {
    fontFamily: fonts.bold,
    fontSize: fontSize.sm,
    color: t.textMuted,
    letterSpacing: 1.4,
  },
  segmentTextActive: {
    color: '#0A0A0A',
  },

  // Accent swatches
  swatchGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  swatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    padding: 3,
  },
  swatchFill: {
    flex: 1,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Cards
  card: {
    borderWidth: 1,
    borderColor: t.border,
    borderRadius: 3,
    overflow: 'hidden',
  },

  // Permission rows
  permissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 16,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: t.divider,
  },
  permissionLeft: {
    flex: 1,
    marginRight: spacing.lg,
  },
  permissionLabel: {
    fontFamily: fonts.bold,
    fontSize: fontSize.body + 1,
    color: t.fg,
    marginBottom: 3,
  },
  permissionDescription: {
    fontFamily: fonts.regular,
    fontSize: fontSize.sm + 1,
    color: t.textMuted,
  },

  // Granted pill
  grantedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: badgeColors.granted,
    borderRadius: 2,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  grantedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: badgeColors.granted,
  },
  grantedText: {
    fontFamily: fonts.bold,
    fontSize: fontSize.sm,
    color: badgeColors.granted,
    letterSpacing: 1,
  },

  // Enable filled button
  enableButton: {
    height: 28,
    paddingHorizontal: 12,
    backgroundColor: t.accent,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  enableButtonText: {
    fontFamily: fonts.bold,
    fontSize: fontSize.sm,
    color: '#0A0A0A',
    letterSpacing: 1,
  },

  // About card
  aboutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    padding: 16,
    paddingBottom: spacing.md,
  },
  // Branded tile (accent square + "t") — mirrors the live-card notification
  // tile and tracks the active accent, so it renders reliably in every build.
  appIcon: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: t.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appIconGlyph: {
    fontFamily: fonts.bold,
    fontSize: 26,
    lineHeight: 30,
    color: readableTextOn(t.accent),
  },
  appName: {
    fontFamily: fonts.bold,
    fontSize: fontSize.lg + 3,
    color: t.fg,
    letterSpacing: -0.5,
  },
  versionText: {
    fontFamily: fonts.regular,
    fontSize: fontSize.sm + 1,
    color: t.textMuted,
    marginTop: 2,
  },
  cardDivider: {
    height: 1,
    backgroundColor: t.divider,
    marginHorizontal: 16,
  },
  offlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 16,
    paddingTop: spacing.lg,
  },
  greenDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: badgeColors.tracking,
  },
  offlineText: {
    fontFamily: fonts.bold,
    fontSize: fontSize.md,
    color: t.fg,
  },
  dataSourceText: {
    fontFamily: fonts.regular,
    fontSize: fontSize.sm + 1,
    color: t.textDim,
    lineHeight: 17,
    paddingHorizontal: 16,
    paddingTop: spacing.md,
    paddingBottom: 18,
  },

  // Clear data
  clearButton: {
    marginTop: spacing.xl,
    height: 50,
    borderWidth: 1,
    borderColor: t.dangerBorder,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearText: {
    fontFamily: fonts.bold,
    fontSize: fontSize.md,
    color: t.danger,
    letterSpacing: 1.4,
  },
});
