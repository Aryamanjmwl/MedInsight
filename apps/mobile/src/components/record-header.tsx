import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';
import { colors, spacing } from '@/theme';
import { formatFullDate, formatMonthHeader } from '@/utils/formatting';

type RecordHeaderProps = { latestReportDate: string; refreshing: boolean; onRefresh: () => void };

export function RecordHeader({ latestReportDate, refreshing, onRefresh }: RecordHeaderProps) {
  const { isCompact, isDesktop } = useResponsiveLayout();
  return (
    <View style={[styles.container, isDesktop && styles.desktopContainer, isCompact && styles.compact]}>
      <View style={[styles.heading, isCompact && styles.compactHeading]}>
        <AppText variant="metadata" color="textPrimary" style={styles.date}>{formatMonthHeader(latestReportDate)}</AppText>
        <AppText variant="section">Health record</AppText>
      </View>
      <View style={styles.trailing}>
        <AppText variant="caption" color="textMuted">Last report · {formatFullDate(latestReportDate)}</AppText>
        <Pressable accessibilityRole="button" accessibilityLabel="Refresh dashboard" disabled={refreshing} onPress={onRefresh} style={({ hovered, pressed }) => [styles.refresh, (hovered || pressed) && styles.refreshActive]}>
          {refreshing ? <ActivityIndicator size="small" color={colors.brand} /> : <AppText variant="label" color="brand">Refresh</AppText>}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginHorizontal: -16, paddingHorizontal: 16, paddingVertical: spacing.xl, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.xl },
  desktopContainer: { marginHorizontal: -40, paddingHorizontal: 40 },
  compact: { marginHorizontal: -16, paddingHorizontal: 16, paddingTop: spacing.xl, paddingBottom: spacing.lg, alignItems: 'flex-start', flexDirection: 'column', gap: spacing.sm },
  heading: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.lg }, compactHeading: { flexDirection: 'column', gap: spacing.xs },
  trailing: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.md },
  date: { fontVariant: ['tabular-nums'], letterSpacing: 1.4 },
  refresh: { minWidth: 54, minHeight: 32, alignItems: 'center', justifyContent: 'center' }, refreshActive: { opacity: 0.65 },
});
