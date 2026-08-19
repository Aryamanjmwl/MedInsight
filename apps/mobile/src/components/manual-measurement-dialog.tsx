import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import {
  ApiError,
  createManualMeasurement,
  getSupportedBiomarkers,
  type ManualMeasurementResponse,
  type SupportedBiomarker,
} from '@/api';
import { AppText } from '@/components/app-text';
import { useHealthDataRefresh } from '@/context/health-data-refresh-context';
import { colors, radii, spacing, typography } from '@/theme';
import {
  todayIsoDate,
  validateManualMeasurementForm,
  type ManualMeasurementForm,
  type ManualMeasurementFormErrors,
} from '@/utils/manual-measurement';

type Props = { visible: boolean; onClose: () => void };

function initialForm(): ManualMeasurementForm {
  return {
    normalizedName: '',
    value: '',
    unit: '',
    measurementDate: todayIsoDate(),
    referenceLow: '',
    referenceHigh: '',
  };
}

export function ManualMeasurementDialog({ visible, onClose }: Props) {
  const { invalidateHealthData } = useHealthDataRefresh();
  const [form, setForm] = useState<ManualMeasurementForm>(initialForm);
  const [errors, setErrors] = useState<ManualMeasurementFormErrors>({});
  const [biomarkers, setBiomarkers] = useState<SupportedBiomarker[]>([]);
  const [loadingBiomarkers, setLoadingBiomarkers] = useState(false);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [result, setResult] = useState<ManualMeasurementResponse | null>(null);

  useEffect(() => {
    if (!visible) return;
    setForm(initialForm());
    setErrors({});
    setSelectorOpen(false);
    setSaving(false);
    setRequestError(null);
    setResult(null);
  }, [visible]);

  useEffect(() => {
    if (!visible || biomarkers.length) return;
    let active = true;
    setLoadingBiomarkers(true);
    void getSupportedBiomarkers()
      .then((items) => {
        if (active) setBiomarkers(items);
      })
      .catch(() => {
        if (active) setRequestError('Unable to load the supported biomarker list.');
      })
      .finally(() => {
        if (active) setLoadingBiomarkers(false);
      });
    return () => { active = false; };
  }, [biomarkers.length, visible]);

  const update = (field: keyof ManualMeasurementForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setRequestError(null);
  };

  const selectedBiomarker = biomarkers.find(({ normalized_name }) => normalized_name === form.normalizedName);

  const submit = async () => {
    if (saving) return;
    const validated = validateManualMeasurementForm(form);
    setErrors(validated.errors);
    if (!validated.payload) return;

    setSaving(true);
    setRequestError(null);
    try {
      const response = await createManualMeasurement(validated.payload);
      setResult(response);
      invalidateHealthData();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setRequestError('Your session has expired. Please sign in again.');
      } else if (error instanceof ApiError && error.status === 422) {
        setRequestError(error.message || 'Review the measurement details and try again.');
      } else if (error instanceof ApiError) {
        setRequestError(error.message);
      } else {
        setRequestError('The measurement could not be saved. Please try again.');
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
              <AppText variant="metadata" color="textMuted">Health Record</AppText>
              <AppText variant="title">Add laboratory measurement</AppText>
              <AppText color="textSecondary">Add a laboratory result to your health record.</AppText>
            </View>
            {!saving ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Close manual measurement form" onPress={close} style={({ pressed, hovered }) => [styles.close, (pressed || hovered) && styles.active]}>
                <AppText variant="section" color="textMuted">×</AppText>
              </Pressable>
            ) : null}
          </View>

          {result ? (
            <View style={styles.success} accessibilityLiveRegion="polite">
              <View style={styles.successMark} />
              <AppText variant="title">Measurement added</AppText>
              <AppText color="textSecondary">{result.test_name} is now part of your longitudinal health record.</AppText>
              <AppText variant="caption" color="textMuted">Source · Manual entry</AppText>
              <View style={styles.actions}><PrimaryAction label="Done" onPress={close} /></View>
            </View>
          ) : (
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.form}>
              <View style={styles.sourceLine}>
                <AppText variant="metadata" color="textFaint">Source</AppText>
                <AppText variant="label" color="textSecondary">Manual entry</AppText>
              </View>

              <View style={styles.field}>
                <FieldLabel label="Biomarker" required />
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded: selectorOpen }}
                  disabled={loadingBiomarkers}
                  onPress={() => setSelectorOpen((current) => !current)}
                  style={({ pressed, hovered }) => [styles.select, (pressed || hovered) && styles.controlActive]}>
                  {loadingBiomarkers ? <ActivityIndicator size="small" color={colors.brand} /> : <AppText color={selectedBiomarker ? 'textPrimary' : 'textMuted'}>{selectedBiomarker?.display_name ?? 'Select biomarker'}</AppText>}
                  <AppText color="textMuted">{selectorOpen ? '↑' : '↓'}</AppText>
                </Pressable>
                {selectorOpen ? (
                  <ScrollView nestedScrollEnabled style={styles.options} keyboardShouldPersistTaps="handled">
                    {biomarkers.map((item) => (
                      <Pressable
                        key={item.normalized_name}
                        accessibilityRole="button"
                        onPress={() => {
                          update('normalizedName', item.normalized_name);
                          setSelectorOpen(false);
                        }}
                        style={({ pressed, hovered }) => [styles.option, item.normalized_name === form.normalizedName && styles.selectedOption, (pressed || hovered) && styles.controlActive]}>
                        <AppText variant="label" color="textSecondary">{item.display_name}</AppText>
                      </Pressable>
                    ))}
                  </ScrollView>
                ) : null}
                <FieldError message={errors.normalizedName} />
              </View>

              <View style={styles.fieldRow}>
                <TextField label="Value" required value={form.value} onChangeText={(value) => update('value', value)} error={errors.value} keyboardType="decimal-pad" placeholder="13.5" />
                <TextField label="Unit" required value={form.unit} onChangeText={(value) => update('unit', value)} error={errors.unit} placeholder="g/dL" autoCapitalize="none" />
              </View>

              <TextField label="Measurement date" required value={form.measurementDate} onChangeText={(value) => update('measurementDate', value)} error={errors.measurementDate} placeholder="YYYY-MM-DD" autoCapitalize="none" />

              <View style={styles.referenceSection}>
                <View style={styles.referenceHeading}>
                  <AppText variant="label">Reference range (optional)</AppText>
                  <AppText variant="caption" color="textMuted">Enter the reference range shown with your laboratory result. Leave it blank if unavailable.</AppText>
                </View>
                <View style={styles.fieldRow}>
                  <TextField label="Lower" value={form.referenceLow} onChangeText={(value) => update('referenceLow', value)} error={errors.referenceLow} keyboardType="decimal-pad" placeholder="12.0" />
                  <TextField label="Upper" value={form.referenceHigh} onChangeText={(value) => update('referenceHigh', value)} error={errors.referenceHigh} keyboardType="decimal-pad" placeholder="15.5" />
                </View>
              </View>

              {requestError ? <View style={styles.error}><AppText variant="label" color="statusHigh">Unable to add measurement</AppText><AppText variant="caption" color="textSecondary">{requestError}</AppText></View> : null}

              <View style={styles.actions}>
                <PrimaryAction label={saving ? 'Saving…' : 'Add measurement'} onPress={() => void submit()} disabled={saving} />
                <SecondaryAction label="Cancel" onPress={close} disabled={saving} />
              </View>
            </ScrollView>
          )}
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
      <FieldLabel label={label} required={required} />
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.textFaint}
        style={[styles.input, error && styles.inputError]}
        {...inputProps}
      />
      <FieldError message={error} />
    </View>
  );
}

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return <AppText variant="label" color="textSecondary">{label}{required ? ' *' : ''}</AppText>;
}

