import { getJson } from '@/api/client';
import type {
  BiomarkerHistoryResponse,
  BiomarkerOverview,
  TrendResult,
} from '@/api/types';

function biomarkerEndpoint(normalizedName: string, suffix: 'history' | 'trend') {
  return `/biomarkers/${encodeURIComponent(normalizedName)}/${suffix}`;
}

export function getBiomarkers() {
  return getJson<BiomarkerOverview[]>('/biomarkers');
}

export function getBiomarkerHistory(normalizedName: string) {
  return getJson<BiomarkerHistoryResponse>(biomarkerEndpoint(normalizedName, 'history'));
}

export function getBiomarkerTrend(normalizedName: string) {
  return getJson<TrendResult>(biomarkerEndpoint(normalizedName, 'trend'));
}
