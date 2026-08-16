import type { BiomarkerStatus, TrendDirection } from '@/api';
import { colors } from '@/theme';

export function getStatusColor(status: BiomarkerStatus) {
  if (status === 'high') return colors.statusHigh;
  if (status === 'low') return colors.statusLow;
  return colors.textSecondary;
}

export function getStatusLabel(status: BiomarkerStatus) {
  return status === 'normal' ? '—' : status.toUpperCase();
}

export function getTrendSymbol(trend?: TrendDirection | 'up' | 'down') {
  if (trend === 'up' || trend === 'increasing') return '↑';
  if (trend === 'down' || trend === 'decreasing') return '↓';
  if (trend === 'stable') return '→';
  return '—';
}
