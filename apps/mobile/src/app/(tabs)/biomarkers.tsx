import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { BiomarkerRow } from '@/components/biomarker-row';
import { PageHeader } from '@/components/page-header';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { biomarkers } from '@/data/mock-data';
import { colors, radii, spacing } from '@/theme';

export default function BiomarkersScreen() {
  return (
    <Screen>
      <PageHeader
        title="Biomarkers"
        description="Review the latest values from your saved reports. Trends will remain purely mathematical."
      />
      <View style={styles.contextCard}>
        <AppText variant="bodyStrong">Mock overview</AppText>
        <AppText color="textSecondary">
          Values shown in this shell are placeholders and are not connected to your backend.
        </AppText>
      </View>
      <View style={styles.section}>
        <SectionHeader
          title="Latest measurements"
          supportingText={`${biomarkers.length} biomarkers shown`}
        />
        <View style={styles.list}>
          {biomarkers.map((item) => (
            <BiomarkerRow key={item.id} biomarker={item} />
          ))}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  contextCard: {
    gap: spacing.xs,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.brandMuted,
  },
  section: { gap: spacing.md },
  list: {
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
});
