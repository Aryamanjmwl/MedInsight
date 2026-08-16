import type { ReferenceOperator, TrendDirection } from '@/api';

type ReferenceFields = {
  raw_reference: string;
  reference_low: number | null;
  reference_high: number | null;
  reference_operator: ReferenceOperator | null;
};

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

const dayMonthFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  timeZone: 'UTC',
});

const yearFormatter = new Intl.DateTimeFormat('en-GB', { year: 'numeric', timeZone: 'UTC' });

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

export function formatDayMonth(value: string) {
  const date = parseApiDate(value);
  return date ? dayMonthFormatter.format(date).toUpperCase() : 'DATE N/A';
}

export function formatYear(value: string) {
  const date = parseApiDate(value);
  return date ? yearFormatter.format(date) : 'Date unavailable';
}

export function formatValue(value: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);
}

export function formatSignedValue(value: number, suffix = '') {
  const sign = value > 0 ? '+' : '';
  return `${sign}${formatValue(value)}${suffix}`;
}

export function formatReference(reference: ReferenceFields) {
  const rawReference = reference.raw_reference.trim();
  if (rawReference) return rawReference;

  if (reference.reference_low !== null && reference.reference_high !== null) {
    return `${formatValue(reference.reference_low)}–${formatValue(reference.reference_high)}`;
  }

  if (reference.reference_operator) {
    const threshold = reference.reference_operator.startsWith('<')
      ? reference.reference_high
      : reference.reference_low;
    if (threshold !== null) return `${reference.reference_operator}${formatValue(threshold)}`;
  }

  return null;
}

export function getTrendArrow(direction: TrendDirection) {
  if (direction === 'increasing') return '↑';
  if (direction === 'decreasing') return '↓';
  if (direction === 'stable') return '→';
  return '';
}
