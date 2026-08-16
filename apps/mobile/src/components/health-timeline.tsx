import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { colors, radii, spacing } from '@/theme';
import { formatFullDate, formatMonthHeader } from '@/utils/formatting';

type HealthTimelineProps = { latestReportDate: string; totalReports: number };

export function HealthTimeline({ latestReportDate, totalReports }: HealthTimelineProps) {
  return (
    <View style={styles.section}>
      <AppText variant="metadata" color="textMuted">Health History</AppText>
      <View style={styles.yearHeader}>
        <AppText variant="section">{formatMonthHeader(latestReportDate).split(' ').at(-1)}</AppText>
        <View style={styles.yearRule} />
      </View>
      <View style={styles.timeline}>
        <View style={styles.line} />
        <View style={styles.dot} />
        <View style={styles.entryContent}>
          <AppText variant="metadata" color="textPrimary">{formatFullDate(latestReportDate)}</AppText>
          <AppText variant="bodyStrong">Most recent saved report</AppText>
          <AppText variant="caption" color="textMuted">{totalReports} {totalReports === 1 ? 'report' : 'reports'} recorded</AppText>
          <AppText variant="caption" color="textSecondary">This overview shows the latest saved report only.</AppText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { maxWidth: 560, gap: spacing.xl, paddingVertical: spacing.lg },
  yearHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md }, yearRule: { flex: 1, height: 1, backgroundColor: colors.textPrimary },
  timeline: { position: 'relative', minHeight: 112, paddingLeft: spacing.xxl },
  line: { position: 'absolute', left: 5, top: 7, bottom: 10, width: 1, backgroundColor: colors.borderStrong },
  dot: { position: 'absolute', left: 0, top: 2, width: 11, height: 11, borderWidth: 1.5, borderColor: colors.textPrimary, borderRadius: radii.pill, backgroundColor: colors.textPrimary },
  entryContent: { gap: spacing.xs },
});
