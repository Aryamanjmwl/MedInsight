import { Pressable, StyleSheet, View } from 'react-native';

import type { BiomarkerOverview } from '@/api';
import { AppText } from '@/components/app-text';
import { getBiomarkerStatusLabel, getStatusColor } from '@/components/status-utils';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';
import { colors, spacing } from '@/theme';
import { formatFullDate, formatValue } from '@/utils/formatting';

type BiomarkerRowProps = {
  biomarker: BiomarkerOverview;
  selected: boolean;
  onPress: () => void;
};

export function BiomarkerRow({ biomarker, selected, onPress }: BiomarkerRowProps) {
  const { isCompact } = useResponsiveLayout();
  const statusColor = getStatusColor(biomarker.latest_status);
  const statusLabel = getBiomarkerStatusLabel(biomarker.latest_status);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${selected ? 'Close' : 'Open'} ${biomarker.test_name}, ${formatValue(biomarker.latest_value)} ${biomarker.latest_unit}, ${statusLabel}, ${biomarker.measurement_count} recorded measurements`}
      accessibilityState={{ expanded: selected }}
      onPress={onPress}
      style={({ pressed, hovered }) => [styles.row, selected && styles.selectedRow, (pressed || hovered) && styles.rowActive]}>
      <View style={[styles.primaryRow, isCompact && styles.compactRow]}>
        <AppText variant="bodyStrong" style={styles.name}>{biomarker.test_name}</AppText>
        <AppText variant="section" style={[styles.value, { color: biomarker.latest_status === 'normal' || biomarker.latest_status === 'unknown' ? colors.textPrimary : statusColor }]}>
          {formatValue(biomarker.latest_value)} <AppText variant="caption" color="textMuted">{biomarker.latest_unit}</AppText>
        </AppText>
      </View>
      <View style={[styles.secondaryRow, isCompact && styles.compactRow]}>
        <AppText variant="caption" color="textMuted" style={styles.updated}>Updated {formatFullDate(biomarker.latest_report_date)}</AppText>
        <AppText variant="metadata" style={{ color: statusColor }}>{statusLabel}</AppText>
      </View>
      <View style={styles.detailCueRow}>
        <AppText variant="caption" color="textSecondary" style={styles.measurements}>{biomarker.measurement_count} recorded {biomarker.measurement_count === 1 ? 'measurement' : 'measurements'}</AppText>
        <AppText variant="label" color="brand">{selected ? 'Close ↑' : 'History →'}</AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm, paddingVertical: spacing.lg, paddingHorizontal: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  selectedRow: { backgroundColor: colors.surfaceSubtle }, rowActive: { backgroundColor: colors.surfaceMuted },
  primaryRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.md },
  secondaryRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.md },
  compactRow: { alignItems: 'flex-start', flexDirection: 'column', gap: spacing.xs },
  detailCueRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  name: { flex: 1, minWidth: 0 }, value: { textAlign: 'right', fontVariant: ['tabular-nums'] },
  updated: { flex: 1 }, measurements: { flex: 1, fontVariant: ['tabular-nums'] },
});
