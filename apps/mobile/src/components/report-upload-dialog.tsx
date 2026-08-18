import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from 'react-native';

import type { ProcessAndSaveReportResponse } from '@/api';
import { AppText } from '@/components/app-text';
import type { ReportUploadPhase, SelectedReportFile } from '@/hooks/use-report-upload';
import { colors, radii, spacing } from '@/theme';
import { formatFileSize } from '@/utils/report-upload';

type ReportUploadDialogProps = {
  visible: boolean;
  phase: ReportUploadPhase;
  selectedFile: SelectedReportFile | null;
  result: ProcessAndSaveReportResponse | null;
  errorMessage: string | null;
  pickReport: () => Promise<void>;
  processReport: () => Promise<void>;
  reset: () => void;
  onClose: () => void;
};

export function ReportUploadDialog({ visible, phase, selectedFile, result, errorMessage, pickReport, processReport, onClose }: ReportUploadDialogProps) {
  const uploading = phase === 'uploading';
  const fileSize = formatFileSize(selectedFile?.size);

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View accessibilityViewIsModal style={styles.dialog}>
          <View style={styles.header}>
            <View style={styles.titleBlock}>
              <AppText variant="metadata" color="textMuted">Health Record</AppText>
              <AppText variant="title">Upload laboratory report</AppText>
            </View>
            {!uploading ? <Pressable accessibilityRole="button" accessibilityLabel="Close report upload" onPress={onClose} style={({ pressed, hovered }) => [styles.close, (pressed || hovered) && styles.active]}><AppText variant="section" color="textMuted">×</AppText></Pressable> : null}
          </View>

          {phase === 'idle' ? (
            <View style={styles.content}>
              <AppText color="textSecondary">Your report will be processed to extract structured laboratory measurements.</AppText>
              <View style={styles.selectorIntro}>
                <View style={styles.fileMark}><AppText variant="metadata" color="textSecondary">PDF</AppText></View>
                <View style={styles.fileCopy}><AppText variant="bodyStrong">Choose a PDF report</AppText><AppText variant="caption" color="textMuted">One file · Up to 10 MB</AppText></View>
              </View>
              <View style={styles.actions}>
                <PrimaryAction label="Choose PDF" onPress={() => void pickReport()} />
                <SecondaryAction label="Cancel" onPress={onClose} />
              </View>
            </View>
          ) : null}

          {(phase === 'selected' || (phase === 'error' && selectedFile)) && selectedFile ? (
            <View style={styles.content}>
              <FileSummary file={selectedFile} sizeLabel={fileSize} />
              {errorMessage ? <ErrorMessage message={errorMessage} /> : null}
              <AppText variant="caption" color="textMuted">The selected file is sent to your configured MedInsight backend for processing.</AppText>
              <View style={styles.actions}>
                <PrimaryAction label={phase === 'error' ? 'Try again' : 'Process report'} onPress={() => void processReport()} />
                <SecondaryAction label="Replace PDF" onPress={() => void pickReport()} />
                <SecondaryAction label="Cancel" onPress={onClose} />
              </View>
            </View>
          ) : null}

          {uploading ? (
            <View style={[styles.content, styles.progress]} accessibilityLiveRegion="polite">
              <ActivityIndicator size="small" color={colors.brand} />
              <View style={styles.progressCopy}>
                <AppText variant="section">Processing laboratory report</AppText>
                <AppText variant="caption" color="textMuted">Reading the document and extracting structured measurements. This can take a moment.</AppText>
              </View>
            </View>
          ) : null}

          {phase === 'success' && result ? (
            <View style={styles.content} accessibilityLiveRegion="polite">
              <View style={styles.successMark} />
              <AppText variant="title">Report processed</AppText>
              <AppText variant="bodyStrong" selectable>{result.result.filename}</AppText>
              {result.result.requires_ocr && result.result.biomarker_count === 0 && result.result.unparsed_line_count === 0 ? (
                <View style={styles.ocrNotice}>
                  <AppText variant="label" color="statusLow">OCR required</AppText>
                  <AppText variant="caption" color="textSecondary">OCR could not recover enough readable text from this report. It was saved without extracted biomarkers.</AppText>
                </View>
              ) : (
                <>
                  {result.result.ocr_used ? <AppText variant="caption" color="textSecondary">Text was recovered using OCR.</AppText> : null}
                  {result.result.biomarker_count > 0 ? (
                    <AppText color="textSecondary">{result.result.biomarker_count} {result.result.biomarker_count === 1 ? 'biomarker' : 'biomarkers'} extracted and saved to your health record.</AppText>
                  ) : (
                    <AppText color="textSecondary">The report was saved, but no supported biomarkers were extracted.</AppText>
                  )}
                </>
              )}
              <AppText variant="caption" color="textMuted">Saved report #{result.report_id} · {result.result.page_count} {result.result.page_count === 1 ? 'page' : 'pages'}</AppText>
              <View style={styles.actions}><PrimaryAction label="Done" onPress={onClose} /></View>
            </View>
          ) : null}

          {phase === 'error' && !selectedFile ? (
            <View style={styles.content} accessibilityLiveRegion="polite">
              <ErrorMessage message={errorMessage ?? 'Unable to prepare this report.'} />
              <View style={styles.actions}>
                <PrimaryAction label="Choose another PDF" onPress={() => void pickReport()} />
                <SecondaryAction label="Cancel" onPress={onClose} />
              </View>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

function FileSummary({ file, sizeLabel }: { file: SelectedReportFile; sizeLabel: string | null }) {
  return (
    <View style={styles.fileSummary}>
      <View style={styles.fileMark}><AppText variant="metadata" color="textSecondary">PDF</AppText></View>
      <View style={styles.fileCopy}>
        <AppText variant="bodyStrong" selectable style={styles.filename}>{file.name}</AppText>
        <AppText variant="caption" color="textMuted">{sizeLabel ?? 'File size unavailable'}</AppText>
      </View>
    </View>
  );
}

function ErrorMessage({ message }: { message: string }) {
  const normalized = message.toLocaleLowerCase('en-US');
  const title = normalized.includes('larger') || normalized.includes('limit')
    ? 'File too large'
    : normalized.includes('unsupported') || normalized.includes('choose a pdf')
      ? 'Unsupported file'
      : normalized.includes('could not be processed')
        ? 'PDF unreadable'
        : normalized.includes('ocr')
          ? 'OCR unavailable'
          : normalized.includes('session')
            ? 'Session expired'
            : normalized.includes('reach') || normalized.includes('network')
              ? 'Network unavailable'
              : 'Processing failed';
  return <View style={styles.error}><AppText variant="label" color="statusHigh">{title}</AppText><AppText variant="caption" color="textSecondary">{message}</AppText></View>;
}

function PrimaryAction({ label, onPress }: { label: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed, hovered }) => [styles.primaryAction, (pressed || hovered) && styles.primaryActive]}><AppText variant="label" style={styles.primaryText}>{label}</AppText></Pressable>;
}

function SecondaryAction({ label, onPress }: { label: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed, hovered }) => [styles.secondaryAction, (pressed || hovered) && styles.active]}><AppText variant="label" color="textSecondary">{label}</AppText></Pressable>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, backgroundColor: 'rgba(24, 36, 45, 0.42)' },
  dialog: { width: '100%', maxWidth: 540, maxHeight: '92%', padding: spacing.xl, gap: spacing.xl, borderTopWidth: 3, borderTopColor: colors.textPrimary, borderRadius: radii.sm, backgroundColor: colors.surface },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.lg }, titleBlock: { flex: 1, minWidth: 0, gap: spacing.xs },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, active: { opacity: 0.65 },
  content: { gap: spacing.lg }, progress: { minHeight: 130, flexDirection: 'row', alignItems: 'center' }, progressCopy: { flex: 1, minWidth: 0, gap: spacing.xs },
  actions: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.md },
  primaryAction: { minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg, borderRadius: radii.sm, backgroundColor: colors.brand },
  primaryActive: { backgroundColor: colors.brandStrong }, primaryText: { color: colors.white },
  secondaryAction: { minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md },
  selectorIntro: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl, paddingHorizontal: spacing.lg, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSubtle },
  fileSummary: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl, paddingHorizontal: spacing.lg, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSubtle },
  fileMark: { width: 42, height: 46, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radii.xs, backgroundColor: colors.surface },
  fileCopy: { flex: 1, minWidth: 0, gap: spacing.xs }, filename: { flexShrink: 1 },
  error: { gap: spacing.xs, padding: spacing.md, borderLeftWidth: 2, borderLeftColor: colors.statusHigh, backgroundColor: colors.statusHighMuted },
  successMark: { width: 48, height: 3, backgroundColor: colors.brand },
  ocrNotice: { gap: spacing.xs, padding: spacing.md, borderLeftWidth: 2, borderLeftColor: colors.statusLow, backgroundColor: colors.statusLowMuted },
});
