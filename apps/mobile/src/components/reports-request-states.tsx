import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { colors, radii, spacing } from '@/theme';

export function ReportsLoadingState() {
  return (
    <View style={styles.loading} accessibilityLiveRegion="polite">
      <View style={styles.loadingHeading}>
        <ActivityIndicator size="small" color={colors.brand} />
        <AppText variant="label" color="textSecondary">Loading saved reports</AppText>
      </View>
      {[0, 1, 2].map((item) => <View key={item} style={styles.loadingRow}><View style={styles.dateLine} /><View style={styles.detailLines}><View style={styles.longLine} /><View style={styles.shortLine} /></View></View>)}
    </View>
  );
}

export function ReportsErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <MessagePanel title="Unable to load reports" copy="MedInsight could not retrieve your saved reports.">
      <Action label="Try again" onPress={onRetry} />
    </MessagePanel>
  );
}

export function ReportsEmptyState({ refreshing, refreshFailed, onUpload, onRefresh }: { refreshing: boolean; refreshFailed: boolean; onUpload: () => void; onRefresh: () => void }) {
  return (
    <MessagePanel title="No laboratory reports yet" copy="Upload your first report to begin building your longitudinal health record.">
      {refreshFailed ? <AppText variant="caption" color="textSecondary">The report list could not be refreshed.</AppText> : null}
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" onPress={onUpload} style={({ pressed, hovered }) => [styles.upload, (pressed || hovered) && styles.active]}>
          <AppText variant="label" color="textSecondary">Upload report</AppText>
        </Pressable>
        <Pressable accessibilityRole="button" disabled={refreshing} onPress={onRefresh} style={styles.refreshAction}>
          {refreshing ? <ActivityIndicator size="small" color={colors.brand} /> : <AppText variant="label" color="brand">Refresh</AppText>}
        </Pressable>
      </View>
    </MessagePanel>
  );
}

export function NoMatchingReports() {
  return (
    <View style={styles.noMatches}>
      <AppText variant="section">No matching reports</AppText>
      <AppText variant="caption" color="textMuted">Try a different filename.</AppText>
    </View>
  );
}

export function ReportsRefreshError({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={styles.refreshError}>
      <AppText variant="caption" color="textSecondary" style={styles.refreshCopy}>The latest report list could not be refreshed.</AppText>
      <Action label="Try again" onPress={onRetry} />
    </View>
  );
}

function MessagePanel({ title, copy, children }: { title: string; copy: string; children: ReactNode }) {
  return (
    <View style={styles.messagePanel}>
      <AppText variant="title">{title}</AppText>
      <AppText color="textSecondary" style={styles.copy}>{copy}</AppText>
      {children}
    </View>
  );
}

function Action({ label, onPress }: { label: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed, hovered }) => [(pressed || hovered) && styles.active]}><AppText variant="label" color="brand">{label}</AppText></Pressable>;
}

const styles = StyleSheet.create({
  loading: { minHeight: 280, gap: spacing.md, padding: spacing.xl, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface },
  loadingHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  loadingRow: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: spacing.xl, borderTopWidth: 1, borderTopColor: colors.borderSubtle },
  dateLine: { width: 48, height: 1, backgroundColor: colors.borderStrong }, detailLines: { flex: 1, gap: spacing.md },
  longLine: { width: '52%', height: 1, backgroundColor: colors.border }, shortLine: { width: '30%', height: 1, backgroundColor: colors.border },
  messagePanel: { minHeight: 260, alignItems: 'flex-start', justifyContent: 'center', gap: spacing.md, padding: spacing.xxl, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface },
  copy: { maxWidth: 560 }, actions: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.lg },
  upload: { minHeight: 42, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radii.sm },
  refreshAction: { minWidth: 54, minHeight: 42, alignItems: 'center', justifyContent: 'center' }, active: { opacity: 0.65 },
  noMatches: { minHeight: 150, alignItems: 'flex-start', justifyContent: 'center', gap: spacing.xs, padding: spacing.xl, borderTopWidth: 1, borderTopColor: colors.border },
  refreshError: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.md, padding: spacing.md, borderLeftWidth: 2, borderLeftColor: colors.statusLow, backgroundColor: colors.statusLowMuted },
  refreshCopy: { flex: 1, minWidth: 220 },
});
