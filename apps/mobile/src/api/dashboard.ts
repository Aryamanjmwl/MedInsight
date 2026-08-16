import { getJson } from '@/api/client';
import type { DashboardSummaryResponse } from '@/api/types';

export function getDashboardSummary() {
  return getJson<DashboardSummaryResponse>('/dashboard/summary');
}
