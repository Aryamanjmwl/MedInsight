import { getJson } from '@/api/client';
import type { SavedReportDetail, SavedReportSummary } from '@/api/types';

export function getReports() {
  return getJson<SavedReportSummary[]>('/reports');
}

export function getReport(reportId: number) {
  return getJson<SavedReportDetail>(`/reports/${encodeURIComponent(String(reportId))}`);
}
