import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import type { DashboardManualMeasurement, SavedReportSummary } from '@/api';
import { AppText } from '@/components/app-text';
import { colors, radii, spacing } from '@/theme';
import { formatDayMonth, formatFullDate, formatValue, formatYear } from '@/utils/formatting';

type HealthTimelineProps = { reports: SavedReportSummary[]; manualMeasurements: DashboardManualMeasurement[] };

export function HealthTimeline({ reports, manualMeasurements }: HealthTimelineProps) {
  const router = useRouter();
  const entries = [
    ...reports.map((report) => ({ kind: 'report' as const, date: report.uploaded_at, report })),
    ...manualMeasurements.map((measurement) => ({ kind: 'manual' as const, date: measurement.measured_at, measurement })),
  ].sort((left, right) => right.date.localeCompare(left.date)).slice(0, 7);
  const year = entries[0] ? formatYear(entries[0].date) : '';
  return (
    <View style={styles.section}>
      <AppText variant="metadata" color="textMuted">Health History</AppText>
      <View style={styles.yearHeader}>
        <AppText variant="section">{year}</AppText>
        <View style={styles.yearRule} />
      </View>
      <View style={styles.timeline}>
        <View style={styles.line} />
        {entries.map((entry) => (
          <Pressable key={entry.kind === 'report' ? `report-${entry.report.id}` : `manual-${entry.measurement.measurement_id}`} accessibilityRole="link" onPress={() => router.push(entry.kind === 'report' ? '/reports' : '/biomarkers')} style={({ pressed, hovered }) => [styles.entry, (pressed || hovered) && styles.entryActive]}>
            <View style={styles.dot} />
            <View style={styles.dateBlock}>
              <AppText variant="metadata" color="textPrimary">{formatDayMonth(entry.date)}</AppText>
              <AppText variant="caption" color="textFaint">{formatYear(entry.date)}</AppText>
            </View>
            <View style={styles.entryContent}>
              {entry.kind === 'report' ? (
                <>
                  <AppText variant="bodyStrong">Laboratory report</AppText>
                  <AppText variant="caption" color="textMuted">{entry.report.biomarker_count} measurements · {entry.report.page_count} {entry.report.page_count === 1 ? 'page' : 'pages'}{entry.report.requires_ocr ? ' · OCR source' : ''}</AppText>
                  <AppText variant="caption" color="textFaint">{formatFullDate(entry.report.uploaded_at)}</AppText>
                </>
              ) : (
                <>
                  <AppText variant="bodyStrong">{entry.measurement.test_name}</AppText>
                  <AppText variant="caption" color="textSecondary">{formatValue(entry.measurement.value)} {entry.measurement.unit}</AppText>
                  <AppText variant="caption" color="textFaint">Manual entry · {formatFullDate(entry.measurement.measured_at)}</AppText>
                </>
              )}
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { maxWidth: 680, gap: spacing.lg, paddingVertical: spacing.lg },
  yearHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md }, yearRule: { flex: 1, height: 1, backgroundColor: colors.textPrimary },
  timeline: { position: 'relative', paddingLeft: spacing.xl },
  line: { position: 'absolute', left: 5, top: 8, bottom: 28, width: 1, backgroundColor: colors.borderStrong },
  entry: { position: 'relative', minHeight: 88, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.lg, paddingBottom: spacing.xl, paddingLeft: spacing.md },
  entryActive: { opacity: 0.64 },
  dot: { position: 'absolute', left: -24, top: 3, width: 11, height: 11, borderWidth: 2, borderColor: colors.surface, borderRadius: radii.pill, backgroundColor: colors.textPrimary },
  dateBlock: { width: 62, gap: spacing.xxs },
  entryContent: { gap: spacing.xs },
});
