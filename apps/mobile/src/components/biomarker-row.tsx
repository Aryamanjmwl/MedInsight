import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { getStatusColor, getStatusLabel, getTrendSymbol } from '@/components/status-utils';
import type { MockBiomarker } from '@/data/mock-data';
import { colors, spacing } from '@/theme';

export function BiomarkerRow({ biomarker }: { biomarker: MockBiomarker }) {
  const statusColor = getStatusColor(biomarker.status);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${biomarker.name}, ${biomarker.value} ${biomarker.unit}, ${getStatusLabel(biomarker.status)}, ${biomarker.change}`}
      style={({ pressed, hovered }) => [styles.row, (pressed || hovered) && styles.rowActive]}>
      <View style={styles.primaryRow}>
        <AppText variant="bodyStrong" style={styles.name}>{biomarker.name}</AppText>
        <AppText variant="section" style={[styles.value, { color: biomarker.status === 'normal' ? colors.textPrimary : statusColor }]}>
          {biomarker.value} <AppText variant="caption" color="textMuted">{biomarker.unit}</AppText>
        </AppText>
      </View>
      <View style={styles.secondaryRow}>
        <AppText variant="caption" color="textMuted" style={styles.updated}>Updated {biomarker.date}</AppText>
        <AppText variant="metadata" style={{ color: statusColor }}>{biomarker.status === 'normal' ? 'IN RANGE' : getStatusLabel(biomarker.status)}</AppText>
      </View>
      <View style={styles.changeRow}>
        <AppText variant="caption" color="textSecondary" style={styles.change}>{biomarker.change}</AppText>
        <AppText variant="section" style={{ color: statusColor }}>{getTrendSymbol(biomarker.trend)}</AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm, paddingVertical: spacing.lg, paddingHorizontal: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowActive: { backgroundColor: colors.surfaceMuted },
  primaryRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.md },
  secondaryRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.md },
  changeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  name: { flex: 1 }, value: { textAlign: 'right', fontVariant: ['tabular-nums'] },
  updated: { flex: 1 }, change: { flex: 1, fontVariant: ['tabular-nums'] },
});
