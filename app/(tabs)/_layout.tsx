import { Tabs } from 'expo-router';
import { type ColorValue } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';
import TabBar from '../../components/TabBar';
import { useTabBounce } from '../../lib/animations';

type IoniconName = keyof typeof Ionicons.glyphMap;

function TabIcon({
  name,
  color,
  focused,
  size = 22,
}: {
  name: IoniconName;
  color: ColorValue;
  focused: boolean;
  size?: number;
}) {
  const bounceStyle = useTabBounce(focused);
  return (
    <Animated.View style={[bounceStyle, { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }]}>
      <Ionicons name={name} size={size} color={color} />
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
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'radio' : 'radio-outline'} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="alarm"
        options={{
          title: 'ALARM',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'alarm' : 'alarm-outline'} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'SETTINGS',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'settings' : 'settings-outline'} color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
