import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ApiError, deleteReport, renameReport, type BiomarkerResult, type SavedReportDetail, type SavedReportSummary } from '@/api';
import { AppText } from '@/components/app-text';
import { getBiomarkerStatusLabel, getStatusColor } from '@/components/status-utils';
import { useHealthDataRefresh } from '@/context/health-data-refresh-context';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';
import { colors, radii, spacing, typography } from '@/theme';
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
  const { invalidateHealthData } = useHealthDataRefresh();
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState(report.filename);
  const [renameBusy, setRenameBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [deleted, setDeleted] = useState(false);

  useEffect(() => {
    setRenameValue(report.filename);
    setRenameOpen(false);
    setDeleteOpen(false);
    setMutationError(null);
    setDeleted(false);
  }, [report.id, report.filename]);

  const saveRename = async () => {
    const filename = renameValue.trim();
    if (!filename || renameBusy) return;
    setRenameBusy(true);
    setMutationError(null);
    try {
      await renameReport(report.id, { filename });
      setRenameOpen(false);
      invalidateHealthData();
    } catch (requestError) {
      setMutationError(requestError instanceof ApiError ? requestError.message : 'Unable to rename this report.');
    } finally {
      setRenameBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (deleteBusy) return;
    setDeleteBusy(true);
    setMutationError(null);
    try {
      await deleteReport(report.id);
      setDeleteOpen(false);
      setDeleted(true);
      invalidateHealthData();
    } catch (requestError) {
      setMutationError(requestError instanceof ApiError ? requestError.message : 'Unable to delete this report.');
    } finally {
      setDeleteBusy(false);
    }
  };

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

  if (deleted) {
    return (
      <View style={[styles.panel, styles.message]} accessibilityLiveRegion="polite">
        <View style={styles.messageCopy}>
          <AppText variant="section">Report deleted</AppText>
          <AppText variant="caption" color="textMuted">Its report-derived measurements were removed from your record.</AppText>
        </View>
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
        <View style={styles.headerActions}>
          {detail.requires_ocr ? <AppText variant="metadata" color="textMuted">OCR source</AppText> : null}
          <View style={styles.actionButtons}>
            <Pressable accessibilityRole="button" onPress={() => { setRenameValue(report.filename); setMutationError(null); setRenameOpen(true); }} style={({ pressed, hovered }) => [styles.actionButton, (pressed || hovered) && styles.active]}>
              <AppText variant="label" color="brand">Rename</AppText>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => { setMutationError(null); setDeleteOpen(true); }} style={({ pressed, hovered }) => [styles.actionButton, styles.dangerAction, (pressed || hovered) && styles.active]}>
              <AppText variant="label" color="statusHigh">Delete report</AppText>
            </Pressable>
          </View>
        </View>
      </View>

      {mutationError ? <AppText accessibilityLiveRegion="polite" variant="caption" color="statusHigh">{mutationError}</AppText> : null}

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
          <AppText variant="caption" color="textMuted" style={styles.noResults}>No biomarkers are stored for this report.</AppText>
        )}
      </View>

      <Modal animationType="fade" transparent visible={renameOpen} onRequestClose={() => { if (!renameBusy) setRenameOpen(false); }}>
        <View style={styles.modalBackdrop}>
          <View accessibilityViewIsModal style={styles.modalDialog}>
            <View style={styles.modalCopy}>
              <AppText variant="section">Rename report</AppText>
              <AppText variant="caption" color="textMuted">This changes only the saved report name. The original PDF bytes are not retained by MedInsight.</AppText>
            </View>
            <TextInput accessibilityLabel="Report name" autoCapitalize="none" autoCorrect={false} value={renameValue} onChangeText={setRenameValue} placeholder="Lab report.pdf" placeholderTextColor={colors.textFaint} style={styles.input} />
            {mutationError ? <AppText variant="caption" color="statusHigh">{mutationError}</AppText> : null}
            <View style={styles.modalActions}>
              <Pressable accessibilityRole="button" disabled={renameBusy} onPress={() => setRenameOpen(false)} style={({ pressed, hovered }) => [styles.secondaryAction, (pressed || hovered) && styles.active]}>
                <AppText variant="label">Cancel</AppText>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityState={{ busy: renameBusy, disabled: renameBusy || !renameValue.trim() }} disabled={renameBusy || !renameValue.trim()} onPress={() => void saveRename()} style={({ pressed, hovered }) => [styles.primaryAction, (pressed || hovered) && styles.active, (renameBusy || !renameValue.trim()) && styles.disabled]}>
                {renameBusy ? <ActivityIndicator size="small" color={colors.white} /> : <AppText variant="label" color="white">Save name</AppText>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal animationType="fade" transparent visible={deleteOpen} onRequestClose={() => { if (!deleteBusy) setDeleteOpen(false); }}>
        <View style={styles.modalBackdrop}>
          <View accessibilityViewIsModal style={styles.modalDialog}>
            <View style={styles.modalCopy}>
              <AppText variant="section">Delete report</AppText>
              <AppText color="textSecondary">Delete this saved report and all measurements extracted from it? Manual measurements are not affected. This cannot be undone.</AppText>
              {mutationError ? <AppText variant="caption" color="statusHigh">{mutationError}</AppText> : null}
            </View>
            <View style={styles.modalActions}>
              <Pressable accessibilityRole="button" disabled={deleteBusy} onPress={() => setDeleteOpen(false)} style={({ pressed, hovered }) => [styles.secondaryAction, (pressed || hovered) && styles.active]}>
                <AppText variant="label">Cancel</AppText>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityState={{ busy: deleteBusy, disabled: deleteBusy }} disabled={deleteBusy} onPress={() => void confirmDelete()} style={({ pressed, hovered }) => [styles.deleteAction, (pressed || hovered) && styles.active, deleteBusy && styles.disabled]}>
                {deleteBusy ? <ActivityIndicator size="small" color={colors.white} /> : <AppText variant="label" color="white">Delete permanently</AppText>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  messageCopy: { gap: spacing.xs }, active: { opacity: 0.65 }, disabled: { opacity: 0.5 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.lg },
  titleBlock: { minWidth: 0, flex: 1, gap: spacing.xs },
  headerActions: { alignItems: 'flex-end', gap: spacing.sm },
  actionButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  actionButton: { minHeight: 40, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radii.sm },
  dangerAction: { borderColor: colors.statusHigh },
  summary: { flexDirection: 'row', flexWrap: 'wrap', borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border },
  summaryItem: { minWidth: 140, flexGrow: 1, gap: spacing.xs, paddingVertical: spacing.lg, paddingRight: spacing.xl },
  results: { gap: spacing.md },
  biomarkerRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: spacing.xl, paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.borderSubtle },
  compactBiomarkerRow: { alignItems: 'flex-start', flexDirection: 'column', gap: spacing.sm },
  biomarkerName: { flex: 1, minWidth: 180, gap: spacing.xxs }, biomarkerValue: { alignItems: 'flex-end', gap: spacing.xs },
  compactBiomarkerValue: { width: '100%', alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between' },
  numeric: { fontVariant: ['tabular-nums'] }, noResults: { paddingVertical: spacing.lg, borderTopWidth: 1, borderTopColor: colors.borderSubtle },
  modalBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, backgroundColor: 'rgba(24, 36, 45, 0.42)' },
  modalDialog: { width: '100%', maxWidth: 480, gap: spacing.lg, padding: spacing.xl, borderTopWidth: 2, borderTopColor: colors.textPrimary, backgroundColor: colors.surface },
  modalCopy: { gap: spacing.sm },
  input: { minHeight: 44, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radii.sm, backgroundColor: colors.surfaceSubtle, color: colors.textPrimary, fontSize: typography.body.fontSize },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', gap: spacing.sm },
  secondaryAction: { minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg },
  primaryAction: { minWidth: 110, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg, borderRadius: radii.sm, backgroundColor: colors.brand },
  deleteAction: { minWidth: 150, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg, borderRadius: radii.sm, backgroundColor: colors.statusHigh },
});
