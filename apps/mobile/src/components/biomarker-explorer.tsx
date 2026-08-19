import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import type { DashboardBiomarkerSummary, TrendResult } from '@/api';
import { AppText } from '@/components/app-text';
import { getStatusColor, getStatusLabel } from '@/components/status-utils';
import { TrendTrack } from '@/components/trend-track';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';
import { colors, radii, spacing } from '@/theme';
import { formatMonthYear, formatSignedValue, formatValue, getTrendArrow } from '@/utils/formatting';

type BiomarkerExplorerProps = { trends: TrendResult[]; biomarkers: DashboardBiomarkerSummary[] };

function canRenderTrend(trend: TrendResult) {
  return trend.comparable_units && trend.issue !== 'mixed_units' && trend.first_value !== null && trend.latest_value !== null && trend.first_date !== null && trend.latest_date !== null && trend.unit !== null;
}

export function BiomarkerExplorer({ trends, biomarkers }: BiomarkerExplorerProps) {
  const usableTrends = trends.filter(canRenderTrend).slice(0, 6);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const { isCompact } = useResponsiveLayout();
  const selected = usableTrends.find(({ normalized_name }) => normalized_name === selectedName) ?? usableTrends[0];

  if (!selected) {
    const mixedUnits = trends.some((trend) => !trend.comparable_units || trend.issue === 'mixed_units');
    return (
      <View style={styles.panel}>
        <View style={styles.emptyState}>
          <AppText variant="metadata" color="textMuted">What Changed</AppText>
          <AppText variant="section">{mixedUnits ? 'Trend unavailable because recorded units differ.' : 'More measurements are needed before a trend can be shown.'}</AppText>
          <AppText variant="caption" color="textMuted">Trends use comparable measurements in your longitudinal laboratory record.</AppText>
        </View>
      </View>
    );
  }

  const firstValue = selected.first_value!;
  const latestValue = selected.latest_value!;
  const firstDate = selected.first_date!;
  const latestDate = selected.latest_date!;
  const unit = selected.unit!;
  const biomarker = biomarkers.find(({ normalized_name }) => normalized_name === selected.normalized_name);
  const displayName = biomarker?.test_name ?? selected.normalized_name.replaceAll('_', ' ');
  const statusColor = biomarker ? getStatusColor(biomarker.latest_status) : colors.textPrimary;
  const directionLabel = selected.direction.replace('_', ' ');
  const points = [
    { key: 'first', label: formatMonthYear(firstDate).toUpperCase(), value: firstValue },
    { key: 'latest', label: formatMonthYear(latestDate).toUpperCase(), value: latestValue },
  ];

  return (
    <View style={styles.panel}>
      <View style={styles.topSection}>
        <View style={styles.sectionHeading}>
          <AppText variant="metadata" color="textMuted">What Changed</AppText>
          <AppText variant="caption" color="textMuted">All recorded data</AppText>
        </View>
        <ScrollView horizontal style={styles.selectorScroll} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectorContent}>
          {usableTrends.map((trend) => {
            const active = trend.normalized_name === selected.normalized_name;
            const name = biomarkers.find(({ normalized_name }) => normalized_name === trend.normalized_name)?.test_name ?? trend.normalized_name.replaceAll('_', ' ');
            return (
              <Pressable key={trend.normalized_name} accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={() => setSelectedName(trend.normalized_name)} style={({ pressed, hovered }) => [styles.selector, active && styles.selectorActive, (pressed || hovered) && styles.selectorHovered]}>
                <AppText variant="label" color={active ? 'textPrimary' : 'textMuted'}>{name}</AppText>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.content}>
        <View style={[styles.measurementHeader, isCompact && styles.compactMeasurementHeader]}>
          <View>
            <AppText variant="label" color="textSecondary">{displayName}</AppText>
            <View style={styles.valueRow}>
              <AppText variant="value" style={[styles.value, { color: statusColor }]}>{formatValue(latestValue)}</AppText>
              <AppText color="textMuted">{unit}</AppText>
            </View>
            {biomarker && biomarker.latest_status !== 'normal' ? <AppText variant="metadata" style={{ color: statusColor }}>{getStatusLabel(biomarker.latest_status, biomarker.latest_source)}</AppText> : null}
          </View>
          <View style={[styles.change, isCompact && styles.compactChange]}>
            <AppText variant="section" color="textSecondary">{getTrendArrow(selected.direction)} {selected.percent_change === null ? '—' : formatSignedValue(selected.percent_change, '%')}</AppText>
            <AppText variant="caption" color="textMuted">{selected.absolute_change === null ? 'Change unavailable' : formatSignedValue(selected.absolute_change, ` ${unit}`)}</AppText>
          </View>
        </View>

        <TrendTrack points={points} unit={unit} color={colors.brand} />

        <View style={[styles.footer, isCompact && styles.compactFooter]}>
          <View style={styles.stats}>
            <Stat label="First measured" value={`${formatValue(firstValue)} ${unit}`} detail={formatMonthYear(firstDate)} />
            <Stat label="Latest" value={`${formatValue(latestValue)} ${unit}`} detail={formatMonthYear(latestDate)} />
            <Stat label="Measurements" value={String(selected.measurement_count)} />
          </View>
          <View style={styles.direction}>
            <AppText variant="caption" color="textFaint">Mathematical direction</AppText>
            <AppText variant="label" color="textSecondary">{directionLabel}</AppText>
          </View>
        </View>

        <View style={styles.annotation}>
          <AppText variant="label" color="textSecondary">{displayName} is {directionLabel} across {selected.measurement_count} recorded measurements.</AppText>
          <AppText variant="caption" color="textFaint">Based on recorded laboratory measurements · {formatMonthYear(firstDate)}–{formatMonthYear(latestDate)}</AppText>
        </View>
      </View>
    </View>
  );
}

function Stat({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return <View style={styles.stat}><AppText variant="caption" color="textFaint">{label}</AppText><AppText variant="label" color="textSecondary" style={styles.numeric}>{value}</AppText>{detail ? <AppText variant="caption" color="textFaint">{detail}</AppText> : null}</View>;
}

const styles = StyleSheet.create({
  panel: { width: '100%', minWidth: 0, borderTopWidth: 2, borderTopColor: colors.textPrimary, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface, overflow: 'hidden' },
  topSection: { paddingTop: spacing.xl, paddingHorizontal: spacing.xl, gap: spacing.md }, sectionHeading: { minHeight: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  selectorScroll: { width: '100%', minWidth: 0 }, selectorContent: { borderBottomWidth: 1, borderBottomColor: colors.border, paddingRight: spacing.lg },
  selector: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.md, borderBottomWidth: 2, borderBottomColor: 'transparent' }, selectorActive: { borderBottomColor: colors.textPrimary }, selectorHovered: { opacity: 0.72 },
  content: { padding: spacing.xl }, measurementHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.xl }, compactMeasurementHeader: { flexDirection: 'column', gap: spacing.md },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm }, value: { fontVariant: ['tabular-nums'] }, change: { alignItems: 'flex-end' }, compactChange: { alignItems: 'flex-start' }, numeric: { fontVariant: ['tabular-nums'] },
  footer: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.xl, paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.borderSubtle }, compactFooter: { flexDirection: 'column' }, stats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xl }, stat: { gap: spacing.xxs }, direction: { alignItems: 'flex-end', gap: spacing.xxs },
  annotation: { marginTop: spacing.lg, padding: spacing.lg, gap: spacing.xs, borderLeftWidth: 2, borderLeftColor: colors.brand, borderRadius: radii.sm, backgroundColor: colors.brandMuted },
  emptyState: { minHeight: 132, justifyContent: 'center', gap: spacing.sm, padding: spacing.xl },
});
