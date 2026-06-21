import { useEffect, useCallback } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
  withDelay,
  interpolate,
  Easing,
  type SharedValue,
} from 'react-native-reanimated';

// ---------------------------------------------------------------------------
// Spring presets
// ---------------------------------------------------------------------------

const SPRING_SNAPPY = { damping: 15, stiffness: 150, mass: 0.8 };
const SPRING_BOUNCY = { damping: 12, stiffness: 180, mass: 0.6 };

// ---------------------------------------------------------------------------
// 1. Animated Counter — number rolls on value change
// ---------------------------------------------------------------------------

export function useAnimatedCounter(value: number | null) {
  const sv = useSharedValue(value ?? 0);
  const offset = useSharedValue(0);

  useEffect(() => {
    if (value === null) return;
    if (sv.value !== value) {
      // Slide old number up, snap new one in from below
      offset.value = withSequence(
        withTiming(-20, { duration: 120, easing: Easing.out(Easing.quad) }),
        withTiming(20, { duration: 0 }), // jump below
        withTiming(0, { duration: 180, easing: Easing.out(Easing.back(1.4)) }),
      );
      sv.value = value;
    }
  }, [value, sv, offset]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: offset.value }],
    opacity: interpolate(Math.abs(offset.value), [0, 20], [1, 0]),
  }));

  return { animatedStyle, displayValue: sv } as const;
}

// ---------------------------------------------------------------------------
// 2. Pulse — looping scale pulse for "You Are Here" dot
// ---------------------------------------------------------------------------

export function usePulse(
  active: boolean,
  { minScale = 1, maxScale = 1.35, duration = 1200 } = {},
) {
  const scale = useSharedValue(minScale);

  useEffect(() => {
    if (active) {
      scale.value = withRepeat(
        withSequence(
          withTiming(maxScale, { duration: duration / 2, easing: Easing.inOut(Easing.ease) }),
          withTiming(minScale, { duration: duration / 2, easing: Easing.inOut(Easing.ease) }),
        ),
        -1, // infinite
        false,
      );
    } else {
      scale.value = withTiming(minScale, { duration: 200 });
    }
  }, [active, scale, minScale, maxScale, duration]);

  return useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
}

// ---------------------------------------------------------------------------
// 3. Spring Press — tactile press-down + spring-back for buttons
// ---------------------------------------------------------------------------

export function useSpringPress(scaleTo = 0.95) {
  const scale = useSharedValue(1);

  const onPressIn = useCallback(() => {
    scale.value = withTiming(scaleTo, { duration: 80 });
  }, [scale, scaleTo]);

  const onPressOut = useCallback(() => {
    scale.value = withSpring(1, SPRING_BOUNCY);
  }, [scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return { animatedStyle, onPressIn, onPressOut } as const;
}

// ---------------------------------------------------------------------------
// 4. Slide + Fade transition — for badges, cards entering/exiting
// ---------------------------------------------------------------------------

export function useSlideTransition(
  visible: boolean,
  { from = 'top', distance = 16, duration = 250 } = {},
) {
  const progress = useSharedValue(visible ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(visible ? 1 : 0, {
      duration,
      easing: Easing.out(Easing.quad),
    });
  }, [visible, progress, duration]);

  return useAnimatedStyle(() => {
    const translate = interpolate(progress.value, [0, 1], [from === 'top' ? -distance : distance, 0]);
    return {
      opacity: progress.value,
      transform: [{ translateY: translate }],
    };
  });
}

// ---------------------------------------------------------------------------
// 5. Fade transition — simple opacity animation
// ---------------------------------------------------------------------------

export function useFadeTransition(
  visible: boolean,
  { duration = 200 } = {},
) {
  const opacity = useSharedValue(visible ? 1 : 0);

  useEffect(() => {
    opacity.value = withTiming(visible ? 1 : 0, { duration });
  }, [visible, opacity, duration]);

  return useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));
}

// ---------------------------------------------------------------------------
// 6. Scale entrance — for checkmarks, icons popping in
// ---------------------------------------------------------------------------

export function useScaleEntrance(visible: boolean) {
  const scale = useSharedValue(visible ? 1 : 0);

  useEffect(() => {
    scale.value = visible
      ? withSpring(1, SPRING_SNAPPY)
      : withTiming(0, { duration: 100 });
  }, [visible, scale]);

  return useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: scale.value,
  }));
}

// ---------------------------------------------------------------------------
// 7. Continuous rotation — for decorative arcs
// ---------------------------------------------------------------------------

export function useRotation(
  active: boolean,
  { duration = 20000 } = {},
) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (active) {
      rotation.value = withRepeat(
        withTiming(360, { duration, easing: Easing.linear }),
        -1,
        false,
      );
    } else {
      rotation.value = withTiming(0, { duration: 500 });
    }
  }, [active, rotation, duration]);

  return useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));
}

// ---------------------------------------------------------------------------
// 8. Tab icon bounce — spring scale bump on activation
// ---------------------------------------------------------------------------

export function useTabBounce(focused: boolean) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (focused) {
      scale.value = withSequence(
        withTiming(1.2, { duration: 100 }),
        withSpring(1, SPRING_BOUNCY),
      );
    }
  }, [focused, scale]);

  return useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
}

// ---------------------------------------------------------------------------
// 9. Stagger fade-in for list items
// ---------------------------------------------------------------------------

export function useStaggerFadeIn(
  index: number,
  { delay = 30, duration = 200 } = {},
) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(8);

  useEffect(() => {
    opacity.value = withDelay(
      index * delay,
      withTiming(1, { duration }),
    );
    translateY.value = withDelay(
      index * delay,
      withTiming(0, { duration, easing: Easing.out(Easing.quad) }),
    );
  }, [index, opacity, translateY, delay, duration]);

  return useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));
}

// ---------------------------------------------------------------------------
// 10. Entry animation — scale + fade on mount
// ---------------------------------------------------------------------------

export function useEntryAnimation({
  fromScale = 0.85,
  duration = 350,
} = {}) {
  const scale = useSharedValue(fromScale);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, SPRING_SNAPPY);
    opacity.value = withTiming(1, { duration });
  }, [scale, opacity, fromScale, duration]);

  return useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));
}

// ---------------------------------------------------------------------------
// 11. Dim transition — for passed stations
// ---------------------------------------------------------------------------

export function useDimTransition(
  dimmed: boolean,
  { duration = 300 } = {},
) {
  const opacity = useSharedValue(dimmed ? 0.35 : 1);

  useEffect(() => {
    opacity.value = withTiming(dimmed ? 0.35 : 1, { duration });
  }, [dimmed, opacity, duration]);

  return useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));
}
