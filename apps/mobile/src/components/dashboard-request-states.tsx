import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';
import { colors, radii, spacing } from '@/theme';

export function DashboardLoadingState() {
  return (
    <View style={styles.stateStack}>
      <StateHeader metadata="HEALTH RECORD" detail="Loading latest record" />
      <View style={styles.loadingGrid}>
        <View style={[styles.panel, styles.loadingPrimary]}>
          <View style={styles.loadingTitle}>
            <ActivityIndicator size="small" color={colors.brand} />
            <AppText variant="label" color="textSecondary">Loading your health record</AppText>
          </View>
          <View style={[styles.loadingLine, styles.longLine]} />
          <View style={[styles.loadingLine, styles.mediumLine]} />
          <View style={[styles.loadingLine, styles.shortLine]} />
        </View>
        <View style={[styles.panel, styles.loadingSecondary]}>
          <View style={[styles.loadingLine, styles.mediumLine]} />
          <View style={[styles.loadingLine, styles.longLine]} />
          <View style={[styles.loadingLine, styles.shortLine]} />
        </View>
      </View>
    </View>
  );
}

export function DashboardErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={styles.stateStack}>
      <StateHeader metadata="HEALTH RECORD" detail="Health data unavailable" />
      <View style={[styles.panel, styles.messagePanel]}>
        <AppText variant="section">Unable to load your health record</AppText>
        <AppText color="textSecondary">MedInsight could not reach the health data service.</AppText>
        <Pressable accessibilityRole="button" onPress={onRetry} style={({ hovered, pressed }) => [styles.action, (hovered || pressed) && styles.actionActive]}>
          <AppText variant="label" color="brand">Try again</AppText>
        </Pressable>
      </View>
    </View>
  );
}

type DashboardEmptyStateProps = {
  onUpload: () => void;
  onRefresh: () => void;
  refreshing: boolean;
  refreshFailed: boolean;
};

export function DashboardEmptyState({ onUpload, onRefresh, refreshing, refreshFailed }: DashboardEmptyStateProps) {
  return (
    <View style={styles.stateStack}>
      <StateHeader metadata="HEALTH RECORD" detail="No reports recorded" />
      <View style={[styles.panel, styles.messagePanel]}>
        <AppText variant="title">Your health record starts here</AppText>
        <AppText color="textSecondary" style={styles.messageCopy}>Upload your first laboratory report to begin tracking biomarkers over time.</AppText>
        {refreshFailed ? <AppText variant="caption" color="textSecondary">The latest dashboard data could not be refreshed.</AppText> : null}
        <View style={styles.emptyActions}>
          <Pressable accessibilityRole="button" onPress={onUpload} style={({ hovered, pressed }) => [styles.outlineAction, (hovered || pressed) && styles.actionActive]}>
            <AppText variant="label" color="textSecondary">Upload report</AppText>
          </Pressable>
          <Pressable accessibilityRole="button" disabled={refreshing} onPress={onRefresh} style={({ hovered, pressed }) => [styles.action, (hovered || pressed) && styles.actionActive]}>
            {refreshing ? <ActivityIndicator size="small" color={colors.brand} /> : <AppText variant="label" color="brand">Refresh</AppText>}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export function DashboardRefreshError({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={styles.refreshError}>
      <AppText variant="caption" color="textSecondary" style={styles.refreshCopy}>The latest dashboard data could not be refreshed.</AppText>
      <Pressable accessibilityRole="button" onPress={onRetry}><AppText variant="label" color="brand">Try again</AppText></Pressable>
    </View>
  );
}

function StateHeader({ metadata, detail }: { metadata: string; detail: string }) {
  const { isDesktop } = useResponsiveLayout();
  return (
    <View style={[styles.stateHeader, isDesktop && styles.desktopStateHeader]}>
      <View style={styles.stateHeading}>
        <AppText variant="metadata" color="textPrimary">{metadata}</AppText>
        <AppText variant="section">Health record</AppText>
      </View>
      <AppText variant="caption" color="textMuted">{detail}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  stateStack: { gap: spacing.xxl },
  stateHeader: { marginHorizontal: -16, paddingHorizontal: 16, paddingVertical: spacing.xl, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.md },
  desktopStateHeader: { marginHorizontal: -40, paddingHorizontal: 40 },
  stateHeading: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: spacing.lg },
  loadingGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xl },
  panel: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface },
  loadingPrimary: { minWidth: 280, flex: 1.7, minHeight: 250, justifyContent: 'center', gap: spacing.xl, padding: spacing.xl },
  loadingSecondary: { minWidth: 240, flex: 1, minHeight: 250, justifyContent: 'center', gap: spacing.xl, padding: spacing.xl },
  loadingTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  loadingLine: { height: 1, backgroundColor: colors.border }, longLine: { width: '88%' }, mediumLine: { width: '64%' }, shortLine: { width: '42%' },
  messagePanel: { minHeight: 260, alignItems: 'flex-start', justifyContent: 'center', gap: spacing.md, padding: spacing.xxl },
  messageCopy: { maxWidth: 540 }, action: { minHeight: 38, justifyContent: 'center', marginTop: spacing.sm },
  emptyActions: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.lg },
  outlineAction: { minHeight: 42, justifyContent: 'center', paddingHorizontal: spacing.lg, marginTop: spacing.sm, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radii.sm },
  actionActive: { opacity: 0.65 },
  refreshError: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.md, padding: spacing.md, borderLeftWidth: 2, borderLeftColor: colors.statusLow, backgroundColor: colors.statusLowMuted },
  refreshCopy: { flex: 1, minWidth: 220 },
});
