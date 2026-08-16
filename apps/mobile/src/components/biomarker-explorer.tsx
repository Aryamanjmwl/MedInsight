import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { getStatusColor, getStatusLabel } from '@/components/status-utils';
import { TrendTrack } from '@/components/trend-track';
import { biomarkerTrends } from '@/data/mock-data';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';
import { colors, radii, spacing } from '@/theme';

type DateRange = '6M' | '1Y' | 'ALL';

export function BiomarkerExplorer() {
  const [selectedId, setSelectedId] = useState(biomarkerTrends[0].id);
  const [dateRange, setDateRange] = useState<DateRange>('ALL');
  const { isCompact } = useResponsiveLayout();
  const marker = biomarkerTrends.find(({ id }) => id === selectedId) ?? biomarkerTrends[0];
  const statusColor = getStatusColor(marker.status);
  const first = marker.measurements[0];
  const latest = marker.measurements[marker.measurements.length - 1];

  return (
    <View style={styles.panel}>
      <View style={styles.topSection}>
        <View style={styles.sectionHeading}>
          <AppText variant="metadata" color="textMuted">What Changed</AppText>
          <View style={styles.rangeSelector} accessibilityRole="tablist">
            {(['6M', '1Y', 'ALL'] as DateRange[]).map((range) => {
              const active = range === dateRange;
              return (
                <Pressable key={range} accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={() => setDateRange(range)} style={[styles.range, active && styles.rangeActive]}>
                  <AppText variant="metadata" style={{ color: active ? colors.surface : colors.textMuted }}>{range}</AppText>
                </Pressable>
              );
            })}
          </View>
        </View>
        <ScrollView horizontal style={styles.selectorScroll} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectorContent}>
          {biomarkerTrends.map((item) => {
            const active = item.id === marker.id;
            return (
              <Pressable
                key={item.id}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                onPress={() => setSelectedId(item.id)}
                style={({ pressed, hovered }) => [styles.selector, active && styles.selectorActive, (pressed || hovered) && styles.selectorHovered]}>
                <AppText variant="label" color={active ? 'textPrimary' : 'textMuted'}>{item.name}</AppText>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.content}>
        <View style={[styles.measurementHeader, isCompact && styles.compactMeasurementHeader]}>
          <View>
            <AppText variant="label" color="textSecondary">{marker.name}</AppText>
            <View style={styles.valueRow}>
              <AppText variant="value" style={[styles.value, { color: statusColor }]}>{latest.value}</AppText>
              <AppText color="textMuted">{marker.unit}</AppText>
            </View>
            {marker.status !== 'normal' ? <AppText variant="metadata" style={{ color: statusColor }}>{getStatusLabel(marker.status)}</AppText> : null}
          </View>
          <View style={[styles.change, isCompact && styles.compactChange]}>
            <AppText variant="section" style={[styles.numeric, { color: statusColor }]}>{marker.percentChange}</AppText>
            <AppText variant="caption" color="textMuted">{marker.absoluteChange} since {first.month}</AppText>
          </View>
        </View>

        <TrendTrack
          measurements={marker.measurements}
          unit={marker.unit}
          color={statusColor}
          reference={marker.reference}
          referenceMarkers={marker.referenceMarkers}
        />

        <View style={[styles.footer, isCompact && styles.compactFooter]}>
          <View style={styles.stats}>
            <Stat label="First measured" value={`${first.value} ${marker.unit}`} detail={first.date} />
            <Stat label="Latest" value={`${latest.value} ${marker.unit}`} detail={latest.date} />
            <Stat label="Change" value={marker.absoluteChange} />
          </View>
          <View style={styles.reference}>
            <AppText variant="caption" color="textFaint">Laboratory reference</AppText>
            <AppText variant="label" color="textSecondary" style={styles.numeric}>{marker.reference}</AppText>
          </View>
        </View>

        {marker.id === 'ldl' ? <View style={styles.annotation}>
          <View style={styles.annotationCopy}>
            <AppText variant="label" color="textSecondary">LDL cholesterol has increased across four recorded measurements.</AppText>
            <AppText variant="caption" color="textFaint">Based on 4 laboratory reports · Jan–Aug 2026</AppText>
          </View>
          <Pressable accessibilityRole="button"><AppText variant="label" color="brand">Explore this change →</AppText></Pressable>
        </View> : null}
      </View>
    </View>
  );
}

function Stat({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return <View style={styles.stat}><AppText variant="caption" color="textFaint">{label}</AppText><AppText variant="label" color="textSecondary" style={styles.numeric}>{value}</AppText>{detail ? <AppText variant="caption" color="textFaint">{detail}</AppText> : null}</View>;
}

const styles = StyleSheet.create({
  panel: { width: '100%', minWidth: 0, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface, overflow: 'hidden' },
  topSection: { paddingTop: spacing.xl, paddingHorizontal: spacing.xl, gap: spacing.md },
  sectionHeading: { minHeight: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  selectorScroll: { width: '100%', minWidth: 0 },
  selectorContent: { borderBottomWidth: 1, borderBottomColor: colors.border, paddingRight: spacing.lg },
  selector: { minHeight: 42, justifyContent: 'center', paddingHorizontal: spacing.md, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  selectorActive: { borderBottomColor: colors.textPrimary }, selectorHovered: { opacity: 0.72 },
  content: { padding: spacing.xl },
  measurementHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.xl },
  compactMeasurementHeader: { flexDirection: 'column', gap: spacing.md },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm }, value: { fontVariant: ['tabular-nums'] },
  change: { alignItems: 'flex-end' }, compactChange: { alignItems: 'flex-start' }, numeric: { fontVariant: ['tabular-nums'] },
  footer: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.xl, paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.borderSubtle },
  compactFooter: { flexDirection: 'column' }, stats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xl },
  stat: { gap: spacing.xxs }, reference: { alignItems: 'flex-end', gap: spacing.xxs },
  annotation: { marginTop: spacing.lg, padding: spacing.lg, gap: spacing.md, borderLeftWidth: 2, borderLeftColor: colors.brand, borderRadius: radii.sm, backgroundColor: colors.brandMuted },
  annotationCopy: { width: '100%', minWidth: 0, gap: spacing.xs },
  rangeSelector: { flexDirection: 'row', gap: spacing.xs },
  range: { minWidth: 38, minHeight: 30, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.sm, borderRadius: radii.xs },
  rangeActive: { backgroundColor: colors.textPrimary },
});
