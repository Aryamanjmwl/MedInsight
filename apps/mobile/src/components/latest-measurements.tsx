import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { getStatusColor, getStatusLabel, getTrendSymbol } from '@/components/status-utils';
import { biomarkers } from '@/data/mock-data';
import { colors, spacing } from '@/theme';

export function LatestMeasurements() {
  return (
    <View style={styles.section}>
      <AppText variant="metadata" color="textMuted">Latest Measurements</AppText>
      <View style={styles.list}>
        {biomarkers.map((item) => {
          const statusColor = getStatusColor(item.status);
          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={`${item.name}, ${item.value} ${item.unit}, reference ${item.reference}, ${getStatusLabel(item.status)}`}
              style={({ pressed, hovered }) => [styles.row, (pressed || hovered) && styles.rowActive]}>
              <View style={styles.primaryRow}>
                <AppText variant="label" style={styles.name}>{item.name}</AppText>
                <AppText variant="bodyStrong" style={[styles.value, { color: item.status === 'normal' ? colors.textPrimary : statusColor }]}>
                  {item.value} <AppText variant="caption" color="textMuted">{item.unit}</AppText>
                </AppText>
              </View>
              <View style={styles.secondaryRow}>
                <AppText variant="caption" color="textMuted" style={styles.reference}>Reference {item.reference}</AppText>
                <AppText variant="metadata" style={{ color: statusColor }}>{getStatusLabel(item.status)} {getTrendSymbol(item.trend)}</AppText>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  list: { borderTopWidth: 1, borderTopColor: colors.border },
  row: { gap: spacing.sm, paddingVertical: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowActive: { backgroundColor: colors.surfaceMuted },
  primaryRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.md },
  secondaryRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.md },
  name: { flex: 1 }, value: { textAlign: 'right', fontVariant: ['tabular-nums'] },
  reference: { flex: 1, fontVariant: ['tabular-nums'] },
});
