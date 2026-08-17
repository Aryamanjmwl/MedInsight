import { getJson } from '@/api/client';
import type { DoctorVisitBriefResponse } from '@/api/types';

export function getDoctorVisitBrief() {
  return getJson<DoctorVisitBriefResponse>('/dashboard/doctor-brief');
}
