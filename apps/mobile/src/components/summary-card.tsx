import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { colors, radii, spacing } from '@/theme';

type SummaryTone = 'brand' | 'neutral' | 'alert';

type SummaryCardProps = {
  label: string;
  value: string;
  supportingText: string;
  tone?: SummaryTone;
};

const toneColors = {
  brand: colors.brand,
  neutral: colors.textPrimary,
  alert: colors.statusHigh,
};

export function SummaryCard({
  label,
  value,
  supportingText,
  tone = 'neutral',
}: SummaryCardProps) {
  return (
    <View style={styles.card}>
      <AppText variant="label" color="textSecondary">
        {label}
      </AppText>
      <AppText variant="display" style={{ color: toneColors[tone] }}>
        {value}
      </AppText>
      <AppText variant="caption" color="textMuted">
        {supportingText}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minWidth: 150,
    flex: 1,
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
});
