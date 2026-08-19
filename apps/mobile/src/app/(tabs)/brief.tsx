import { useCallback, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import {
  ApiError,
  getDoctorVisitBrief,
  type BriefMeasurement,
  type BriefTrend,
  type DoctorVisitBriefResponse,
} from '@/api';
import { AppText } from '@/components/app-text';
import { PageHeader } from '@/components/page-header';
import { Screen } from '@/components/screen';
import { StatusBadge } from '@/components/status-badge';
import { useHealthDataRefresh } from '@/context/health-data-refresh-context';
import { useManualMeasurementDialog } from '@/context/manual-measurement-context';
import { useReportUploadDialog } from '@/context/report-upload-context';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';
import { colors, radii, spacing } from '@/theme';
import { formatFullDate, formatReference, formatSignedValue, formatValue } from '@/utils/formatting';

const VISIBLE_MEASUREMENT_LIMIT = 12;

export default function DoctorBriefScreen() {
  const router = useRouter();
  const { isCompact } = useResponsiveLayout();
  const { revision } = useHealthDataRefresh();
  const { openReportUpload } = useReportUploadDialog();
  const { openManualMeasurement } = useManualMeasurementDialog();
  const [brief, setBrief] = useState<DoctorVisitBriefResponse | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const requestId = useRef(0);
  const handledRevision = useRef(revision);

  const loadBrief = useCallback(async (refresh = false) => {
    const currentRequest = ++requestId.current;
    setError(null);
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const response = await getDoctorVisitBrief();
      if (requestId.current === currentRequest) setBrief(response);
    } catch (requestError) {
      if (requestId.current !== currentRequest) return;
      setError(requestError instanceof ApiError ? requestError : new ApiError({ message: 'Unable to load the doctor visit brief.', endpoint: '/dashboard/doctor-brief' }));
    } finally {
      if (requestId.current === currentRequest) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadBrief();
    return () => { requestId.current += 1; };
  }, [loadBrief]);

  useEffect(() => {
    if (handledRevision.current === revision) return;
    handledRevision.current = revision;
    void loadBrief(true);
  }, [loadBrief, revision]);

  if (loading && !brief) {
    return (
      <Screen>
        <PageHeader title="Doctor Visit Brief" description="Generated from your saved lab record." />
        <StatePanel><ActivityIndicator size="small" color={colors.brand} /><AppText color="textSecondary">Preparing your brief…</AppText></StatePanel>
      </Screen>
    );
  }

  if (error && !brief) {
    return (
      <Screen>
        <PageHeader title="Doctor Visit Brief" description="Generated from your saved lab record." />
        <StatePanel>
          <AppText variant="section">Unable to load your brief</AppText>
          <AppText color="textSecondary">We couldn’t reach MedInsight to prepare this brief right now.</AppText>
          <Action label="Try again" onPress={() => void loadBrief()} />
        </StatePanel>
      </Screen>
    );
  }

  if (!brief || brief.latest_measurements.length === 0) {
    return (
      <Screen>
        <PageHeader title="Doctor Visit Brief" description="Generated from your saved lab record." />
        <StatePanel>
          <AppText variant="title">Add laboratory measurements to create your doctor visit brief.</AppText>
          <AppText color="textSecondary">The brief will organize structured results for appointment preparation without diagnosing or assigning severity.</AppText>
          <View style={styles.actions}>
            <Action label="Upload report" onPress={openReportUpload} outlined />
            <Action label="Add measurement" onPress={openManualMeasurement} />
            <Action label="Refresh" onPress={() => void loadBrief(true)} />
          </View>
        </StatePanel>
      </Screen>
    );
  }

  const shownMeasurements = brief.latest_measurements.slice(0, VISIBLE_MEASUREMENT_LIMIT);

  return (
    <Screen>
      <View style={[styles.pageHeading, isCompact && styles.compactHeading]}>
        <PageHeader title="Doctor Visit Brief" description="A factual appointment-preparation view generated from your saved lab record." eyebrow="Appointment preparation" />
        <View style={styles.refreshBlock}>
          <AppText variant="caption" color="textMuted">Generated {formatFullDate(brief.generated_at)}</AppText>
          <Pressable accessibilityRole="button" accessibilityState={{ busy: refreshing, disabled: refreshing }} disabled={refreshing} onPress={() => void loadBrief(true)} style={({ pressed, hovered }) => [(pressed || hovered) && styles.active]}>
            {refreshing ? <ActivityIndicator size="small" color={colors.brand} /> : <AppText variant="label" color="brand">Refresh</AppText>}
          </Pressable>
        </View>
      </View>

      {error ? <View style={styles.refreshError}><AppText variant="caption" color="textSecondary">The latest brief could not be refreshed.</AppText><Action label="Try again" onPress={() => void loadBrief(true)} /></View> : null}

      <View style={styles.document}>
        <BriefSection number="01" title="Overview">
          <View style={[styles.overview, isCompact && styles.compactOverview]}>
            <OverviewFact label="Saved reports" value={String(brief.report_count)} />
            <OverviewFact label="Latest report" value={brief.latest_report_date ? formatFullDate(brief.latest_report_date) : 'Unavailable'} />
            <OverviewFact label="Latest biomarkers" value={String(brief.latest_measurements.length)} />
            <OverviewFact label="Outside supplied range" value={String(brief.needs_attention.length)} />
          </View>
          <View style={styles.rows}>
            {brief.recent_reports.map((report) => (
              <Pressable key={report.report_id} accessibilityRole="link" onPress={() => router.push('/reports')} style={({ pressed, hovered }) => [styles.row, (pressed || hovered) && styles.rowActive]}>
                <View style={styles.rowCopy}>
                  <AppText variant="label">Report from {formatFullDate(report.uploaded_at)}</AppText>
                  <AppText variant="caption" color="textMuted">{report.page_count} {report.page_count === 1 ? 'page' : 'pages'} · {report.biomarker_count} biomarkers{report.requires_ocr ? ' · OCR used' : ''}</AppText>
                </View>
                <AppText variant="label" color="brand">View →</AppText>
              </Pressable>
            ))}
          </View>
        </BriefSection>

        <BriefSection number="02" title="Outside Supplied Range">
          {brief.needs_attention.length ? brief.needs_attention.map((item) => <MeasurementRow key={item.normalized_name} item={item} onPress={() => router.push('/biomarkers')} />) : <EmptySection text="No latest measurements are outside their supplied reference ranges." />}
        </BriefSection>

        <BriefSection number="03" title="Changes Over Time">
          {brief.trend_summary.length ? brief.trend_summary.map((item) => <TrendRow key={item.normalized_name} item={item} onPress={() => router.push('/biomarkers')} />) : <EmptySection text="No increasing or decreasing comparable trends are available." />}
        </BriefSection>

        <BriefSection number="04" title="Latest Measurements">
          {shownMeasurements.map((item) => <MeasurementRow key={item.normalized_name} item={item} onPress={() => router.push('/biomarkers')} />)}
          {brief.latest_measurements.length > shownMeasurements.length ? <AppText variant="caption" color="textMuted">Showing {shownMeasurements.length} of {brief.latest_measurements.length} latest measurements. Open Biomarkers for the complete list.</AppText> : null}
        </BriefSection>

        <BriefSection number="05" title="Not Classified">
          {brief.unclassified_measurements.length ? brief.unclassified_measurements.map((item) => (
            <View key={item.normalized_name} style={styles.unclassified}>
              <MeasurementRow item={item} onPress={() => router.push('/biomarkers')} />
              <AppText variant="caption" color="textMuted">{item.reason}</AppText>
            </View>
          )) : <EmptySection text="All latest measurements had usable supplied reference information." />}
        </BriefSection>

        <BriefSection number="06" title="Questions to Discuss">
          {brief.questions_to_discuss.length ? brief.questions_to_discuss.map((question, index) => (
            <View key={question} style={styles.question}>
              <AppText variant="metadata" color="textMuted">{String(index + 1).padStart(2, '0')}</AppText>
              <AppText color="textSecondary" style={styles.questionCopy}>{question}</AppText>
            </View>
          )) : <EmptySection text="No factual discussion questions were generated from the current structured results." />}
        </BriefSection>

        <View style={styles.limitations}>
          <AppText variant="metadata" color="textMuted">Limitations</AppText>
          {brief.limitations.map((limitation) => <AppText key={limitation} variant="caption" color="textMuted">{limitation}</AppText>)}
        </View>
      </View>
    </Screen>
  );
}

function BriefSection({ number, title, children }: PropsWithChildren<{ number: string; title: string }>) {
  const { isCompact } = useResponsiveLayout();
  return <View style={[styles.section, isCompact && styles.compactSection]}><View style={[styles.sectionHeading, isCompact && styles.compactSectionHeading]}><AppText variant="metadata" color="textFaint">{number}</AppText><AppText variant="title">{title}</AppText></View><View style={styles.sectionContent}>{children}</View></View>;
}

function MeasurementRow({ item, onPress }: { item: BriefMeasurement; onPress: () => void }) {
  const { isCompact } = useResponsiveLayout();
  const reference = formatReference(item);
  return (
    <Pressable accessibilityRole="link" onPress={onPress} style={({ pressed, hovered }) => [styles.row, isCompact && styles.compactRow, (pressed || hovered) && styles.rowActive]}>
      <View style={styles.rowCopy}>
        <AppText variant="bodyStrong">{item.display_name}</AppText>
        <AppText variant="caption" color="textMuted">{formatFullDate(item.measurement_date)} · {item.source === 'manual' ? 'Manual entry' : 'Laboratory report'} · {reference ? `${item.source === 'manual' ? 'Entered reference' : 'Report reference'} ${reference}` : 'Reference unavailable'}</AppText>
      </View>
      <View style={[styles.valueBlock, isCompact && styles.compactValueBlock]}>
        <AppText variant="bodyStrong" style={styles.numeric}>{formatValue(item.value)} <AppText variant="caption" color="textMuted">{item.unit}</AppText></AppText>
        <StatusBadge status={item.status} source={item.source} />
      </View>
    </Pressable>
  );
}

function TrendRow({ item, onPress }: { item: BriefTrend; onPress: () => void }) {
  const { isCompact } = useResponsiveLayout();
  return (
    <Pressable accessibilityRole="link" onPress={onPress} style={({ pressed, hovered }) => [styles.row, isCompact && styles.compactRow, (pressed || hovered) && styles.rowActive]}>
      <View style={styles.rowCopy}>
        <AppText variant="bodyStrong">{item.display_name}</AppText>
        <AppText variant="caption" color="textMuted">{formatValue(item.first_value)} to {formatValue(item.latest_value)} {item.unit} · {formatFullDate(item.first_date)}–{formatFullDate(item.latest_date)}</AppText>
      </View>
      <View style={[styles.valueBlock, isCompact && styles.compactValueBlock]}>
        <AppText variant="label" color="textSecondary">{item.direction === 'increasing' ? 'Increasing ↑' : 'Decreasing ↓'}</AppText>
        <AppText variant="caption" color="textMuted">{formatSignedValue(item.absolute_change, ` ${item.unit}`)}</AppText>
      </View>
    </Pressable>
  );
}

function OverviewFact({ label, value }: { label: string; value: string }) {
  return <View style={styles.overviewFact}><AppText variant="metadata" color="textMuted">{label}</AppText><AppText variant="section" color="textSecondary">{value}</AppText></View>;
}

function EmptySection({ text }: { text: string }) {
  return <AppText color="textMuted" style={styles.emptyCopy}>{text}</AppText>;
}

function StatePanel({ children }: PropsWithChildren) {
  return <View style={styles.statePanel}>{children}</View>;
}

function Action({ label, onPress, outlined = false }: { label: string; onPress: () => void; outlined?: boolean }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed, hovered }) => [styles.action, outlined && styles.outlinedAction, (pressed || hovered) && styles.active]}><AppText variant="label" color={outlined ? 'textSecondary' : 'brand'}>{label}</AppText></Pressable>;
}

