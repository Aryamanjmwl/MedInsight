import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { getStatusColor, getStatusLabel } from '@/components/status-utils';
import { latestReportPreview, reports } from '@/data/mock-data';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';
import { colors, radii, spacing } from '@/theme';

export function LatestReportPanel() {
  const { isCompact } = useResponsiveLayout();
  const report = reports[0];
  return (
    <View style={styles.panel}>
      <AppText variant="metadata" color="textMuted">Latest Report</AppText>
      <View style={[styles.body, isCompact && styles.compactBody]}>
        <View style={styles.reportDetails}>
          <View style={styles.dateRow}>
            <AppText variant="display" style={styles.day}>12</AppText>
            <AppText variant="caption" color="textMuted">August 2026</AppText>
          </View>
          <AppText variant="section">{report.title}</AppText>
          <AppText variant="caption" color="textMuted">{report.laboratory}</AppText>
          <View style={styles.metadataRow}>
            <AppText variant="label" color="textSecondary">9 biomarkers measured</AppText>
            <AppText variant="label" color="statusHigh">2 outside reference range</AppText>
          </View>
        </View>

        <View style={[styles.preview, isCompact && styles.compactPreview]}>
          {latestReportPreview.map((item) => (
            <View key={item.id} style={styles.previewRow}>
              <AppText variant="caption" color="textSecondary" style={styles.previewName}>{item.name}</AppText>
              <AppText variant="label" style={[styles.numeric, { color: getStatusColor(item.status) }]}>{item.value} {item.unit}</AppText>
              <AppText variant="metadata" style={[styles.status, { color: getStatusColor(item.status) }]}>{getStatusLabel(item.status)}</AppText>
            </View>
          ))}
          <View style={styles.actions}>
            <Pressable accessibilityRole="button"><AppText variant="label" color="brand">View report →</AppText></Pressable>
            <Pressable accessibilityRole="button"><AppText variant="label" color="textMuted">All results →</AppText></Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { width: '100%', minWidth: 0, padding: spacing.xl, gap: spacing.lg, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface },
  body: { flexDirection: 'row', alignItems: 'stretch', gap: spacing.xxl },
  compactBody: { flexDirection: 'column' },
  reportDetails: { flex: 1, gap: spacing.xs },
  dateRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, marginBottom: spacing.sm },
  day: { fontVariant: ['tabular-nums'] },
  metadataRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, marginTop: spacing.sm },
  preview: { width: 285, paddingLeft: spacing.xl, borderLeftWidth: 1, borderLeftColor: colors.border },
  compactPreview: { width: '100%', minWidth: 0, paddingLeft: 0, paddingTop: spacing.md, borderLeftWidth: 0, borderTopWidth: 1, borderTopColor: colors.border },
  previewRow: { minHeight: 35, flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle },
  previewName: { flex: 1, minWidth: 0 },
  numeric: { fontVariant: ['tabular-nums'], textAlign: 'right' },
  status: { width: 34, textAlign: 'right', fontSize: 9 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, paddingTop: spacing.md },
});
