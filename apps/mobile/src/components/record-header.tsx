import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';
import { colors, spacing } from '@/theme';

export function RecordHeader() {
  const { isCompact, isDesktop } = useResponsiveLayout();
  return (
    <View style={[styles.container, isDesktop && styles.desktopContainer, isCompact && styles.compact]}>
      <View style={[styles.heading, isCompact && styles.compactHeading]}>
        <AppText variant="metadata" color="textPrimary" style={styles.date}>August 2026</AppText>
        <AppText variant="section">Health record</AppText>
      </View>
      <AppText variant="caption" color="textMuted">Last report · 12 August 2026</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginHorizontal: -16, paddingHorizontal: 16, paddingVertical: spacing.xl, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.xl },
  desktopContainer: { marginHorizontal: -40, paddingHorizontal: 40 },
  compact: { marginHorizontal: -16, paddingHorizontal: 16, paddingTop: spacing.xl, paddingBottom: spacing.lg, alignItems: 'flex-start', flexDirection: 'column', gap: spacing.sm },
  heading: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.lg },
  compactHeading: { flexDirection: 'column', gap: spacing.xs },
  date: { fontVariant: ['tabular-nums'], letterSpacing: 1.4 },
});
