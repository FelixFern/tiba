import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { fonts, type Theme } from '../lib/theme';
import { useTheme } from '../lib/use-theme';

const INDICATOR_WIDTH = 28;

export default function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const ACTIVE = theme.accent;
  const INACTIVE = theme.dim;
  const [barWidth, setBarWidth] = useState(0);
  const tabWidth = barWidth > 0 ? barWidth / state.routes.length : 0;

  const indicatorX = useSharedValue(0);

  useEffect(() => {
    if (tabWidth === 0) return;
    const target = tabWidth * state.index + tabWidth / 2 - INDICATOR_WIDTH / 2;
    indicatorX.value = withSpring(target, { damping: 18, stiffness: 200, mass: 0.7 });
  }, [state.index, tabWidth, indicatorX]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
  }));

  return (
    <View
      style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}
      onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
    >
      {tabWidth > 0 && (
        <Animated.View
          style={[styles.indicator, { width: INDICATOR_WIDTH }, indicatorStyle]}
        />
      )}

      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = options.title ?? route.name;
        const focused = state.index === index;
        const color = focused ? ACTIVE : INACTIVE;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            onPress={onPress}
            style={styles.tab}
          >
            {options.tabBarIcon?.({ focused, color, size: 24 })}
            <Text
              style={[
                styles.label,
                { color, fontFamily: focused ? fonts.bold : fonts.regular },
              ]}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    bar: {
      flexDirection: 'row',
      backgroundColor: t.bg,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: t.divider,
      paddingTop: 12,
    },
    indicator: {
      position: 'absolute',
      top: 0,
      left: 0,
      height: 2,
      backgroundColor: t.accent,
    },
    tab: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    label: {
      fontSize: 9,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
    },
  });
