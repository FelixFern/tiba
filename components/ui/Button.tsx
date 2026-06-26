import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSpringPress } from '../../lib/animations';
import { fonts, fontSize, radius, readableTextOn, spacing, type Theme } from '../../lib/theme';
import { useTheme } from '../../lib/use-theme';

export type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'ghost';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * The design-system button. Variants map to the theme palette so they track the
 * active accent and light/dark mode. Press feedback comes from the shared
 * spring-press animation used elsewhere in the app.
 */
export function Button({ label, onPress, variant = 'primary', disabled, style }: ButtonProps) {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const { animatedStyle, onPressIn, onPressOut } = useSpringPress(0.96);

  return (
    <Animated.View style={[animatedStyle, styles.wrap, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={disabled}
        style={[styles.base, styles[`${variant}Container`], disabled && styles.disabled]}
      >
        <Text style={[styles.label, styles[`${variant}Label`]]}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    wrap: { flex: 1 },
    base: {
      paddingVertical: 13,
      paddingHorizontal: spacing.lg,
      borderRadius: radius.sm,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    disabled: { opacity: 0.45 },
    label: {
      fontFamily: fonts.bold,
      fontSize: fontSize.md,
      letterSpacing: 1.2,
    },
    // Variant container + label colors.
    primaryContainer: { backgroundColor: t.accent, borderColor: t.accent },
    primaryLabel: { color: readableTextOn(t.accent) },
    secondaryContainer: { backgroundColor: 'transparent', borderColor: t.border },
    secondaryLabel: { color: t.fg },
    destructiveContainer: { backgroundColor: t.danger, borderColor: t.danger },
    destructiveLabel: { color: '#FFFFFF' },
    ghostContainer: { backgroundColor: 'transparent', borderColor: 'transparent' },
    ghostLabel: { color: t.textMuted },
  });
