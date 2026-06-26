import { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts, spacing, type Theme } from '../lib/theme';
import { useTheme } from '../lib/use-theme';

interface PageHeaderProps {
  title: string;
  right?: React.ReactNode;
  /** Tap handler on the title — used for the hidden dev-tools unlock gesture. */
  onTitlePress?: () => void;
}

/**
 * Uniform screen header used across every tab: same safe-area inset, padding,
 * title typography, and an optional right-aligned slot (e.g. the tracking pill).
 */
export default function PageHeader({ title, right, onTitlePress }: PageHeaderProps) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
      {onTitlePress ? (
        <Pressable onPress={onTitlePress}>
          <Text style={styles.title}>{title}</Text>
        </Pressable>
      ) : (
        <Text style={styles.title}>{title}</Text>
      )}
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.lg,
    },
    title: {
      fontFamily: fonts.bold,
      fontSize: 24,
      color: t.fg,
      letterSpacing: -0.5,
    },
    right: {
      flexDirection: 'row',
      alignItems: 'center',
    },
  });
