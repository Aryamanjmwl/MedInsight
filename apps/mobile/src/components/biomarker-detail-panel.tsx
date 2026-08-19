import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from 'react-native';

import { ApiError, deleteManualMeasurement, explainBiomarker, type BiomarkerExplanation, type BiomarkerHistoryItem, type BiomarkerHistoryResponse, type BiomarkerOverview, type TrendResult } from '@/api';
import { AppText } from '@/components/app-text';
import { BiomarkerExplanationPanel } from '@/components/biomarker-explanation-panel';
import { getBiomarkerStatusLabel, getStatusColor } from '@/components/status-utils';
import { TrendTrack } from '@/components/trend-track';
import { useHealthDataRefresh } from '@/context/health-data-refresh-context';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';
import { colors, spacing } from '@/theme';
import { formatDayMonth, formatFullDate, formatReference, formatSignedValue, formatValue, getTrendArrow } from '@/utils/formatting';

type BiomarkerDetailPanelProps = {
  biomarker: BiomarkerOverview;
  history?: BiomarkerHistoryResponse;
  trend?: TrendResult;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
};

export function BiomarkerDetailPanel({ biomarker, history, trend, loading, error, onRetry }: BiomarkerDetailPanelProps) {
  const { isCompact } = useResponsiveLayout();
  const { invalidateHealthData } = useHealthDataRefresh();
  const [explanation, setExplanation] = useState<BiomarkerExplanation | null>(null);
  const [explanationLoading, setExplanationLoading] = useState(false);
  const [explanationError, setExplanationError] = useState<ApiError | null>(null);
  const explanationRequestId = useRef(0);
  const [pendingDelete, setPendingDelete] = useState<BiomarkerHistoryItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    explanationRequestId.current += 1;
    setExplanation(null);
    setExplanationLoading(false);
    setExplanationError(null);
    setPendingDelete(null);
    setDeleteLoading(false);
    setDeleteError(null);
  }, [biomarker.normalized_name]);

  const confirmDelete = async () => {
    if (!pendingDelete || deleteLoading) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await deleteManualMeasurement(pendingDelete.measurement_id);
      setPendingDelete(null);
      invalidateHealthData();
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        setDeleteError('Your session has expired. Please sign in again.');
      } else if (requestError instanceof ApiError && requestError.status === 404) {
        setDeleteError('This manual measurement is no longer available.');
      } else if (requestError instanceof ApiError) {
        setDeleteError(requestError.message);
      } else {
        setDeleteError('The measurement could not be deleted. Please try again.');
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  const requestExplanation = async () => {
    const currentRequest = ++explanationRequestId.current;
    setExplanationLoading(true);
    setExplanationError(null);
    try {
      const response = await explainBiomarker(biomarker.normalized_name);
      if (currentRequest === explanationRequestId.current) setExplanation(response);
    } catch (requestError) {
      if (currentRequest !== explanationRequestId.current) return;
      setExplanationError(
        requestError instanceof ApiError
          ? requestError
          : new ApiError({ message: 'Unable to load an explanation.', endpoint: `/biomarkers/${biomarker.normalized_name}/explain` }),
      );
    } finally {
      if (currentRequest === explanationRequestId.current) setExplanationLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.panel, styles.message]} accessibilityLiveRegion="polite">
        <ActivityIndicator size="small" color={colors.brand} />
        <AppText variant="label" color="textSecondary">Loading {biomarker.test_name} history</AppText>
      </View>
    );
  }

  if (error || !history || !trend) {
    return (
      <View style={[styles.panel, styles.message]}>
        <View style={styles.messageCopy}>
          <AppText variant="section">Unable to load biomarker history</AppText>
          <AppText variant="caption" color="textMuted">MedInsight could not retrieve this biomarker’s measurements.</AppText>
        </View>
        <Pressable accessibilityRole="button" onPress={onRetry} style={({ pressed, hovered }) => [(pressed || hovered) && styles.active]}>
          <AppText variant="label" color="brand">Try again</AppText>
        </Pressable>
      </View>
    );
  }

  const statusColor = getStatusColor(biomarker.latest_status);
  const mixedUnits = !trend.comparable_units || trend.issue === 'mixed_units';
  const insufficient = trend.direction === 'insufficient_data' || trend.measurement_count < 2;
  const chartUnit = trend.unit ?? history.history[0]?.unit;
  const latestHistoryItem = history.history.at(-1);
  const latestReference = latestHistoryItem ? formatReference(latestHistoryItem) : null;
  const chartPoints = history.history.map((item, index) => ({
    key: `${item.measurement_id}-${index}`,
    label: formatDayMonth(item.uploaded_at),
    value: item.value,
  }));

  return (
    <View style={styles.panel}>
      <View style={[styles.header, isCompact && styles.compactHeader]}>
        <View style={styles.titleBlock}>
          <AppText variant="metadata" color="textMuted">Biomarker History</AppText>
          <AppText variant="section">{biomarker.test_name}</AppText>
          <AppText variant="caption" color="textMuted">Latest measurement · {formatFullDate(biomarker.latest_report_date)}</AppText>
        </View>
        <View style={[styles.latest, isCompact && styles.compactLatest]}>
          <AppText variant="measurement" style={[styles.numeric, { color: biomarker.latest_status === 'normal' || biomarker.latest_status === 'unknown' ? colors.textPrimary : statusColor }]}>
            {formatValue(biomarker.latest_value)} <AppText color="textMuted">{biomarker.latest_unit}</AppText>
          </AppText>
          <AppText variant="metadata" style={{ color: statusColor }}>{getBiomarkerStatusLabel(biomarker.latest_status, biomarker.latest_source)}</AppText>
          <AppText variant="caption" color="textMuted">{biomarker.measurement_count} recorded {biomarker.measurement_count === 1 ? 'measurement' : 'measurements'}</AppText>
        </View>
      </View>

      <View style={styles.referenceBlock}>
        <AppText variant="metadata" color="textFaint">{latestHistoryItem?.source === 'manual' ? 'Reference Entered' : 'Latest Report Reference'}</AppText>
        <AppText variant="bodyStrong" color="textSecondary">{latestReference ?? (latestHistoryItem?.source === 'manual' ? 'No reference entered' : 'Not available in the report')}{latestReference ? ` ${biomarker.latest_unit}` : ''}</AppText>
      </View>

      <View style={styles.trendSection}>
        <AppText variant="metadata" color="textMuted">Mathematical Trend</AppText>
        {mixedUnits ? (
          <View style={styles.notice}>
            <AppText variant="section">Trend unavailable because recorded units differ.</AppText>
            <AppText variant="caption" color="textMuted">The individual measurements remain listed below in their stored units.</AppText>
          </View>
        ) : insufficient ? (
          <View style={styles.notice}>
            <AppText variant="section">More measurements are needed before a trend can be calculated.</AppText>
            <AppText variant="caption" color="textMuted">{trend.measurement_count} {trend.measurement_count === 1 ? 'measurement' : 'measurements'} recorded.</AppText>
          </View>
        ) : (
          <View style={styles.trendSummary}>
            <View style={styles.direction}>
              <AppText variant="title" color="textSecondary">{getTrendArrow(trend.direction)} {trend.direction.replace('_', ' ')}</AppText>
              <AppText variant="caption" color="textMuted">Direction is mathematical only, not a medical interpretation.</AppText>
            </View>
            <View style={styles.metrics}>
              <Metric label="First" value={trend.first_value === null ? '—' : `${formatValue(trend.first_value)} ${trend.unit ?? ''}`} detail={trend.first_date ? formatFullDate(trend.first_date) : undefined} />
              <Metric label="Latest" value={trend.latest_value === null ? '—' : `${formatValue(trend.latest_value)} ${trend.unit ?? ''}`} detail={trend.latest_date ? formatFullDate(trend.latest_date) : undefined} />
              <Metric label="Absolute change" value={trend.absolute_change === null ? '—' : formatSignedValue(trend.absolute_change, trend.unit ? ` ${trend.unit}` : '')} />
              <Metric label="Percent change" value={trend.percent_change === null ? '—' : formatSignedValue(trend.percent_change, '%')} />
            </View>
          </View>
        )}

        {!mixedUnits && chartPoints.length > 0 && chartUnit ? <TrendTrack points={chartPoints} unit={chartUnit} color={colors.brand} maxVisibleLabels={isCompact ? 4 : 6} /> : null}
      </View>

      <BiomarkerExplanationPanel
        explanation={explanation}
        loading={explanationLoading}
        error={explanationError}
        onRequest={() => void requestExplanation()}
      />

      <View style={styles.historySection}>
        <View style={styles.historyHeading}>
          <AppText variant="metadata" color="textMuted">Measurements</AppText>
          <AppText variant="caption" color="textMuted">{history.count} total</AppText>
        </View>
        {history.history.length ? history.history.map((item) => {
          const itemStatusColor = getStatusColor(item.status);
          const reference = formatReference(item);
          return (
            <View key={item.measurement_id} style={[styles.historyRow, isCompact && styles.compactHistoryRow]}>
              <View style={styles.historyContext}>
                <AppText variant="label">{formatFullDate(item.uploaded_at)}</AppText>
                <AppText variant="caption" color="textMuted">{item.source === 'manual' ? 'Manual entry' : 'Laboratory report'} · {reference ? `${item.source === 'manual' ? 'Entered reference' : 'Report reference'} ${reference}` : 'Reference unavailable'}</AppText>
              </View>
              <View style={[styles.historyValue, isCompact && styles.compactHistoryValue]}>
                <AppText variant="bodyStrong" style={styles.numeric}>{formatValue(item.value)} <AppText variant="caption" color="textMuted">{item.unit}</AppText></AppText>
                <AppText variant="metadata" style={{ color: itemStatusColor }}>{getBiomarkerStatusLabel(item.status, item.source)}</AppText>
                {item.source === 'manual' ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      setDeleteError(null);
                      setPendingDelete(item);
                    }}
                    style={({ pressed, hovered }) => [(pressed || hovered) && styles.active]}>
                    <AppText variant="caption" color="textMuted">Delete measurement</AppText>
                  </Pressable>
                ) : null}
              </View>
            </View>
          );
        }) : <AppText variant="caption" color="textMuted" style={styles.noHistory}>No stored measurements are available.</AppText>}
      </View>

      <Modal
        animationType="fade"
        transparent
        visible={pendingDelete !== null}
        onRequestClose={() => {
          if (!deleteLoading) setPendingDelete(null);
        }}>
        <View style={styles.confirmBackdrop}>
          <View accessibilityViewIsModal style={styles.confirmDialog}>
            <View style={styles.confirmCopy}>
              <AppText variant="section">Delete measurement</AppText>
              <AppText color="textSecondary">Delete this manually entered measurement? This cannot be undone.</AppText>
              {deleteError ? <AppText variant="caption" color="statusHigh">{deleteError}</AppText> : null}
            </View>
            <View style={styles.confirmActions}>
              <Pressable accessibilityRole="button" disabled={deleteLoading} onPress={() => setPendingDelete(null)} style={({ pressed, hovered }) => [styles.confirmAction, (pressed || hovered) && !deleteLoading && styles.active]}>
                <AppText variant="label" color="textSecondary">Cancel</AppText>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityState={{ busy: deleteLoading, disabled: deleteLoading }} disabled={deleteLoading} onPress={() => void confirmDelete()} style={({ pressed, hovered }) => [styles.deleteAction, deleteLoading && styles.disabled, (pressed || hovered) && !deleteLoading && styles.active]}>
                {deleteLoading ? <ActivityIndicator size="small" color={colors.white} /> : <AppText variant="label" color="white">Delete</AppText>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <View style={styles.metric}>
      <AppText variant="metadata" color="textFaint">{label}</AppText>
      <AppText variant="label" color="textSecondary" style={styles.numeric}>{value}</AppText>
      {detail ? <AppText variant="caption" color="textMuted">{detail}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { padding: spacing.xl, gap: spacing.xl, borderTopWidth: 2, borderTopColor: colors.textPrimary, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface },
  message: { minHeight: 120, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }, messageCopy: { gap: spacing.xs }, active: { opacity: 0.65 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.xl }, compactHeader: { flexDirection: 'column' },
  titleBlock: { flex: 1, minWidth: 0, gap: spacing.xs }, latest: { alignItems: 'flex-end', gap: spacing.xs }, compactLatest: { alignItems: 'flex-start' }, numeric: { fontVariant: ['tabular-nums'] },
  referenceBlock: { gap: spacing.xs, paddingVertical: spacing.md, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.borderSubtle },
  trendSection: { gap: spacing.md, paddingVertical: spacing.lg, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border },
  notice: { gap: spacing.xs, paddingVertical: spacing.lg }, trendSummary: { gap: spacing.lg }, direction: { gap: spacing.xs },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg }, metric: { minWidth: 140, flex: 1, gap: spacing.xs },
  historySection: { gap: spacing.md }, historyHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  historyRow: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: spacing.xl, paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.borderSubtle },
  compactHistoryRow: { alignItems: 'flex-start', flexDirection: 'column', gap: spacing.sm }, historyContext: { flex: 1, minWidth: 180, gap: spacing.xxs },
  historyValue: { alignItems: 'flex-end', gap: spacing.xs }, compactHistoryValue: { width: '100%', alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between' },
  noHistory: { paddingVertical: spacing.lg, borderTopWidth: 1, borderTopColor: colors.borderSubtle },
  confirmBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, backgroundColor: 'rgba(24, 36, 45, 0.42)' },
  confirmDialog: { width: '100%', maxWidth: 440, gap: spacing.lg, padding: spacing.xl, borderTopWidth: 2, borderTopColor: colors.textPrimary, backgroundColor: colors.surface },
  confirmCopy: { gap: spacing.sm }, confirmActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: spacing.md },
  confirmAction: { minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md },
  deleteAction: { minWidth: 90, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg, backgroundColor: colors.textPrimary },
  disabled: { opacity: 0.55 },
});
