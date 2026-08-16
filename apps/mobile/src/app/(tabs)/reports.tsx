import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { PageHeader } from '@/components/page-header';
import { Screen } from '@/components/screen';
import { reports } from '@/data/mock-data';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';
import { colors, radii, spacing, typography } from '@/theme';

const reportYears = [...new Set(reports.map(({ year }) => year))];

export default function ReportsScreen() {
  const { isCompact } = useResponsiveLayout();
  return (
    <Screen>
      <PageHeader title="Reports" description="A chronological record of your laboratory reports." />
      <View style={[styles.toolbar, isCompact && styles.compactToolbar]}>
        <View style={styles.searchShell}>
          <AppText color="textFaint" accessibilityElementsHidden>⌕</AppText>
          <TextInput
            accessibilityLabel="Search reports"
            placeholder="Search reports"
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
          />
        </View>
        <Pressable accessibilityRole="button" style={({ pressed, hovered }) => [styles.upload, (pressed || hovered) && styles.uploadActive]}>
          <AppText variant="label" color="textSecondary">Upload report</AppText>
        </Pressable>
      </View>

      <View style={styles.history}>
        {reportYears.map((year) => (
          <View key={year} style={styles.yearGroup}>
            <View style={styles.yearHeader}>
              <AppText variant="section" style={styles.year}>{year}</AppText>
              <View style={styles.yearRule} />
            </View>
            {reports.filter((report) => report.year === year).map((report) => (
              <Pressable
                key={report.id}
                accessibilityRole="button"
                accessibilityLabel={`Open ${report.filename} from ${report.date}`}
                style={({ pressed, hovered }) => [styles.reportRow, isCompact && styles.compactReportRow, (pressed || hovered) && styles.reportRowActive]}>
                <AppText variant="metadata" color="textSecondary" style={styles.date}>{report.dateLabel}</AppText>
                <View style={styles.reportDetails}>
                  <AppText variant="bodyStrong">{report.filename}</AppText>
                  <AppText variant="caption" color="textMuted">
                    {report.biomarkerCount} biomarkers
                    {report.needsAttention ? <AppText variant="caption" color="statusHigh"> · {report.needsAttention} outside range</AppText> : null}
                  </AppText>
                </View>
                <AppText variant="label" color="brand" style={styles.openCue}>Open →</AppText>
              </Pressable>
            ))}
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.lg },
  compactToolbar: { alignItems: 'stretch', flexDirection: 'column' },
  searchShell: { width: '100%', maxWidth: 420, minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radii.sm, backgroundColor: colors.surface },
  searchInput: { flex: 1, minHeight: 40, paddingVertical: 0, color: colors.textPrimary, fontFamily: 'System', fontSize: typography.body.fontSize },
  upload: { minHeight: 42, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radii.sm },
  uploadActive: { borderColor: colors.textPrimary, backgroundColor: colors.surfaceMuted },
  history: { gap: spacing.xxl }, yearGroup: { gap: spacing.md },
  yearHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  year: { fontVariant: ['tabular-nums'] }, yearRule: { flex: 1, height: 1, backgroundColor: colors.textPrimary },
  reportRow: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: spacing.xl, paddingVertical: spacing.lg, paddingHorizontal: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  compactReportRow: { alignItems: 'flex-start', flexWrap: 'wrap', gap: spacing.md },
  reportRowActive: { backgroundColor: colors.surfaceMuted },
  date: { width: 62, fontVariant: ['tabular-nums'] }, reportDetails: { flex: 1, minWidth: 180, gap: spacing.xs }, openCue: { textAlign: 'right' },
});
