import { useFonts } from 'expo-font';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import DevTools from '../components/DevTools';
import AlarmOverlay from '../components/AlarmOverlay';
import { configureNotifications } from '../lib/notifications';
import { useTibaStore } from '../lib/store';
import { useTheme } from '../lib/use-theme';
// Importing registers the background location task + notification response
// listener at startup, so alarms/actions work regardless of which tab opened.
import '../lib/background-location';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'JetBrainsMono-Regular': require('../assets/fonts/JetBrainsMono-Regular.ttf'),
    'JetBrainsMono-Bold': require('../assets/fonts/JetBrainsMono-Bold.ttf'),
  });

  // Render the alarm as a store-gated overlay rather than a navigated route, so
  // arming/dismissing it never transitions screens (which previously flashed a
  // blank screen on dismiss). It covers the whole app, including the tab bar.
  const isAlarmActive = useTibaStore((s) => s.isAlarmActive);
  const theme = useTheme();

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    void configureNotifications();
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: theme.bg }}>
        <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.bg } }}>
          <Stack.Screen name="(tabs)" />
        </Stack>
        <DevTools />
        {isAlarmActive && <AlarmOverlay />}
      </View>
    </SafeAreaProvider>
  );
}
