import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { ApiError, getReport, getReports, type SavedReportDetail, type SavedReportSummary } from '@/api';
import { AppText } from '@/components/app-text';
import { PageHeader } from '@/components/page-header';
import { ReportRow } from '@/components/report-card';
import { ReportDetailPanel } from '@/components/report-detail-panel';
import { NoMatchingReports, ReportsEmptyState, ReportsErrorState, ReportsLoadingState, ReportsRefreshError } from '@/components/reports-request-states';
import { Screen } from '@/components/screen';
import { useHealthDataRefresh } from '@/context/health-data-refresh-context';
import { useReportUploadDialog } from '@/context/report-upload-context';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';
import { colors, radii, spacing, typography } from '@/theme';
import { formatYear } from '@/utils/formatting';

type ReportYearGroup = { year: string; reports: SavedReportSummary[] };

function groupReportsByYear(reports: SavedReportSummary[]): ReportYearGroup[] {
  const groups = new Map<string, SavedReportSummary[]>();
  reports.forEach((report) => {
    const year = formatYear(report.uploaded_at);
    groups.set(year, [...(groups.get(year) ?? []), report]);
  });
  return [...groups].map(([year, groupedReports]) => ({ year, reports: groupedReports }));
}

export default function ReportsScreen() {
  const { isCompact, isDesktop } = useResponsiveLayout();
  const { revision } = useHealthDataRefresh();
  const { openReportUpload } = useReportUploadDialog();
  const [reports, setReports] = useState<SavedReportSummary[] | null>(null);
  const [listError, setListError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
  const [details, setDetails] = useState<Record<number, SavedReportDetail>>({});
  const [detailLoadingId, setDetailLoadingId] = useState<number | null>(null);
  const [detailErrorId, setDetailErrorId] = useState<number | null>(null);
  const listRequestId = useRef(0);
  const detailRequestId = useRef(0);
  const selectedReportIdRef = useRef<number | null>(null);
  const handledRevision = useRef(revision);

  const loadReports = useCallback(async (refresh = false) => {
    const currentRequest = ++listRequestId.current;
    setListError(null);
    if (refresh) setRefreshing(true);
    else setLoading(true);

    try {
      const response = await getReports();
      if (currentRequest !== listRequestId.current) return;
      setReports(response);

      const selectedId = selectedReportIdRef.current;
      if (selectedId !== null && !response.some(({ id }) => id === selectedId)) {
        detailRequestId.current += 1;
        selectedReportIdRef.current = null;
        setSelectedReportId(null);
        setDetailLoadingId(null);
        setDetailErrorId(null);
      }
    } catch (requestError) {
      if (currentRequest !== listRequestId.current) return;
      setListError(requestError instanceof ApiError ? requestError : new ApiError({ message: 'Unable to load reports.', endpoint: '/reports' }));
    } finally {
      if (currentRequest === listRequestId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  const loadReportDetail = useCallback(async (reportId: number) => {
    const currentRequest = ++detailRequestId.current;
    setDetailLoadingId(reportId);
    setDetailErrorId(null);

    try {
      const response = await getReport(reportId);
      if (currentRequest !== detailRequestId.current) return;
      setDetails((current) => ({ ...current, [reportId]: response }));
    } catch {
      if (currentRequest === detailRequestId.current) setDetailErrorId(reportId);
    } finally {
      if (currentRequest === detailRequestId.current) setDetailLoadingId(null);
    }
  }, []);

  useEffect(() => {
    void loadReports();
    return () => {
      listRequestId.current += 1;
      detailRequestId.current += 1;
    };
  }, [loadReports]);

  useEffect(() => {
    if (handledRevision.current === revision) return;
    handledRevision.current = revision;
    void loadReports(true);
  }, [loadReports, revision]);

  const selectReport = (reportId: number) => {
    if (selectedReportIdRef.current === reportId) {
      detailRequestId.current += 1;
      selectedReportIdRef.current = null;
      setSelectedReportId(null);
      setDetailLoadingId(null);
      setDetailErrorId(null);
      return;
    }

    selectedReportIdRef.current = reportId;
    setSelectedReportId(reportId);
    setDetailErrorId(null);
    if (details[reportId]) {
      detailRequestId.current += 1;
      setDetailLoadingId(null);
    } else {
      void loadReportDetail(reportId);
    }
  };

  const filteredReports = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('en-US');
    if (!query) return reports ?? [];
    return (reports ?? []).filter(({ filename }) => filename.toLocaleLowerCase('en-US').includes(query));
  }, [reports, search]);
  const reportGroups = useMemo(() => groupReportsByYear(filteredReports), [filteredReports]);

  return (
    <Screen>
      <PageHeader title="Reports" description="Your laboratory reports over time." eyebrow="Personal medical archive" />
      <View style={[styles.toolbar, isCompact && styles.compactToolbar]}>
        <View style={[styles.searchShell, isCompact && styles.compactSearchShell]}>
          <Feather accessibilityElementsHidden color={colors.textMuted} name="search" size={17} />
          <TextInput
            accessibilityLabel="Search reports by filename"
            autoCapitalize="none"
            autoCorrect={false}
            editable={reports !== null && reports.length > 0}
            onChangeText={setSearch}
            placeholder="Search report filenames"
            placeholderTextColor={colors.textMuted}
            value={search}
            style={styles.searchInput}
          />
          {search ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Clear report search" onPress={() => setSearch('')} style={styles.clearSearch}>
              <Feather color={colors.textMuted} name="x" size={17} />
            </Pressable>
          ) : null}
        </View>
        <View style={styles.toolbarActions}>
          <Pressable accessibilityRole="button" accessibilityState={{ busy: refreshing, disabled: refreshing }} disabled={refreshing} onPress={() => void loadReports(true)} style={({ pressed, hovered }) => [styles.refresh, (pressed || hovered) && styles.controlActive]}>
            {refreshing ? <ActivityIndicator size="small" color={colors.brand} /> : <AppText variant="label" color="brand">Refresh</AppText>}
          </Pressable>
          {!isDesktop ? (
            <Pressable accessibilityRole="button" onPress={openReportUpload} style={({ pressed, hovered }) => [styles.upload, (pressed || hovered) && styles.controlActive]}>
              <AppText variant="label" color="white">Upload report</AppText>
            </Pressable>
          ) : null}
        </View>
      </View>

      {loading && reports === null ? <ReportsLoadingState /> : null}
      {listError && reports === null ? <ReportsErrorState onRetry={() => void loadReports()} /> : null}
      {reports?.length === 0 ? <ReportsEmptyState refreshing={refreshing} refreshFailed={listError !== null} onUpload={openReportUpload} onRefresh={() => void loadReports(true)} /> : null}
      {reports && reports.length > 0 ? (
        <View style={styles.history}>
          {listError ? <ReportsRefreshError onRetry={() => void loadReports(true)} /> : null}
          {filteredReports.length === 0 ? <NoMatchingReports /> : reportGroups.map(({ year, reports: yearReports }) => (
            <View key={year} style={styles.yearGroup}>
              <View style={styles.yearHeader}>
                <AppText variant="section" style={styles.year}>{year}</AppText>
                <View style={styles.yearRule} />
              </View>
              {yearReports.map((report) => (
                <Fragment key={report.id}>
                  <ReportRow report={report} selected={selectedReportId === report.id} onPress={() => selectReport(report.id)} />
                  {selectedReportId === report.id ? (
                    <ReportDetailPanel
                      report={report}
                      detail={details[report.id]}
                      loading={detailLoadingId === report.id}
                      error={detailErrorId === report.id}
                      onRetry={() => void loadReportDetail(report.id)}
                    />
                  ) : null}
                </Fragment>
              ))}
            </View>
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.xl, paddingBottom: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.borderStrong },
  compactToolbar: { alignItems: 'stretch', flexDirection: 'column' },
  searchShell: { width: '100%', maxWidth: 340, minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: radii.sm, backgroundColor: colors.surfaceSubtle },
  compactSearchShell: { maxWidth: '100%' },
  searchInput: { flex: 1, minHeight: 44, paddingVertical: 0, color: colors.textPrimary, fontFamily: 'System', fontSize: typography.body.fontSize },
  clearSearch: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: -spacing.md },
  toolbarActions: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.md },
  refresh: { minWidth: 58, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  upload: { minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg, borderRadius: radii.sm, backgroundColor: colors.brand },
  controlActive: { borderColor: colors.textPrimary, opacity: 0.68 },
  history: { gap: spacing.xxxl }, yearGroup: { gap: spacing.sm },
  yearHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  year: { fontVariant: ['tabular-nums'] }, yearRule: { flex: 1, height: 1, backgroundColor: colors.textPrimary },
});
