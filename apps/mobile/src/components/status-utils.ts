import type { BiomarkerStatus } from '@/data/mock-data';
import { colors } from '@/theme';

export function getStatusColor(status: BiomarkerStatus) {
  if (status === 'high') return colors.statusHigh;
  if (status === 'low') return colors.statusLow;
  return colors.textSecondary;
}

export function getStatusLabel(status: BiomarkerStatus) {
  return status === 'normal' ? '—' : status.toUpperCase();
}

export function getTrendSymbol(trend?: 'up' | 'down' | 'stable') {
  if (trend === 'up') return '↑';
  if (trend === 'down') return '↓';
  if (trend === 'stable') return '→';
  return '—';
}
