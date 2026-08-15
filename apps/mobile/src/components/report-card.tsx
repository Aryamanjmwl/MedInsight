import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import type { MockReport } from '@/data/mock-data';
import { colors, radii, spacing } from '@/theme';

export function ReportCard({ report }: { report: MockReport }) {
  const attentionText =
    report.needsAttention > 0
      ? `${report.needsAttention} outside range`
      : 'All results in range';

  return (
    <View style={styles.card}>
      <View style={styles.documentMark}>
        <View style={styles.documentLine} />
        <View style={[styles.documentLine, styles.shortLine]} />
      </View>
      <View style={styles.content}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {report.filename}
        </AppText>
        <AppText variant="caption" color="textMuted">
          {report.date} · {report.biomarkerCount} biomarkers
        </AppText>
      </View>
      <AppText
        variant="caption"
        color={report.needsAttention > 0 ? 'statusHigh' : 'statusNormal'}
        style={styles.status}>
        {attentionText}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
  },
  documentMark: {
    width: 38,
    height: 44,
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
    backgroundColor: colors.brandMuted,
  },
  documentLine: {
    height: 2,
    borderRadius: radii.pill,
    backgroundColor: colors.brand,
  },
  shortLine: {
    width: '65%',
  },
  content: {
    flex: 1,
    gap: spacing.xs,
  },
  status: {
    textAlign: 'right',
  },
});
