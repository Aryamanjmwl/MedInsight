import { deleteJson, getJson, postJson, postJsonBody } from '@/api/client';
import type {
  BiomarkerExplanation,
  BiomarkerHistoryResponse,
  BiomarkerOverview,
  ManualMeasurementCreate,
  ManualMeasurementDeleteResponse,
  ManualMeasurementResponse,
  SupportedBiomarker,
  TrendResult,
} from '@/api/types';

function biomarkerEndpoint(normalizedName: string, suffix: 'history' | 'trend' | 'explain') {
  return `/biomarkers/${encodeURIComponent(normalizedName)}/${suffix}`;
}

export function getBiomarkers() {
  return getJson<BiomarkerOverview[]>('/biomarkers');
}

export function getSupportedBiomarkers() {
  return getJson<SupportedBiomarker[]>('/biomarkers/supported');
}

export function createManualMeasurement(payload: ManualMeasurementCreate) {
  return postJsonBody<ManualMeasurementResponse>('/biomarkers/manual', payload);
}

export function deleteManualMeasurement(measurementId: number) {
  return deleteJson<ManualMeasurementDeleteResponse>(`/biomarkers/manual/${measurementId}`);
}

export function getBiomarkerHistory(normalizedName: string) {
  return getJson<BiomarkerHistoryResponse>(biomarkerEndpoint(normalizedName, 'history'));
}

export function getBiomarkerTrend(normalizedName: string) {
  return getJson<TrendResult>(biomarkerEndpoint(normalizedName, 'trend'));
}

export function explainBiomarker(normalizedName: string) {
  return postJson<BiomarkerExplanation>(biomarkerEndpoint(normalizedName, 'explain'));
}
