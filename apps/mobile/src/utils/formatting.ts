import type { TrendDirection } from '@/api';

function parseApiDate(value: string) {
  const hasTimeZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value);
  const parsed = new Date(hasTimeZone ? value : `${value}Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

const fullDateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

const monthYearFormatter = new Intl.DateTimeFormat('en-GB', {
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

const monthHeaderFormatter = new Intl.DateTimeFormat('en-GB', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

const dayFormatter = new Intl.DateTimeFormat('en-GB', { day: 'numeric', timeZone: 'UTC' });

export function formatFullDate(value: string) {
  const date = parseApiDate(value);
  return date ? fullDateFormatter.format(date) : 'Date unavailable';
}

export function formatMonthYear(value: string) {
  const date = parseApiDate(value);
  return date ? monthYearFormatter.format(date) : 'Date unavailable';
}

export function formatMonthHeader(value: string) {
  const date = parseApiDate(value);
  return date ? monthHeaderFormatter.format(date).toUpperCase() : 'HEALTH RECORD';
}

export function formatDay(value: string) {
  const date = parseApiDate(value);
  return date ? dayFormatter.format(date) : '—';
}

export function formatValue(value: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);
}

export function formatSignedValue(value: number, suffix = '') {
  const sign = value > 0 ? '+' : '';
  return `${sign}${formatValue(value)}${suffix}`;
}

export function getTrendArrow(direction: TrendDirection) {
  if (direction === 'increasing') return '↑';
  if (direction === 'decreasing') return '↓';
  if (direction === 'stable') return '→';
  return '';
}
