import { deleteJson, getJson, postFormData, putJsonBody } from '@/api/client';
import type { ProcessAndSaveReportResponse, ReportDeleteResponse, ReportRenameRequest, SavedReportDetail, SavedReportSummary } from '@/api/types';

export type ReportUploadFile = {
  uri: string;
  name: string;
  type: string;
  webFile?: Blob;
};

export function getReports() {
  return getJson<SavedReportSummary[]>('/reports');
}

export function getReport(reportId: number) {
  return getJson<SavedReportDetail>(`/reports/${encodeURIComponent(String(reportId))}`);
}

export function renameReport(reportId: number, payload: ReportRenameRequest) {
  return putJsonBody<SavedReportSummary>(`/reports/${encodeURIComponent(String(reportId))}`, payload);
}

export function deleteReport(reportId: number) {
  return deleteJson<ReportDeleteResponse>(`/reports/${encodeURIComponent(String(reportId))}`);
}

export function processAndSaveReport(file: ReportUploadFile) {
  const formData = new FormData();
  if (file.webFile) {
    formData.append('file', file.webFile, file.name);
  } else {
    formData.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as unknown as Blob);
  }

  return postFormData<ProcessAndSaveReportResponse>('/reports/process-and-save', formData);
}
