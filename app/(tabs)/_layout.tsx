import { Tabs } from 'expo-router';
import { type ColorValue, Text } from 'react-native';
import Animated from 'react-native-reanimated';
import TabBar from '../../components/TabBar';
import { useTabBounce } from '../../lib/animations';

function TabIcon({ icon, color, focused, size }: { icon: string; color: ColorValue; focused: boolean; size?: number }) {
  const bounceStyle = useTabBounce(focused);
  return (
    <Animated.View style={[bounceStyle, { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }]}>
      <Text style={{ fontSize: size ?? 18, color, lineHeight: 24, textAlign: 'center' }}>{icon}</Text>
    </Animated.View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'NOW',
          tabBarIcon: ({ color, focused }) => <TabIcon icon="●" color={color} focused={focused} size={32} />,
        }}
      />
      <Tabs.Screen
        name="alarm"
        options={{
          title: 'ALARM',
          tabBarIcon: ({ color, focused }) => <TabIcon icon="◎" color={color} focused={focused} size={32} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'SETTINGS',
          tabBarIcon: ({ color, focused }) => <TabIcon icon="⚙" color={color} focused={focused} size={20} />,
        }}
      />
    </Tabs>
  );
}