function FieldError({ message }: { message?: string }) {
  return message ? <AppText variant="caption" color="statusHigh">{message}</AppText> : null;
}

function PrimaryAction({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled, busy: disabled }} disabled={disabled} onPress={onPress} style={({ pressed, hovered }) => [styles.primaryAction, disabled && styles.disabled, (pressed || hovered) && !disabled && styles.primaryActive]}><AppText variant="label" color="white">{label}</AppText></Pressable>;
}

function SecondaryAction({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed, hovered }) => [styles.secondaryAction, disabled && styles.disabled, (pressed || hovered) && !disabled && styles.active]}><AppText variant="label" color="textSecondary">{label}</AppText></Pressable>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, backgroundColor: 'rgba(24, 36, 45, 0.42)' },
  dialog: { width: '100%', maxWidth: 560, maxHeight: '94%', padding: spacing.xl, gap: spacing.lg, borderTopWidth: 3, borderTopColor: colors.textPrimary, borderRadius: radii.sm, backgroundColor: colors.surface },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.lg },
  titleBlock: { flex: 1, minWidth: 0, gap: spacing.xs }, close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  form: { gap: spacing.lg, paddingBottom: spacing.xs }, success: { gap: spacing.lg, paddingVertical: spacing.lg }, successMark: { width: 48, height: 3, backgroundColor: colors.brand },
  sourceLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  field: { gap: spacing.xs }, textField: { flex: 1, minWidth: 180, gap: spacing.xs }, fieldRow: { flexDirection: 'row', alignItems: 'flex-start', flexWrap: 'wrap', gap: spacing.md },
  input: { minHeight: 44, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radii.sm, backgroundColor: colors.surfaceSubtle, color: colors.textPrimary, fontSize: typography.body.fontSize },
  inputError: { borderColor: colors.statusHigh }, select: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radii.sm, backgroundColor: colors.surfaceSubtle },
  options: { maxHeight: 190, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  option: { minHeight: 42, justifyContent: 'center', paddingHorizontal: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle }, selectedOption: { backgroundColor: colors.brandMuted },
  referenceSection: { gap: spacing.md, paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border }, referenceHeading: { gap: spacing.xs },
  error: { gap: spacing.xs, padding: spacing.md, borderLeftWidth: 2, borderLeftColor: colors.statusHigh, backgroundColor: colors.statusHighMuted },
  actions: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.md },
  primaryAction: { minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg, borderRadius: radii.sm, backgroundColor: colors.brand }, primaryActive: { backgroundColor: colors.brandStrong },
  secondaryAction: { minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md }, active: { opacity: 0.65 }, controlActive: { opacity: 0.72 }, disabled: { opacity: 0.55 },
});
