import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import type { BiomarkerResult, SavedReportDetail, SavedReportSummary } from '@/api';
import { AppText } from '@/components/app-text';
import { getBiomarkerStatusLabel, getStatusColor } from '@/components/status-utils';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';
import { colors, spacing } from '@/theme';
import { formatFullDate, formatValue } from '@/utils/formatting';

type ReportDetailPanelProps = {
  report: SavedReportSummary;
  detail?: SavedReportDetail;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
};

function referenceText(biomarker: BiomarkerResult) {
  const rawReference = biomarker.raw_reference.trim();
  if (rawReference) return rawReference;

  if (biomarker.reference_low !== null && biomarker.reference_high !== null) {
    return `${formatValue(biomarker.reference_low)}–${formatValue(biomarker.reference_high)}`;
  }

  if (biomarker.reference_operator) {
    const threshold = biomarker.reference_operator.startsWith('<')
      ? biomarker.reference_high
      : biomarker.reference_low;
    if (threshold !== null) return `${biomarker.reference_operator}${formatValue(threshold)}`;
  }

  return null;
}

export function ReportDetailPanel({ report, detail, loading, error, onRetry }: ReportDetailPanelProps) {
  const { isCompact } = useResponsiveLayout();

  if (loading) {
    return (
      <View style={[styles.panel, styles.message]} accessibilityLiveRegion="polite">
        <ActivityIndicator size="small" color={colors.brand} />
        <AppText variant="label" color="textSecondary">Loading {report.filename}</AppText>
      </View>
    );
  }

  if (error || !detail) {
    return (
      <View style={[styles.panel, styles.message]}>
        <View style={styles.messageCopy}>
          <AppText variant="section">Unable to open report details</AppText>
          <AppText variant="caption" color="textMuted">MedInsight could not retrieve this saved report.</AppText>
        </View>
        <Pressable accessibilityRole="button" onPress={onRetry} style={({ pressed, hovered }) => [(pressed || hovered) && styles.active]}>
          <AppText variant="label" color="brand">Try again</AppText>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.panel, isCompact && styles.compactPanel]}>
      <View style={styles.header}>
        <View style={styles.titleBlock}>
          <AppText variant="metadata" color="textMuted">Report Detail</AppText>
          <AppText variant="section">Laboratory report</AppText>
          <AppText variant="caption" color="textSecondary" selectable>{detail.filename}</AppText>
          <AppText variant="caption" color="textMuted">Uploaded {formatFullDate(detail.uploaded_at)}</AppText>
        </View>
        {detail.requires_ocr ? <AppText variant="metadata" color="textMuted">OCR source</AppText> : null}
      </View>

      <View style={styles.summary}>
        <SummaryItem label="Pages" value={String(detail.page_count)} />
        <SummaryItem label="Measurements" value={String(detail.biomarker_count)} />
        <SummaryItem label="Text source" value={detail.requires_ocr ? 'Recovered with OCR' : 'Machine-readable PDF'} />
      </View>

      <View style={styles.results}>
        <AppText variant="metadata" color="textMuted">Measurements</AppText>
        {detail.biomarkers.length ? detail.biomarkers.map((biomarker, index) => {
          const reference = referenceText(biomarker);
          const color = getStatusColor(biomarker.status);
          return (
            <View key={`${biomarker.normalized_name}-${index}`} style={[styles.biomarkerRow, isCompact && styles.compactBiomarkerRow]}>
              <View style={styles.biomarkerName}>
                <AppText variant="bodyStrong">{biomarker.test_name}</AppText>
                <AppText variant="caption" color="textMuted">{reference ? `Reference ${reference}` : 'Reference unavailable'}</AppText>
              </View>
              <View style={[styles.biomarkerValue, isCompact && styles.compactBiomarkerValue]}>
                <AppText variant="measurementSmall" style={styles.numeric}>{formatValue(biomarker.value)} <AppText variant="caption" color="textMuted">{biomarker.unit}</AppText></AppText>
                <AppText variant="metadata" style={{ color }}>{getBiomarkerStatusLabel(biomarker.status)}</AppText>
              </View>
            </View>
          );
        }) : (
          <AppText variant="caption" color="textMuted" style={styles.noResults}>No biomarkers were stored for this report.</AppText>
        )}
      </View>
    </View>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryItem}>
      <AppText variant="metadata" color="textFaint">{label}</AppText>
      <AppText variant="label" color="textSecondary">{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { marginTop: -1, marginLeft: spacing.xxl, paddingVertical: spacing.xl, paddingHorizontal: spacing.xl, gap: spacing.xl, borderLeftWidth: 1, borderBottomWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  compactPanel: { marginLeft: 0, paddingHorizontal: spacing.lg },
  message: { minHeight: 110, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' },
  messageCopy: { gap: spacing.xs }, active: { opacity: 0.65 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.lg },
  titleBlock: { minWidth: 0, flex: 1, gap: spacing.xs },
  summary: { flexDirection: 'row', flexWrap: 'wrap', borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border },
  summaryItem: { minWidth: 140, flexGrow: 1, gap: spacing.xs, paddingVertical: spacing.lg, paddingRight: spacing.xl },
  results: { gap: spacing.md },
  biomarkerRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: spacing.xl, paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.borderSubtle },
  compactBiomarkerRow: { alignItems: 'flex-start', flexDirection: 'column', gap: spacing.sm },
  biomarkerName: { flex: 1, minWidth: 180, gap: spacing.xxs }, biomarkerValue: { alignItems: 'flex-end', gap: spacing.xs },
  compactBiomarkerValue: { width: '100%', alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between' },
  numeric: { fontVariant: ['tabular-nums'] }, noResults: { paddingVertical: spacing.lg, borderTopWidth: 1, borderTopColor: colors.borderSubtle },
});
