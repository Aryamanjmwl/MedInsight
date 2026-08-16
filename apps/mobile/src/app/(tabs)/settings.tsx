import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { PageHeader } from '@/components/page-header';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { SettingsRow } from '@/components/settings-row';
import { colors, radii, spacing } from '@/theme';

export default function SettingsScreen() {
  return (
    <Screen>
      <PageHeader
        title="Settings"
        description="Manage application preferences and local data presentation."
      />
      <View style={styles.section}>
        <SectionHeader title="Application" />
        <View style={styles.list}>
          <SettingsRow
            title="Appearance"
            description="Warm light appearance with accessible contrast."
            value="Light"
          />
          <SettingsRow
            title="Data presentation"
            description="Measurements use the units printed in each report."
            value="Report units"
          />
          <SettingsRow
            title="Notifications"
            description="Report and biomarker notifications."
            value="Off"
          />
        </View>
      </View>
      <View style={styles.notice}>
        <AppText variant="label" color="textSecondary">
          MEDINSIGHT MOBILE
        </AppText>
        <AppText variant="caption" color="textMuted">
          This interface does not provide medical advice or diagnosis.
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  list: {
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  notice: {
    gap: spacing.xs,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceMuted,
  },
});
