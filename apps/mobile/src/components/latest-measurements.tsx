import { Pressable, StyleSheet, View } from 'react-native';

import type { DashboardBiomarkerSummary, TrendResult } from '@/api';
import { AppText } from '@/components/app-text';
import { getStatusColor, getStatusLabel, getTrendSymbol } from '@/components/status-utils';
import { colors, spacing } from '@/theme';
import { formatMonthYear, formatValue } from '@/utils/formatting';

type LatestMeasurementsProps = { biomarkers: DashboardBiomarkerSummary[]; trends: TrendResult[] };

export function LatestMeasurements({ biomarkers, trends }: LatestMeasurementsProps) {
  const trendsByName = new Map(trends.map((trend) => [trend.normalized_name, trend]));
  return (
    <View style={styles.section}>
      <AppText variant="metadata" color="textMuted">Latest Measurements</AppText>
      <View style={styles.list}>
        {biomarkers.map((item) => {
          const statusColor = getStatusColor(item.latest_status);
          const trend = trendsByName.get(item.normalized_name);
          return (
            <Pressable
              key={item.normalized_name}
              accessibilityRole="button"
              accessibilityLabel={`${item.test_name}, ${item.latest_value} ${item.latest_unit}, ${getStatusLabel(item.latest_status)}`}
              style={({ pressed, hovered }) => [styles.row, (pressed || hovered) && styles.rowActive]}>
              <View style={styles.primaryRow}>
                <AppText variant="label" style={styles.name}>{item.test_name}</AppText>
                <AppText variant="bodyStrong" style={[styles.value, { color: item.latest_status === 'normal' ? colors.textPrimary : statusColor }]}>{formatValue(item.latest_value)} <AppText variant="caption" color="textMuted">{item.latest_unit}</AppText></AppText>
              </View>
              <View style={styles.secondaryRow}>
                <AppText variant="caption" color="textMuted" style={styles.context}>{item.measurement_count} recorded · {formatMonthYear(item.latest_report_date)}</AppText>
                <View style={styles.statusRow}>
                  <AppText variant="metadata" style={{ color: statusColor }}>{getStatusLabel(item.latest_status)}</AppText>
                  {trend ? <AppText variant="label" color="textSecondary">{getTrendSymbol(trend.direction)}</AppText> : null}
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md }, list: { borderTopWidth: 1, borderTopColor: colors.border },
  row: { gap: spacing.sm, paddingVertical: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border }, rowActive: { backgroundColor: colors.surfaceMuted },
  primaryRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.md },
  secondaryRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.md },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { flex: 1 }, value: { textAlign: 'right', fontVariant: ['tabular-nums'] }, context: { flex: 1 },
});
