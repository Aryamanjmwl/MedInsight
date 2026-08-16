import { useMemo, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { AppText } from '@/components/app-text';
import { colors, radii, spacing } from '@/theme';

export type TrendPoint = { key: string; label: string; value: number };

type TrendTrackProps = { points: TrendPoint[]; unit: string; color: string };

const PLOT_HEIGHT = 170;
const CHART_TOP = 34;
const CHART_BOTTOM = 118;
const HORIZONTAL_PADDING = 42;

export function TrendTrack({ points, unit, color }: TrendTrackProps) {
  const [plotWidth, setPlotWidth] = useState(0);
  const domain = useMemo(() => {
    const values = points.map(({ value }) => value);
    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);
    const span = rawMax - rawMin || Math.max(Math.abs(rawMax) * 0.1, 1);
    return { min: rawMin - span * 0.18, max: rawMax + span * 0.18 };
  }, [points]);

  const xForIndex = (index: number) => {
    const usableWidth = Math.max(plotWidth - HORIZONTAL_PADDING * 2, 0);
    return HORIZONTAL_PADDING + (usableWidth * index) / Math.max(points.length - 1, 1);
  };
  const yForValue = (value: number) => {
    const ratio = (value - domain.min) / (domain.max - domain.min);
    return CHART_BOTTOM - ratio * (CHART_BOTTOM - CHART_TOP);
  };
  const plottedPoints = points.map((point, index) => ({ ...point, x: xForIndex(index), y: yForValue(point.value) }));

  return (
    <View
      accessibilityLabel={`Trend from ${points[0].value} to ${points[points.length - 1].value} ${unit}.`}
      onLayout={(event: LayoutChangeEvent) => setPlotWidth(event.nativeEvent.layout.width)}
      style={styles.plot}>
      {[CHART_TOP, (CHART_TOP + CHART_BOTTOM) / 2, CHART_BOTTOM].map((top) => <View key={top} style={[styles.gridLine, { top }]} />)}

      {plotWidth > 0 ? plottedPoints.slice(0, -1).map((point, index) => {
        const next = plottedPoints[index + 1];
        const deltaX = next.x - point.x;
        const deltaY = next.y - point.y;
        const length = Math.sqrt(deltaX ** 2 + deltaY ** 2);
        const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
        return <View key={`${point.key}-${next.key}`} style={[styles.segment, { left: (point.x + next.x) / 2 - length / 2, top: (point.y + next.y) / 2, width: length, backgroundColor: color, transform: [{ rotate: `${angle}deg` }] }]} />;
      }) : null}

      {plotWidth > 0 ? plottedPoints.map((point, index) => {
        const latest = index === plottedPoints.length - 1;
        return (
          <View key={point.key}>
            <AppText variant="label" style={[styles.pointValue, { left: point.x - 34, top: point.y - 29, color: latest ? color : colors.textSecondary }, latest && styles.latestValue]}>{point.value}</AppText>
            <View style={[styles.point, { left: point.x - (latest ? 6 : 4.5), top: point.y - (latest ? 6 : 4.5), borderColor: color, backgroundColor: latest ? color : colors.surface }, latest && styles.latestPoint]} />
            <AppText variant="metadata" color="textMuted" style={[styles.label, { left: point.x - 42 }]}>{point.label}</AppText>
          </View>
        );
      }) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  plot: { height: PLOT_HEIGHT, position: 'relative', marginVertical: spacing.sm },
  gridLine: { position: 'absolute', left: HORIZONTAL_PADDING, right: HORIZONTAL_PADDING, height: 1, backgroundColor: colors.borderSubtle },
  segment: { position: 'absolute', height: 1.5, opacity: 0.62 },
  pointValue: { position: 'absolute', width: 68, textAlign: 'center', fontVariant: ['tabular-nums'] },
  latestValue: { fontSize: 15, fontWeight: '600' },
  point: { position: 'absolute', width: 9, height: 9, borderWidth: 1.5, borderRadius: radii.pill },
  latestPoint: { width: 12, height: 12 },
  label: { position: 'absolute', top: 140, width: 84, textAlign: 'center', fontSize: 9 },
});
