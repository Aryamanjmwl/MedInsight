import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import {
  ApiError,
  updateSavedMeasurement,
  type BiomarkerHistoryItem,
  type ManualMeasurementUpdate,
} from '@/api';
import { AppText } from '@/components/app-text';
import { useHealthDataRefresh } from '@/context/health-data-refresh-context';
import { colors, radii, spacing, typography } from '@/theme';
import {
  validateManualMeasurementForm,
  type ManualMeasurementForm,
  type ManualMeasurementFormErrors,
} from '@/utils/manual-measurement';

type Props = {
  visible: boolean;
  normalizedName: string;
  biomarkerName: string;
  measurement: BiomarkerHistoryItem | null;
  onClose: () => void;
};

function numberInput(value: number | null) {
  return value === null ? '' : String(value);
}

function formFromMeasurement(
  normalizedName: string,
  measurement: BiomarkerHistoryItem,
): ManualMeasurementForm {
  return {
    normalizedName,
    value: String(measurement.value),
    unit: measurement.unit,
    measurementDate: measurement.uploaded_at.slice(0, 10),
    referenceLow: measurement.reference_operator ? '' : numberInput(measurement.reference_low),
    referenceHigh: measurement.reference_operator ? '' : numberInput(measurement.reference_high),
  };
}

export function ManualMeasurementEditDialog({
  visible,
  normalizedName,
  biomarkerName,
  measurement,
  onClose,
}: Props) {
  const { invalidateHealthData } = useHealthDataRefresh();
  const [form, setForm] = useState<ManualMeasurementForm | null>(null);
  const [errors, setErrors] = useState<ManualMeasurementFormErrors>({});
  const [saving, setSaving] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !measurement) {
      setForm(null);
      setErrors({});
      setSaving(false);
      setRequestError(null);
      return;
    }
    setForm(formFromMeasurement(normalizedName, measurement));
    setErrors({});
    setSaving(false);
    setRequestError(null);
  }, [measurement, normalizedName, visible]);

  if (!measurement || !form) return null;

  const reportDerived = measurement.source === 'report';

  const update = (field: keyof ManualMeasurementForm, value: string) => {
    setForm((current) => current ? { ...current, [field]: value } : current);
    setErrors((current) => ({ ...current, [field]: undefined }));
    setRequestError(null);
  };

  const submit = async () => {
    if (saving) return;

    const operatorReference = measurement.reference_operator !== null;
    const validationForm = operatorReference
      ? { ...form, referenceLow: '', referenceHigh: '' }
      : form;
    const validated = validateManualMeasurementForm(validationForm);
    setErrors(validated.errors);
    if (!validated.payload) return;

    const { normalized_name: _normalizedName, ...validatedValues } = validated.payload;
    const payload: ManualMeasurementUpdate = operatorReference
      ? {
          ...validatedValues,
          reference_low: measurement.reference_low,
          reference_high: measurement.reference_high,
          reference_operator: measurement.reference_operator,
        }
      : validatedValues;

    setSaving(true);
    setRequestError(null);
    try {
      await updateSavedMeasurement(measurement.measurement_id, payload);
      invalidateHealthData();
      onClose();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setRequestError('Your session has expired. Please sign in again.');
      } else if (error instanceof ApiError && error.status === 404) {
        setRequestError('This measurement is no longer available.');
      } else if (error instanceof ApiError && error.status === 422) {
        setRequestError(error.message || 'Review the measurement details and try again.');
      } else if (error instanceof ApiError) {
        setRequestError(error.message);
      } else {
        setRequestError('The measurement could not be updated. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const close = () => {
    if (!saving) onClose();
  };

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={close}>
      <View style={styles.backdrop}>
        <View accessibilityViewIsModal style={styles.dialog}>
          <View style={styles.header}>
            <View style={styles.titleBlock}>
              <AppText variant="metadata" color="textMuted">{reportDerived ? 'REPORT MEASUREMENT' : 'MANUAL MEASUREMENT'}</AppText>
              <AppText variant="title">Edit {biomarkerName}</AppText>
              <AppText color="textSecondary">
                {reportDerived
                  ? 'Correct the structured value saved from this report. The correction will be marked as user edited.'
                  : 'Correct the saved value, unit, date, or reference information.'}
              </AppText>
            </View>
            {!saving ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Close measurement editor" onPress={close} style={({ pressed, hovered }) => [styles.close, (pressed || hovered) && styles.active]}>
                <AppText variant="section" color="textMuted">×</AppText>
              </Pressable>
            ) : null}
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.form}>
            <View style={styles.provenance}>
              <View style={styles.provenanceLine}>
                <AppText variant="metadata" color="textFaint">Biomarker</AppText>
                <AppText variant="label" color="textSecondary">{biomarkerName}</AppText>
              </View>
              <AppText variant="caption" color="textMuted">
                {reportDerived
                  ? 'The report association and report date stay unchanged. MedInsight records that the structured result was corrected by the account owner.'
                  : 'The biomarker itself cannot be changed during editing. Delete and re-add it if the wrong biomarker was selected.'}
              </AppText>
            </View>

            <View style={styles.fieldRow}>
              <TextField label="Value" required value={form.value} onChangeText={(value) => update('value', value)} error={errors.value} keyboardType="decimal-pad" placeholder="13.5" />
              <TextField label="Unit" required value={form.unit} onChangeText={(value) => update('unit', value)} error={errors.unit} placeholder="g/dL" autoCapitalize="none" />
            </View>

            {reportDerived ? (
              <View style={styles.lockedField}>
                <AppText variant="label" color="textSecondary">Report date</AppText>
                <AppText variant="bodyStrong">{form.measurementDate}</AppText>
                <AppText variant="caption" color="textMuted">The date stays tied to the saved report.</AppText>
              </View>
            ) : (
              <TextField label="Measurement date" required value={form.measurementDate} onChangeText={(value) => update('measurementDate', value)} error={errors.measurementDate} placeholder="YYYY-MM-DD" autoCapitalize="none" />
            )}

            <View style={styles.referenceSection}>
              <View style={styles.referenceHeading}>
                <AppText variant="label">Reference information</AppText>
                <AppText variant="caption" color="textMuted">Reference values are used only to recalculate the saved low / normal / high status.</AppText>
              </View>

              {measurement.reference_operator ? (
                <View style={styles.preservedReference}>
                  <AppText variant="metadata" color="textFaint">Threshold reference</AppText>
                  <AppText variant="bodyStrong" color="textSecondary">{measurement.raw_reference || 'Stored threshold'}</AppText>
                  <AppText variant="caption" color="textMuted">This threshold is preserved while you edit the measurement.</AppText>
                </View>
              ) : (
                <View style={styles.fieldRow}>
                  <TextField label="Lower" value={form.referenceLow} onChangeText={(value) => update('referenceLow', value)} error={errors.referenceLow} keyboardType="decimal-pad" placeholder="12.0" />
                  <TextField label="Upper" value={form.referenceHigh} onChangeText={(value) => update('referenceHigh', value)} error={errors.referenceHigh} keyboardType="decimal-pad" placeholder="15.5" />
                </View>
              )}
            </View>

            {requestError ? (
              <View style={styles.error} accessibilityLiveRegion="polite">
                <AppText variant="label" color="statusHigh">Unable to update measurement</AppText>
                <AppText variant="caption" color="textSecondary">{requestError}</AppText>
              </View>
            ) : null}

            <View style={styles.actions}>
              <Pressable accessibilityRole="button" accessibilityState={{ busy: saving, disabled: saving }} disabled={saving} onPress={() => void submit()} style={({ pressed, hovered }) => [styles.primaryAction, saving && styles.disabled, (pressed || hovered) && !saving && styles.primaryActive]}>
                {saving ? <ActivityIndicator size="small" color={colors.white} /> : <AppText variant="label" color="white">Save changes</AppText>}
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityState={{ disabled: saving }} disabled={saving} onPress={close} style={({ pressed, hovered }) => [styles.secondaryAction, saving && styles.disabled, (pressed || hovered) && !saving && styles.active]}>
                <AppText variant="label" color="textSecondary">Cancel</AppText>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

