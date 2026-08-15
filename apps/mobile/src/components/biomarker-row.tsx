import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { StatusBadge } from '@/components/status-badge';
import type { MockBiomarker } from '@/data/mock-data';
import { colors, spacing } from '@/theme';

export function BiomarkerRow({ biomarker }: { biomarker: MockBiomarker }) {
  return (
    <View style={styles.row}>
      <View style={styles.details}>
        <AppText variant="bodyStrong">{biomarker.name}</AppText>
        <AppText variant="caption" color="textMuted">
          Updated {biomarker.date}
        </AppText>
      </View>
      <View style={styles.measurement}>
        <View style={styles.valueRow}>
          <AppText variant="section">{biomarker.value}</AppText>
          <AppText variant="caption" color="textSecondary">
            {biomarker.unit}
          </AppText>
        </View>
        <StatusBadge status={biomarker.status} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  details: {
    flex: 1,
    gap: spacing.xs,
  },
  measurement: {
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
});
