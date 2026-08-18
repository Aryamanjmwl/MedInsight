import type { BiomarkerStatus, TrendDirection } from '@/api';
import { colors } from '@/theme';

export function getStatusColor(status: BiomarkerStatus) {
  if (status === 'high') return colors.statusHigh;
  if (status === 'low') return colors.statusLow;
  if (status === 'normal') return colors.statusNormal;
  return colors.textMuted;
}

export function getStatusLabel(status: BiomarkerStatus) {
  if (status === 'high') return 'Above report range';
  if (status === 'low') return 'Below report range';
  if (status === 'normal') return 'In range';
  return 'Not classified';
}

export function getBiomarkerStatusLabel(status: BiomarkerStatus) {
  return getStatusLabel(status).toUpperCase();
}

export function getTrendSymbol(trend?: TrendDirection | 'up' | 'down') {
  if (trend === 'up' || trend === 'increasing') return '↑';
  if (trend === 'down' || trend === 'decreasing') return '↓';
  if (trend === 'stable') return '→';
  return '—';
}
