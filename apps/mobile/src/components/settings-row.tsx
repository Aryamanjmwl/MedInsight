import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { colors, spacing } from '@/theme';

type SettingsRowProps = {
  title: string;
  description: string;
  value: string;
};

export function SettingsRow({ title, description, value }: SettingsRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        <AppText variant="bodyStrong">{title}</AppText>
        <AppText variant="caption" color="textSecondary">
          {description}
        </AppText>
      </View>
      <AppText variant="label" color="brand">
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  copy: {
    flex: 1,
    gap: spacing.xs,
  },
});
