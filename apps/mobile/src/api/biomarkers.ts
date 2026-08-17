import { getJson, postJson } from '@/api/client';
import type {
  BiomarkerExplanation,
  BiomarkerHistoryResponse,
  BiomarkerOverview,
  TrendResult,
} from '@/api/types';

function biomarkerEndpoint(normalizedName: string, suffix: 'history' | 'trend' | 'explain') {
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

export function explainBiomarker(normalizedName: string) {
  return postJson<BiomarkerExplanation>(biomarkerEndpoint(normalizedName, 'explain'));
}
