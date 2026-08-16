import { useMemo, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { AppText } from '@/components/app-text';
import type { TrendMeasurement } from '@/data/mock-data';
import { colors, radii, spacing } from '@/theme';

type TrendTrackProps = {
  measurements: TrendMeasurement[];
  unit: string;
  color: string;
  reference: string;
  referenceMarkers: number[];
};

const PLOT_HEIGHT = 190;
const CHART_TOP = 32;
const CHART_BOTTOM = 140;
const HORIZONTAL_PADDING = 34;

export function TrendTrack({ measurements, unit, color, reference, referenceMarkers }: TrendTrackProps) {
  const [plotWidth, setPlotWidth] = useState(0);
  const domain = useMemo(() => {
    const values = [...measurements.map(({ value }) => value), ...referenceMarkers];
    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);
    const span = rawMax - rawMin || Math.max(Math.abs(rawMax), 1);
    return { min: rawMin - span * 0.12, max: rawMax + span * 0.12 };
  }, [measurements, referenceMarkers]);

  const xForIndex = (index: number) => {
    const usableWidth = Math.max(plotWidth - HORIZONTAL_PADDING * 2, 0);
    return HORIZONTAL_PADDING + (usableWidth * index) / Math.max(measurements.length - 1, 1);
  };
  const yForValue = (value: number) => {
    const ratio = (value - domain.min) / (domain.max - domain.min);
    return CHART_BOTTOM - ratio * (CHART_BOTTOM - CHART_TOP);
  };

  const points = measurements.map((measurement, index) => ({
    ...measurement,
    x: xForIndex(index),
    y: yForValue(measurement.value),
  }));

  return (
    <View
      accessibilityLabel={`Trend from ${measurements[0].value} to ${measurements[measurements.length - 1].value} ${unit}. Laboratory reference ${reference}.`}
      onLayout={(event: LayoutChangeEvent) => setPlotWidth(event.nativeEvent.layout.width)}
      style={styles.plot}>
      {[CHART_TOP, (CHART_TOP + CHART_BOTTOM) / 2, CHART_BOTTOM].map((top) => (
        <View key={top} style={[styles.gridLine, { top }]} />
      ))}

      {plotWidth > 0 ? referenceMarkers.map((marker, index) => {
        const top = yForValue(marker);
        return (
          <View key={`${marker}-${index}`} style={[styles.referenceLine, { top }]}>
            {index === 0 ? <AppText variant="caption" color="textFaint" style={styles.referenceLabel}>Lab reference {reference}</AppText> : null}
          </View>
        );
      }) : null}

      {plotWidth > 0 ? points.slice(0, -1).map((point, index) => {
        const next = points[index + 1];
        const deltaX = next.x - point.x;
        const deltaY = next.y - point.y;
        const length = Math.sqrt(deltaX ** 2 + deltaY ** 2);
        const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
        return (
          <View
            key={`${point.date}-${next.date}`}
            style={[styles.segment, {
              left: (point.x + next.x) / 2 - length / 2,
              top: (point.y + next.y) / 2,
              width: length,
              backgroundColor: color,
              transform: [{ rotate: `${angle}deg` }],
            }]}
          />
        );
      }) : null}

      {plotWidth > 0 ? points.map((point, index) => {
        const latest = index === points.length - 1;
        return (
          <View key={point.date}>
            <AppText variant="label" style={[styles.pointValue, { left: point.x - 30, top: point.y - 28, color: latest ? color : colors.textSecondary }, latest && styles.latestValue]}>{point.value}</AppText>
            <View style={[styles.point, { left: point.x - (latest ? 6 : 4.5), top: point.y - (latest ? 6 : 4.5), borderColor: color, backgroundColor: latest ? color : colors.surface }, latest && styles.latestPoint]} />
            <AppText variant="metadata" color="textMuted" style={[styles.month, { left: point.x - 30 }]}>{point.month}</AppText>
          </View>
        );
      }) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  plot: { height: PLOT_HEIGHT, position: 'relative', marginVertical: spacing.md },
  gridLine: { position: 'absolute', left: HORIZONTAL_PADDING, right: HORIZONTAL_PADDING, height: 1, backgroundColor: colors.borderSubtle },
  referenceLine: { position: 'absolute', left: HORIZONTAL_PADDING, right: HORIZONTAL_PADDING, height: 1, borderTopWidth: 1, borderStyle: 'dashed', borderTopColor: colors.borderStrong },
  referenceLabel: { position: 'absolute', right: 0, top: 4, paddingLeft: spacing.sm, backgroundColor: colors.surface },
  segment: { position: 'absolute', height: 1.5, opacity: 0.62 },
  pointValue: { position: 'absolute', width: 60, textAlign: 'center', fontVariant: ['tabular-nums'] },
  latestValue: { fontSize: 15, fontWeight: '600' },
  point: { position: 'absolute', width: 9, height: 9, borderWidth: 1.5, borderRadius: radii.pill },
  latestPoint: { width: 12, height: 12 },
  month: { position: 'absolute', top: 157, width: 60, textAlign: 'center', fontSize: 9 },
});
