import { Tabs } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { colors, fonts } from '../../lib/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.monoAccent,
        tabBarInactiveTintColor: '#666666',
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'NOW',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>●</Text>,
        }}
      />
      <Tabs.Screen
        name="alarm"
        options={{
          title: 'ALARM',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>◎</Text>,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'SETTINGS',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>⚙</Text>,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.monoBg,
    borderTopColor: '#333333',
    borderTopWidth: 1,
    height: 56,
    paddingBottom: 8,
  },
  tabBarLabel: {
    fontFamily: fonts.regular,
    fontSize: 8,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
  },
});
