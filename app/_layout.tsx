import { useFonts } from 'expo-font';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import DevTools from '../components/DevTools';
import { colors } from '../lib/theme';
import { configureNotifications } from '../lib/notifications';
// Importing registers the background location task + notification response
// listener at startup, so alarms/actions work regardless of which tab opened.
import '../lib/background-location';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'JetBrainsMono-Regular': require('../assets/fonts/JetBrainsMono-Regular.ttf'),
    'JetBrainsMono-Bold': require('../assets/fonts/JetBrainsMono-Bold.ttf'),
  });

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
      <View style={{ flex: 1, backgroundColor: colors.monoBg }}>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="alarm-trigger"
            options={{
              presentation: 'fullScreenModal',
              gestureEnabled: false,
              headerShown: false,
              animation: 'fade',
            }}
          />
        </Stack>
        <DevTools />
      </View>
    </SafeAreaProvider>
  );
}
