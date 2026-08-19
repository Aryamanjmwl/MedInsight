import type { ManualMeasurementCreate } from '@/api';

export type ManualMeasurementForm = {
  normalizedName: string;
  value: string;
  unit: string;
  measurementDate: string;
  referenceLow: string;
  referenceHigh: string;
};

export type ManualMeasurementFormErrors = Partial<Record<keyof ManualMeasurementForm, string>>;

const NUMBER_PATTERN = /^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function parseNumber(value: string) {
  const trimmed = value.trim();
  if (!NUMBER_PATTERN.test(trimmed)) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function validDate(value: string) {
  if (!DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day;
}

export function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function validateManualMeasurementForm(form: ManualMeasurementForm): {
  errors: ManualMeasurementFormErrors;
  payload: ManualMeasurementCreate | null;
} {
  const errors: ManualMeasurementFormErrors = {};
  if (!form.normalizedName) errors.normalizedName = 'Select a biomarker.';

  const value = parseNumber(form.value);
  if (value === null) errors.value = 'Enter a valid numeric value.';

  const unit = form.unit.trim();
  if (!unit) errors.unit = 'Enter the laboratory unit.';
  else if (unit.length > 100) errors.unit = 'The unit is too long.';

  if (!validDate(form.measurementDate)) {
    errors.measurementDate = 'Enter a valid date as YYYY-MM-DD.';
  } else if (form.measurementDate > todayIsoDate()) {
    errors.measurementDate = 'Measurement date cannot be in the future.';
  }

  const lowProvided = form.referenceLow.trim() !== '';
  const highProvided = form.referenceHigh.trim() !== '';
  const referenceLow = lowProvided ? parseNumber(form.referenceLow) : null;
  const referenceHigh = highProvided ? parseNumber(form.referenceHigh) : null;
  if (lowProvided !== highProvided) {
    const message = 'Enter both bounds or leave both blank.';
    errors.referenceLow = message;
    errors.referenceHigh = message;
  } else if (lowProvided && (referenceLow === null || referenceHigh === null)) {
    if (referenceLow === null) errors.referenceLow = 'Enter a valid numeric lower bound.';
    if (referenceHigh === null) errors.referenceHigh = 'Enter a valid numeric upper bound.';
  } else if (referenceLow !== null && referenceHigh !== null && referenceLow > referenceHigh) {
    errors.referenceLow = 'Lower bound cannot exceed the upper bound.';
  }

  if (Object.keys(errors).length || value === null) return { errors, payload: null };
  return {
    errors,
    payload: {
      normalized_name: form.normalizedName,
      value,
      unit,
      measurement_date: form.measurementDate,
      reference_low: referenceLow,
      reference_high: referenceHigh,
      reference_operator: null,
    },
  };
}
