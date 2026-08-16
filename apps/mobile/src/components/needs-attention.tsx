import { Pressable, StyleSheet, View } from 'react-native';

import type { DashboardBiomarkerSummary } from '@/api';
import { AppText } from '@/components/app-text';
import { getStatusColor, getStatusLabel } from '@/components/status-utils';
import { colors, radii, spacing } from '@/theme';
import { formatValue } from '@/utils/formatting';

type NeedsAttentionProps = { biomarkers: DashboardBiomarkerSummary[]; totalCount: number };

export function NeedsAttention({ biomarkers, totalCount }: NeedsAttentionProps) {
  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <AppText variant="metadata" color="textMuted">Needs Attention</AppText>
        <AppText variant="section" color={totalCount ? 'statusHigh' : 'textMuted'}>{totalCount}</AppText>
      </View>
      {biomarkers.length ? biomarkers.map((item) => {
        const statusColor = getStatusColor(item.latest_status);
        return (
          <View key={item.normalized_name} style={styles.row}>
            <View style={[styles.marker, { backgroundColor: statusColor }]} />
            <View style={styles.details}>
              <AppText variant="label">{item.test_name}</AppText>
              <AppText variant="section" style={[styles.numeric, { color: statusColor }]}>{formatValue(item.latest_value)} <AppText variant="caption" style={{ color: statusColor }}>{item.latest_unit}</AppText></AppText>
              <AppText variant="caption" color="textFaint">{item.measurement_count} recorded measurements</AppText>
            </View>
            <AppText variant="metadata" style={{ color: statusColor }}>{getStatusLabel(item.latest_status)}</AppText>
          </View>
        );
      }) : (
        <AppText variant="caption" color="textMuted" style={styles.empty}>No latest results outside their stored laboratory reference ranges.</AppText>
      )}
      <Pressable accessibilityRole="button" style={styles.action}><AppText variant="label" color="brand">Review biomarkers →</AppText></Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { width: '100%', minWidth: 0, padding: spacing.xl, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: spacing.md },
  row: { minHeight: 92, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, paddingVertical: spacing.lg, borderTopWidth: 1, borderTopColor: colors.borderSubtle },
  marker: { width: 2, height: 42, marginTop: spacing.xs }, details: { flex: 1, gap: spacing.xxs }, numeric: { fontVariant: ['tabular-nums'] },
  empty: { paddingVertical: spacing.xl, borderTopWidth: 1, borderTopColor: colors.borderSubtle },
  action: { paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.borderSubtle },
});