const styles = StyleSheet.create({
  pageHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.xl },
  compactHeading: { alignItems: 'flex-start', flexDirection: 'column', gap: 0 },
  refreshBlock: { alignItems: 'flex-end', gap: spacing.sm, paddingBottom: spacing.lg },
  document: { width: '100%', maxWidth: 1080, alignSelf: 'center', borderTopWidth: 3, borderTopColor: colors.textPrimary, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface },
  section: { flexDirection: 'row', gap: spacing.xxxl, paddingVertical: spacing.xxl, paddingHorizontal: spacing.xl, borderBottomWidth: 1, borderBottomColor: colors.border },
  compactSection: { flexDirection: 'column', gap: spacing.lg, padding: spacing.lg },
  sectionHeading: { width: 210, maxWidth: '28%', gap: spacing.sm },
  compactSectionHeading: { width: '100%', maxWidth: '100%', flexDirection: 'row', alignItems: 'baseline', gap: spacing.md },
  sectionContent: { flex: 1, minWidth: 0, gap: spacing.lg },
  overview: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xxl },
  compactOverview: { flexDirection: 'column', gap: spacing.lg },
  overviewFact: { minWidth: 130, gap: spacing.xs },
  rows: { gap: 0 },
  row: { minHeight: 68, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.xl, paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.borderSubtle },
  compactRow: { alignItems: 'flex-start', flexDirection: 'column', gap: spacing.sm },
  rowActive: { opacity: 0.68 },
  rowCopy: { flex: 1, minWidth: 180, gap: spacing.xs },
  valueBlock: { alignItems: 'flex-end', gap: spacing.xs },
  compactValueBlock: { width: '100%', alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between' },
  numeric: { fontVariant: ['tabular-nums'] },
  unclassified: { gap: spacing.xs },
  question: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.lg, paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.borderSubtle },
  questionCopy: { flex: 1 },
  limitations: { gap: spacing.sm, padding: spacing.xl, borderTopWidth: 1, borderTopColor: colors.borderStrong, backgroundColor: colors.surfaceSubtle },
  emptyCopy: { paddingVertical: spacing.md },
  statePanel: { minHeight: 180, alignItems: 'flex-start', justifyContent: 'center', gap: spacing.md, maxWidth: 720, paddingVertical: spacing.xxl, borderTopWidth: 2, borderTopColor: colors.textPrimary },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  action: { minHeight: 44, justifyContent: 'center' },
  outlinedAction: { paddingHorizontal: spacing.lg, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radii.sm },
  active: { opacity: 0.65 },
  refreshError: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.lg, padding: spacing.md, borderLeftWidth: 2, borderLeftColor: colors.statusLow, backgroundColor: colors.statusLowMuted },
});
