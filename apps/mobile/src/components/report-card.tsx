import { Pressable, StyleSheet, View } from 'react-native';

import type { SavedReportSummary } from '@/api';
import { AppText } from '@/components/app-text';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';
import { colors, spacing } from '@/theme';
import { formatDayMonth, formatFullDate } from '@/utils/formatting';

type ReportRowProps = {
  report: SavedReportSummary;
  selected: boolean;
  onPress: () => void;
};

export function ReportRow({ report, selected, onPress }: ReportRowProps) {
  const { isCompact } = useResponsiveLayout();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${selected ? 'Close' : 'Open'} ${report.filename}, uploaded ${formatFullDate(report.uploaded_at)}`}
      accessibilityState={{ expanded: selected }}
      onPress={onPress}
      style={({ pressed, hovered }) => [
        styles.row,
        isCompact && styles.compactRow,
        selected && styles.selectedRow,
        (pressed || hovered) && styles.activeRow,
      ]}>
      <AppText variant="metadata" color="textSecondary" style={styles.date}>{formatDayMonth(report.uploaded_at)}</AppText>
      <View style={styles.details}>
        <AppText variant="bodyStrong" selectable>{report.filename}</AppText>
        <View style={styles.metadata}>
          <AppText variant="caption" color="textMuted">{report.biomarker_count} biomarkers</AppText>
          <AppText variant="caption" color="textMuted">{report.page_count} {report.page_count === 1 ? 'page' : 'pages'}</AppText>
          <AppText variant="caption" color="textMuted">Uploaded {formatFullDate(report.uploaded_at)}</AppText>
          {report.requires_ocr ? <AppText variant="caption" color="statusLow">Text review needed</AppText> : null}
        </View>
      </View>
      <AppText variant="label" color="brand" style={styles.openCue}>{selected ? 'Close ↑' : 'Open →'}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 82, flexDirection: 'row', alignItems: 'center', gap: spacing.xl, paddingVertical: spacing.lg, paddingHorizontal: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  compactRow: { alignItems: 'flex-start', flexWrap: 'wrap', gap: spacing.md },
  selectedRow: { backgroundColor: colors.surfaceSubtle }, activeRow: { backgroundColor: colors.surfaceMuted },
  date: { width: 62, fontVariant: ['tabular-nums'] }, details: { flex: 1, minWidth: 180, gap: spacing.xs },
  metadata: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: spacing.lg, rowGap: spacing.xs },
  openCue: { minWidth: 54, textAlign: 'right' },
});
