import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { spacing } from '@/theme';

type SectionHeaderProps = {
  title: string;
  supportingText?: string;
};

export function SectionHeader({ title, supportingText }: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <AppText variant="section">{title}</AppText>
      {supportingText ? (
        <AppText variant="caption" color="textSecondary">
          {supportingText}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
});
