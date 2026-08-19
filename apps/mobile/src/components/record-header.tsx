import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';
import { colors, spacing } from '@/theme';
import { formatFullDate, formatMonthHeader } from '@/utils/formatting';

type RecordHeaderProps = { latestRecordDate: string; refreshing: boolean; onRefresh: () => void };
type Props = RecordHeaderProps & { reportCount: number; biomarkerCount: number; onUpload: () => void; onAddMeasurement: () => void };

export function RecordHeader({ latestRecordDate, reportCount, biomarkerCount, refreshing, onRefresh, onUpload, onAddMeasurement }: Props) {
  const { isCompact, isDesktop } = useResponsiveLayout();
  return (
    <View style={[styles.container, isDesktop && styles.desktopContainer, isCompact && styles.compact]}>
      <View style={styles.heading}>
        <AppText variant="metadata" color="textMuted" style={styles.date}>{formatMonthHeader(latestRecordDate)}</AppText>
        <AppText variant={isCompact ? 'title' : 'display'}>Health record</AppText>
        <View style={styles.metadata}>
          <AppText variant="caption" color="textMuted">Latest record · {formatFullDate(latestRecordDate)}</AppText>
          <AppText variant="caption" color="textMuted">{reportCount} {reportCount === 1 ? 'report' : 'reports'}</AppText>
          <AppText variant="caption" color="textMuted">{biomarkerCount} tracked biomarkers</AppText>
        </View>
      </View>
      <View style={styles.trailing}>
        <Pressable accessibilityRole="button" accessibilityLabel="Refresh dashboard" accessibilityState={{ busy: refreshing, disabled: refreshing }} disabled={refreshing} onPress={onRefresh} style={({ hovered, pressed }) => [styles.refresh, (hovered || pressed) && styles.refreshActive]}>
          {refreshing ? <ActivityIndicator size="small" color={colors.brand} /> : <AppText variant="label" color="brand">Refresh</AppText>}
        </Pressable>
        {!isDesktop ? (
          <>
            <Pressable accessibilityRole="button" onPress={onAddMeasurement} style={({ hovered, pressed }) => [styles.manual, (hovered || pressed) && styles.refreshActive]}>
              <AppText variant="label" color="brand">Add measurement</AppText>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={onUpload} style={({ hovered, pressed }) => [styles.upload, (hovered || pressed) && styles.refreshActive]}>
              <AppText variant="label" color="white">Upload report</AppText>
            </Pressable>
          </>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginHorizontal: -16, paddingHorizontal: 16, paddingTop: spacing.xxl, paddingBottom: spacing.xl, borderBottomWidth: 1, borderBottomColor: colors.borderStrong, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.xl },
  desktopContainer: { marginHorizontal: -40, paddingHorizontal: 40 },
  compact: { marginHorizontal: -16, paddingHorizontal: 16, paddingTop: spacing.xl, paddingBottom: spacing.lg, alignItems: 'flex-start', flexDirection: 'column', gap: spacing.lg },
  heading: { flex: 1, gap: spacing.xs },
  metadata: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: spacing.lg, rowGap: spacing.xs, marginTop: spacing.sm },
  trailing: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.md },
  date: { fontVariant: ['tabular-nums'], letterSpacing: 1.4 },
  refresh: { minWidth: 54, minHeight: 44, alignItems: 'center', justifyContent: 'center' }, refreshActive: { opacity: 0.65 },
  manual: { minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.sm },
  upload: { minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg, borderRadius: 5, backgroundColor: colors.brand },
});