type TextFieldProps = {
  label: string;
  required?: boolean;
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
  placeholder: string;
  keyboardType?: 'default' | 'decimal-pad';
  autoCapitalize?: 'none' | 'sentences';
};

function TextField({ label, required, error, ...inputProps }: TextFieldProps) {
  return (
    <View style={styles.textField}>
      <AppText variant="label" color="textSecondary">{label}{required ? ' *' : ''}</AppText>
      <TextInput accessibilityLabel={label} placeholderTextColor={colors.textFaint} style={[styles.input, error && styles.inputError]} {...inputProps} />
      {error ? <AppText variant="caption" color="statusHigh">{error}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, backgroundColor: 'rgba(24, 36, 45, 0.42)' },
  dialog: { width: '100%', maxWidth: 560, maxHeight: '94%', padding: spacing.xl, gap: spacing.lg, borderTopWidth: 3, borderTopColor: colors.textPrimary, borderRadius: radii.sm, backgroundColor: colors.surface },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.lg },
  titleBlock: { flex: 1, minWidth: 0, gap: spacing.xs },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  form: { gap: spacing.lg, paddingBottom: spacing.xs },
  provenance: { gap: spacing.sm, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  provenanceLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  textField: { flex: 1, minWidth: 180, gap: spacing.xs },
  fieldRow: { flexDirection: 'row', alignItems: 'flex-start', flexWrap: 'wrap', gap: spacing.md },
  input: { minHeight: 44, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radii.sm, backgroundColor: colors.surfaceSubtle, color: colors.textPrimary, fontSize: typography.body.fontSize },
  inputError: { borderColor: colors.statusHigh },
  lockedField: { gap: spacing.xs, padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radii.sm, backgroundColor: colors.surfaceSubtle },
  referenceSection: { gap: spacing.md, paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border },
  referenceHeading: { gap: spacing.xs },
  preservedReference: { gap: spacing.xs, padding: spacing.md, backgroundColor: colors.surfaceSubtle },
  error: { gap: spacing.xs, padding: spacing.md, borderLeftWidth: 2, borderLeftColor: colors.statusHigh, backgroundColor: colors.statusHighMuted },
  actions: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.md },
  primaryAction: { minWidth: 120, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg, borderRadius: radii.sm, backgroundColor: colors.brand },
  primaryActive: { backgroundColor: colors.brandStrong },
  secondaryAction: { minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md },
  active: { opacity: 0.65 },
  disabled: { opacity: 0.55 },
});
