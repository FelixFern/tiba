import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';
import { colors, fonts } from '../../lib/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.monoAccent,
        tabBarInactiveTintColor: colors.monoGray2,
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Home' }}
      />
      <Tabs.Screen
        name="alarm"
        options={{ title: 'Alarm' }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: 'Settings' }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.monoGray1,
    borderTopColor: colors.monoGray2,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tabBarLabel: {
    fontFamily: fonts.regular,
    fontSize: 11,
  },
});
