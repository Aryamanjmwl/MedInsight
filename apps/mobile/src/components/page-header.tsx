import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';
import { spacing } from '@/theme';

type PageHeaderProps = {
  title: string;
  description: string;
  eyebrow?: string;
};

export function PageHeader({ title, description, eyebrow }: PageHeaderProps) {
  const { isCompact } = useResponsiveLayout();
  return (
    <View style={[styles.container, isCompact && styles.compactContainer]}>
      {eyebrow ? (
        <AppText variant="metadata" color="textMuted">
          {eyebrow.toUpperCase()}
        </AppText>
      ) : null}
      <AppText variant={isCompact ? 'title' : 'display'}>{title}</AppText>
      <AppText color="textSecondary" style={styles.description}>
        {description}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.md,
  },
  compactContainer: { paddingTop: spacing.xl, paddingBottom: 0 },
  description: {
    maxWidth: 600,
  },
});
