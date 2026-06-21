import { Tabs } from 'expo-router';
import { type ColorValue, StyleSheet, Text } from 'react-native';
import Animated from 'react-native-reanimated';
import { colors, fonts } from '../../lib/theme';
import { useTabBounce } from '../../lib/animations';

function TabIcon({ icon, color, focused }: { icon: string; color: ColorValue; focused: boolean }) {
  const bounceStyle = useTabBounce(focused);
  return (
    <Animated.View style={bounceStyle}>
      <Text style={{ fontSize: 20, color }}>{icon}</Text>
    </Animated.View>
  );
}

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
          tabBarIcon: ({ color, focused }) => <TabIcon icon="●" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="alarm"
        options={{
          title: 'ALARM',
          tabBarIcon: ({ color, focused }) => <TabIcon icon="◎" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'SETTINGS',
          tabBarIcon: ({ color, focused }) => <TabIcon icon="⚙" color={color} focused={focused} />,
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
