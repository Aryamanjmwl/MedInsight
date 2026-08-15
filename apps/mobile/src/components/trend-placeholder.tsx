import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { colors, radii, spacing } from '@/theme';

export function TrendPlaceholder() {
  return (
    <View style={styles.card}>
      <View style={styles.copy}>
        <AppText variant="bodyStrong">Trend history</AppText>
        <AppText variant="caption" color="textSecondary">
          Longitudinal charts will appear as more reports are added.
        </AppText>
      </View>
      <View style={styles.placeholder} accessibilityLabel="Future trend chart placeholder">
        <View style={[styles.point, styles.pointOne]} />
        <View style={[styles.point, styles.pointTwo]} />
        <View style={[styles.point, styles.pointThree]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceMuted,
  },
  copy: {
    flex: 1,
    gap: spacing.xs,
  },
  placeholder: {
    width: 110,
    height: 54,
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.borderStrong,
  },
  point: {
    position: 'absolute',
    width: 7,
    height: 7,
    borderRadius: radii.pill,
    backgroundColor: colors.brand,
  },
  pointOne: { left: 12, bottom: 12 },
  pointTwo: { left: 50, bottom: 27 },
  pointThree: { right: 10, bottom: 35 },
});
