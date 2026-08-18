import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import type { DashboardSummaryResponse, SavedReportSummary } from '@/api';
import { AppText } from '@/components/app-text';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';
import { colors, spacing } from '@/theme';
import { formatDay, formatMonthYear } from '@/utils/formatting';

export function LatestReportPanel({ summary, report }: { summary: DashboardSummaryResponse; report?: SavedReportSummary }) {
  const { isCompact } = useResponsiveLayout();
  const router = useRouter();
  const latestDate = summary.latest_report_date!;
  return (
    <View style={styles.panel}>
      <View style={styles.headingRow}>
        <AppText variant="metadata" color="textMuted">Latest Report</AppText>
        {report ? <AppText variant="caption" color="textFaint">{report.requires_ocr ? 'OCR source' : 'Machine-readable PDF'}</AppText> : null}
      </View>
      <View style={[styles.body, isCompact && styles.compactBody]}>
        <View style={styles.recordDetails}>
          <View style={styles.dateRow}>
            <AppText variant="display" style={styles.day}>{formatDay(latestDate)}</AppText>
            <View>
              <AppText variant="metadata" color="textSecondary">{formatMonthYear(latestDate).split(' ')[0]}</AppText>
              <AppText variant="caption" color="textMuted">{formatMonthYear(latestDate).split(' ')[1]}</AppText>
            </View>
          </View>
          <AppText variant="section">Latest laboratory report</AppText>
        </View>

        <View style={[styles.preview, isCompact && styles.compactPreview]}>
          <AppText variant="metadata" color="textMuted" style={styles.previewLabel}>Report Summary</AppText>
          <View style={styles.reportFacts}>
            <View style={styles.fact}>
              <AppText variant="metadata" color="textFaint">Measurements</AppText>
              <AppText variant="bodyStrong" color="textSecondary">{report?.biomarker_count ?? summary.latest_biomarkers.length}</AppText>
            </View>
            {report ? (
              <View style={styles.fact}>
                <AppText variant="metadata" color="textFaint">Pages</AppText>
                <AppText variant="bodyStrong" color="textSecondary">{report.page_count}</AppText>
              </View>
            ) : null}
            <View style={styles.fact}>
              <AppText variant="metadata" color="textFaint">Text source</AppText>
              <AppText variant="bodyStrong" color="textSecondary">{report?.requires_ocr ? 'Recovered with OCR' : 'Machine-readable PDF'}</AppText>
            </View>
          </View>
          <View style={styles.actions}>
            <Pressable accessibilityRole="link" onPress={() => router.push('/biomarkers')} style={styles.action}><AppText variant="label" color="brand">View biomarkers →</AppText></Pressable>
            <Pressable accessibilityRole="link" onPress={() => router.push('/reports')} style={styles.action}><AppText variant="label" color="textMuted">All reports →</AppText></Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { width: '100%', minWidth: 0, padding: spacing.xl, gap: spacing.lg, borderTopWidth: 2, borderTopColor: colors.textPrimary, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface },
  headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.md },
  body: { flexDirection: 'row', alignItems: 'stretch', gap: spacing.xxxl }, compactBody: { flexDirection: 'column' },
  recordDetails: { flex: 1, gap: spacing.xs }, dateRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, marginBottom: spacing.sm },
  day: { minWidth: 58, fontSize: 52, lineHeight: 54, fontVariant: ['tabular-nums'] },
  preview: { width: 330, paddingLeft: spacing.xl, borderLeftWidth: 1, borderLeftColor: colors.border },
  compactPreview: { width: '100%', minWidth: 0, paddingLeft: 0, paddingTop: spacing.md, borderLeftWidth: 0, borderTopWidth: 1, borderTopColor: colors.border },
  previewLabel: { marginBottom: spacing.sm },
  reportFacts: { gap: spacing.md }, fact: { gap: spacing.xxs },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, paddingTop: spacing.lg },
  action: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.xs },
});
