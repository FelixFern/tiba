import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { colors, fonts } from '../../lib/theme';
import { useTibaStore, storage } from '../../lib/store';

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

  const version = Constants.expoConfig?.version || '1.0.0';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* PERMISSIONS SECTION */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>PERMISSIONS</Text>
        <View style={styles.card}>
          <View style={styles.cardContent}>
            <View style={styles.statusRow}>
              <Text style={styles.label}>Location</Text>
              <Text
                style={[
                  styles.status,
                  locationStatus === 'granted' ? styles.statusGranted : styles.statusDenied,
                ]}
              >
                {locationStatus === 'granted' ? 'Granted' : 'Denied'}
              </Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.label}>Notifications</Text>
              <Text
                style={[
                  styles.status,
                  notificationStatus === 'granted' ? styles.statusGranted : styles.statusDenied,
                ]}
              >
                {notificationStatus === 'granted' ? 'Granted' : 'Denied'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleRequestLocation}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>Request Location Permission</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary, isLoading && styles.buttonDisabled]}
            onPress={handleRequestNotification}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>Request Notification Permission</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ABOUT SECTION */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ABOUT</Text>
        <View style={styles.card}>
          <Text style={styles.appName}>Tiba</Text>
          <Text style={styles.version}>Version {version}</Text>
          <Text style={styles.description}>KRL Jabodetabek station alarm app</Text>
        </View>
      </View>

      {/* DATA SOURCE SECTION */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>DATA SOURCE</Text>
        <View style={styles.card}>
          <Text style={styles.dataSource}>Indonesian Ministry of Transportation, Wikipedia, OpenStreetMap</Text>
        </View>
      </View>

      {/* OFFLINE INDICATOR */}
      <View style={styles.offlineIndicator}>
        <View style={styles.offlineGreenDot} />
        <Text style={styles.offlineText}>All features work offline</Text>
      </View>

      {/* CLEAR DATA BUTTON */}
      <TouchableOpacity style={styles.clearButton} onPress={handleClearData}>
        <Text style={styles.clearButtonText}>Clear Data</Text>
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
    paddingVertical: 24,
    paddingHorizontal: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.monoGray2,
    letterSpacing: 1,
    marginBottom: 12,
  },
  card: {
    backgroundColor: colors.monoGray1,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 0,
  },
  cardContent: {
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.monoFg,
  },
  status: {
    fontFamily: fonts.bold,
    fontSize: 14,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusGranted: {
    color: '#43A047',
  },
  statusDenied: {
    color: '#EF4444',
  },
  button: {
    backgroundColor: colors.monoAccent,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderRadius: 0,
  },
  buttonSecondary: {
    backgroundColor: colors.monoGray2,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.monoFg,
    textAlign: 'center',
  },
  appName: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: colors.monoFg,
    marginBottom: 8,
  },
  version: {
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.monoGray2,
    marginBottom: 8,
  },
  description: {
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.monoFg,
    lineHeight: 24,
  },
  dataSource: {
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.monoFg,
    lineHeight: 24,
  },
  offlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginHorizontal: 0,
    marginBottom: 24,
  },
  offlineGreenDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#43A047',
    marginRight: 12,
  },
  offlineText: {
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.monoFg,
  },
  clearButton: {
    backgroundColor: colors.monoDanger,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 24,
    marginBottom: 24,
    borderRadius: 0,
  },
  clearButtonText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.monoFg,
    textAlign: 'center',
  },
});
