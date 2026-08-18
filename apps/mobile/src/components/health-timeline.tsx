import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import type { SavedReportSummary } from '@/api';
import { AppText } from '@/components/app-text';
import { colors, radii, spacing } from '@/theme';
import { formatDayMonth, formatFullDate, formatYear } from '@/utils/formatting';

type HealthTimelineProps = { reports: SavedReportSummary[] };

export function HealthTimeline({ reports }: HealthTimelineProps) {
  const router = useRouter();
  const year = reports[0] ? formatYear(reports[0].uploaded_at) : '';
  return (
    <View style={styles.section}>
      <AppText variant="metadata" color="textMuted">Health History</AppText>
      <View style={styles.yearHeader}>
        <AppText variant="section">{year}</AppText>
        <View style={styles.yearRule} />
      </View>
      <View style={styles.timeline}>
        <View style={styles.line} />
        {reports.map((report) => (
          <Pressable key={report.id} accessibilityRole="link" onPress={() => router.push('/reports')} style={({ pressed, hovered }) => [styles.entry, (pressed || hovered) && styles.entryActive]}>
            <View style={styles.dot} />
            <View style={styles.dateBlock}>
              <AppText variant="metadata" color="textPrimary">{formatDayMonth(report.uploaded_at)}</AppText>
              <AppText variant="caption" color="textFaint">{formatYear(report.uploaded_at)}</AppText>
            </View>
            <View style={styles.entryContent}>
              <AppText variant="bodyStrong">Laboratory report</AppText>
              <AppText variant="caption" color="textMuted">{report.biomarker_count} measurements · {report.page_count} {report.page_count === 1 ? 'page' : 'pages'}{report.requires_ocr ? ' · OCR source' : ''}</AppText>
              <AppText variant="caption" color="textFaint">{formatFullDate(report.uploaded_at)}</AppText>
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
