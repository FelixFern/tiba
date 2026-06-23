import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts, fontSize, spacing } from '../lib/theme';

interface PageHeaderProps {
  title: string;
  right?: React.ReactNode;
}

export default function PageHeader({ title, right }: PageHeaderProps) {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>{title}</Text>
      {right && <View style={styles.right}>{right}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 72,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: fontSize.lg,
    color: colors.monoFg,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
