import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ApiError, getDashboardSummary, getReports, type DashboardSummaryResponse, type SavedReportSummary } from '@/api';
import { BiomarkerExplorer } from '@/components/biomarker-explorer';
import { DashboardEmptyState, DashboardErrorState, DashboardLoadingState, DashboardRefreshError } from '@/components/dashboard-request-states';
import { HealthTimeline } from '@/components/health-timeline';
import { LatestMeasurements } from '@/components/latest-measurements';
import { LatestReportPanel } from '@/components/latest-report-panel';
import { NeedsAttention } from '@/components/needs-attention';
import { RecordHeader } from '@/components/record-header';
import { Screen } from '@/components/screen';
import { useHealthDataRefresh } from '@/context/health-data-refresh-context';
import { useReportUploadDialog } from '@/context/report-upload-context';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';
import { layout, spacing } from '@/theme';

export default function DashboardScreen() {
  const { isDesktop } = useResponsiveLayout();
  const { revision } = useHealthDataRefresh();
  const { openReportUpload } = useReportUploadDialog();
  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);
  const [reports, setReports] = useState<SavedReportSummary[]>([]);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const requestId = useRef(0);
  const handledRevision = useRef(revision);

  const loadDashboard = useCallback(async (refresh = false) => {
    const currentRequest = ++requestId.current;
    setError(null);
    if (refresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [response, reportHistory] = await Promise.all([
        getDashboardSummary(),
        getReports().catch(() => []),
      ]);
      if (requestId.current === currentRequest) {
        setSummary(response);
        setReports(reportHistory);
      }
    } catch (requestError) {
      if (requestId.current !== currentRequest) return;
      setError(requestError instanceof ApiError ? requestError : new ApiError({ message: 'Unable to load dashboard data.', endpoint: '/dashboard/summary' }));
    } finally {
      if (requestId.current === currentRequest) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
    return () => { requestId.current += 1; };
  }, [loadDashboard]);

  useEffect(() => {
    if (handledRevision.current === revision) return;
    handledRevision.current = revision;
    void loadDashboard(true);
  }, [loadDashboard, revision]);

  if (loading && !summary) {
    return <Screen><DashboardLoadingState /></Screen>;
  }

  if (error && !summary) {
    return <Screen><DashboardErrorState onRetry={() => void loadDashboard()} /></Screen>;
  }

  if (!summary || summary.total_reports === 0 || summary.latest_report_date === null) {
    return (
      <Screen>
        <DashboardEmptyState
          onUpload={openReportUpload}
          onRefresh={() => void loadDashboard(true)}
          refreshing={refreshing}
          refreshFailed={error !== null}
        />
      </Screen>
    );
  }

  const attentionBiomarkers = summary.latest_biomarkers.filter(({ latest_status }) => latest_status === 'high' || latest_status === 'low');
  const latestBiomarkers = summary.latest_biomarkers.slice(0, 5);

  return (
    <Screen>
      <RecordHeader
        latestReportDate={summary.latest_report_date}
        reportCount={summary.total_reports}
        biomarkerCount={summary.total_distinct_biomarkers}
        refreshing={refreshing}
        onRefresh={() => void loadDashboard(true)}
        onUpload={openReportUpload}
      />
      {error ? <DashboardRefreshError onRetry={() => void loadDashboard(true)} /> : null}
      {isDesktop ? (
        <View style={styles.desktopGrid}>
          <View style={styles.mainColumn}>
            <LatestReportPanel summary={summary} report={reports[0]} />
            <BiomarkerExplorer trends={summary.trends} biomarkers={summary.latest_biomarkers} />
            {reports.length ? <HealthTimeline reports={reports.slice(0, 5)} /> : null}
          </View>
          <View style={styles.supportingRail}>
            <NeedsAttention biomarkers={attentionBiomarkers.slice(0, 3)} totalCount={summary.abnormal_biomarker_count} />
            <LatestMeasurements biomarkers={latestBiomarkers} trends={summary.trends} />
          </View>
        </View>
      ) : (
        <View style={styles.mobileFlow}>
          <LatestReportPanel summary={summary} report={reports[0]} />
          <BiomarkerExplorer trends={summary.trends} biomarkers={summary.latest_biomarkers} />
          <NeedsAttention biomarkers={attentionBiomarkers.slice(0, 3)} totalCount={summary.abnormal_biomarker_count} />
          <LatestMeasurements biomarkers={latestBiomarkers} trends={summary.trends} />
          {reports.length ? <HealthTimeline reports={reports.slice(0, 5)} /> : null}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  desktopGrid: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xxxl },
  mainColumn: { flex: 1, minWidth: 0, gap: spacing.xxl },
  supportingRail: { width: layout.supportingRailWidth, maxWidth: '100%', gap: spacing.xxl },
  mobileFlow: { width: '100%', minWidth: 0, gap: spacing.xxl },
});
