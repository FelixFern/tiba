import Constants from 'expo-constants';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { storage, useTibaStore } from '../../lib/store';
import { badgeColors, borderColors, colors, fontSize, fonts, spacing } from '../../lib/theme';

export default function SettingsScreen() {
  const [locationStatus, setLocationStatus] = useState<'granted' | 'denied'>('denied');
  const [notificationStatus, setNotificationStatus] = useState<'granted' | 'denied'>(
    'denied'
  );
  const [isLoading, setIsLoading] = useState(false);

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

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'This will reset your destination, alarm threshold, and all settings. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            storage.clearAll();
            useTibaStore.getState().resetStore();
            Alert.alert('Success', 'All data cleared');
          },
        },
      ]
    );
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
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* HEADER */}
      <Text style={styles.header}>Settings</Text>

      {/* PERMISSIONS SECTION */}
      <Text style={styles.sectionLabel}>PERMISSIONS</Text>

      {/* Location Row */}
      <View style={styles.permissionRow}>
        <View style={styles.permissionLeft}>
          <Text style={styles.permissionLabel}>Location</Text>
          <Text style={styles.permissionDescription}>Always · background tracking</Text>
        </View>
        <View style={styles.permissionRight}>
          {locationStatus === 'granted' ? (
            <Text style={styles.grantedBadge}>● GRANTED</Text>
          ) : (
            <TouchableOpacity onPress={handleRequestLocation} disabled={isLoading}>
              <Text style={styles.enableButton}>ENABLE</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Notifications Row */}
      <View style={styles.permissionRow}>
        <View style={styles.permissionLeft}>
          <Text style={styles.permissionLabel}>Notifications</Text>
          <Text style={styles.permissionDescription}>Alarms & live updates</Text>
        </View>
        <View style={styles.permissionRight}>
          {notificationStatus === 'granted' ? (
            <Text style={styles.grantedBadge}>● GRANTED</Text>
          ) : (
            <TouchableOpacity onPress={handleRequestNotification} disabled={isLoading}>
              <Text style={styles.enableButton}>ENABLE</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Precise Location Row */}
      <View style={styles.permissionRow}>
        <View style={styles.permissionLeft}>
          <Text style={styles.permissionLabel}>Precise location</Text>
          <Text style={styles.permissionDescription}>Improves station accuracy</Text>
        </View>
        <View style={styles.permissionRight}>
          <TouchableOpacity onPress={handlePreciseLocation}>
            <Text style={styles.enableButton}>■ ENABLE</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ABOUT SECTION */}
      <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>ABOUT</Text>
      
      <View style={styles.aboutRow}>
        <View style={styles.aboutHeader}>
          <Text style={styles.blueDot}>●</Text>
          <Text style={styles.appName}>tiba</Text>
        </View>
        <Text style={styles.versionText}>v{version} · KRL Jabodetabek alarm</Text>
      </View>

      <View style={styles.offlineRow}>
        <Text style={styles.greenDot}>●</Text>
        <Text style={styles.offlineText}>All features work offline</Text>
      </View>

      <View style={styles.dataSourceRow}>
        <Text style={styles.dataSourceText}>
          Station data: Indonesian Ministry of Transportation, Wikipedia, OpenStreetMap. No accounts, no servers, no telemetry.
        </Text>
      </View>

      {/* CLEAR DATA ACTION */}
      <TouchableOpacity style={styles.clearDataAction} onPress={handleClearData}>
        <Text style={styles.clearDataText}>CLEAR SAVED TRIP DATA</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.monoBg,
  },
  contentContainer: {
    paddingBottom: spacing.xl,
  },
  header: {
    fontFamily: fonts.bold,
    fontSize: fontSize.xxl,
    color: colors.monoFg,
    paddingTop: 64,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xxl,
  },
  sectionLabel: {
    fontFamily: fonts.regular,
    fontSize: fontSize.md,
    color: '#999999',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionLabelSpaced: {
    marginTop: spacing.xxl,
  },
  permissionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: borderColors.subtle,
  },
  permissionLeft: {
    flex: 1,
  },
  permissionLabel: {
    fontFamily: fonts.bold,
    fontSize: fontSize.body,
    color: colors.monoFg,
    marginBottom: 4,
  },
  permissionDescription: {
    fontFamily: fonts.regular,
    fontSize: fontSize.sm,
    color: '#999999',
  },
  permissionRight: {
    marginLeft: spacing.lg,
  },
  grantedBadge: {
    fontFamily: fonts.bold,
    fontSize: fontSize.sm,
    color: badgeColors.granted,
    textTransform: 'uppercase',
  },
  enableButton: {
    fontFamily: fonts.bold,
    fontSize: fontSize.sm,
    color: badgeColors.enable,
    textTransform: 'uppercase',
  },
  aboutRow: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  aboutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  blueDot: {
    fontSize: fontSize.lg,
    color: badgeColors.enable,
    marginRight: spacing.sm,
  },
  appName: {
    fontFamily: fonts.bold,
    fontSize: fontSize.lg,
    color: colors.monoFg,
  },
  versionText: {
    fontFamily: fonts.regular,
    fontSize: fontSize.sm,
    color: '#999999',
  },
  offlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  greenDot: {
    fontSize: spacing.sm,
    color: badgeColors.tracking,
    marginRight: spacing.sm,
  },
  offlineText: {
    fontFamily: fonts.regular,
    fontSize: fontSize.sm,
    color: '#999999',
  },
  dataSourceRow: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  dataSourceText: {
    fontFamily: fonts.regular,
    fontSize: fontSize.sm,
    color: '#999999',
    lineHeight: 16,
  },
  clearDataAction: {
    marginTop: spacing.xxl,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  clearDataText: {
    fontFamily: fonts.bold,
    fontSize: fontSize.md,
    color: colors.monoDanger,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
});
