import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts } from '../../lib/theme';

export default function AlarmScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Alarm</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.monoBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontFamily: fonts.regular,
    fontSize: 24,
    color: colors.monoFg,
  },
});
