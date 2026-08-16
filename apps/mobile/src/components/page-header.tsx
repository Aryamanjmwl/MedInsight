import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { spacing } from '@/theme';

type PageHeaderProps = {
  title: string;
  description: string;
  eyebrow?: string;
};

export function PageHeader({ title, description, eyebrow }: PageHeaderProps) {
  return (
    <View style={styles.container}>
      {eyebrow ? (
        <AppText variant="metadata" color="textMuted">
          {eyebrow.toUpperCase()}
        </AppText>
      ) : null}
      <AppText variant="display">{title}</AppText>
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
    paddingBottom: spacing.sm,
  },
  description: {
    maxWidth: 600,
  },
});
