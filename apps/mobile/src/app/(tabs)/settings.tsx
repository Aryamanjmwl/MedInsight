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
        description="Application preferences and account controls will be configured here in later stages."
      />
      <View style={styles.section}>
        <SectionHeader title="Application" />
        <View style={styles.list}>
          <SettingsRow
            title="Appearance"
            description="MedInsight currently uses its light healthcare theme."
            value="Light"
          />
          <SettingsRow
            title="Data source"
            description="Backend connectivity has not been configured."
            value="Mock data"
          />
          <SettingsRow
            title="Notifications"
            description="Report and biomarker notifications are not enabled."
            value="Off"
          />
        </View>
      </View>
      <View style={styles.notice}>
        <AppText variant="label" color="textSecondary">
          MEDINSIGHT MOBILE · FOUNDATION
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
