import { Pressable, StyleSheet, View } from 'react-native';

import type { DashboardSummaryResponse } from '@/api';
import { AppText } from '@/components/app-text';
import { getStatusColor, getStatusLabel } from '@/components/status-utils';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';
import { colors, radii, spacing } from '@/theme';
import { formatDay, formatMonthYear, formatValue } from '@/utils/formatting';

export function LatestReportPanel({ summary }: { summary: DashboardSummaryResponse }) {
  const { isCompact } = useResponsiveLayout();
  const latestDate = summary.latest_report_date!;
  return (
    <View style={styles.panel}>
      <AppText variant="metadata" color="textMuted">Latest Record</AppText>
      <View style={[styles.body, isCompact && styles.compactBody]}>
        <View style={styles.recordDetails}>
          <View style={styles.dateRow}>
            <AppText variant="display" style={styles.day}>{formatDay(latestDate)}</AppText>
            <AppText variant="caption" color="textMuted">{formatMonthYear(latestDate)}</AppText>
          </View>
          <AppText variant="section">Saved health record summary</AppText>
          <View style={styles.metadataRow}>
            <AppText variant="label" color="textSecondary">{summary.total_reports} reports recorded</AppText>
            <AppText variant="label" color="textSecondary">{summary.total_distinct_biomarkers} biomarkers tracked</AppText>
            <AppText variant="label" color={summary.abnormal_biomarker_count ? 'statusHigh' : 'textMuted'}>{summary.abnormal_biomarker_count} latest outside range</AppText>
          </View>
        </View>

        <View style={[styles.preview, isCompact && styles.compactPreview]}>
          {summary.latest_biomarkers.slice(0, 3).map((item) => {
            const statusColor = getStatusColor(item.latest_status);
            return (
              <View key={item.normalized_name} style={styles.previewRow}>
                <AppText variant="caption" color="textSecondary" style={styles.previewName}>{item.test_name}</AppText>
                <AppText variant="label" style={[styles.numeric, { color: item.latest_status === 'normal' ? colors.textPrimary : statusColor }]}>{formatValue(item.latest_value)} {item.latest_unit}</AppText>
                <AppText variant="metadata" style={[styles.status, { color: statusColor }]}>{getStatusLabel(item.latest_status)}</AppText>
              </View>
            );
          })}
          <View style={styles.actions}>
            <Pressable accessibilityRole="button"><AppText variant="label" color="brand">View biomarkers →</AppText></Pressable>
            <Pressable accessibilityRole="button"><AppText variant="label" color="textMuted">All reports →</AppText></Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { width: '100%', minWidth: 0, padding: spacing.xl, gap: spacing.lg, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface },
  body: { flexDirection: 'row', alignItems: 'stretch', gap: spacing.xxl }, compactBody: { flexDirection: 'column' },
  recordDetails: { flex: 1, gap: spacing.xs }, dateRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, marginBottom: spacing.sm },
  day: { fontVariant: ['tabular-nums'] }, metadataRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, marginTop: spacing.sm },
  preview: { width: 285, paddingLeft: spacing.xl, borderLeftWidth: 1, borderLeftColor: colors.border },
  compactPreview: { width: '100%', minWidth: 0, paddingLeft: 0, paddingTop: spacing.md, borderLeftWidth: 0, borderTopWidth: 1, borderTopColor: colors.border },
  previewRow: { minHeight: 35, flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle },
  previewName: { flex: 1, minWidth: 0 }, numeric: { fontVariant: ['tabular-nums'], textAlign: 'right' },
  status: { width: 44, textAlign: 'right', fontSize: 9 }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, paddingTop: spacing.md },
});
