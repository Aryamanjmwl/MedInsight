import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { BiomarkerRow } from '@/components/biomarker-row';
import { PageHeader } from '@/components/page-header';
import { Screen } from '@/components/screen';
import { biomarkers, type BiomarkerStatus } from '@/data/mock-data';
import { colors, radii, spacing } from '@/theme';

type Filter = 'all' | 'attention' | 'normal';
const filters: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'attention', label: 'Needs attention' },
  { id: 'normal', label: 'In range' },
];

function matchesFilter(status: BiomarkerStatus, filter: Filter) {
  if (filter === 'attention') return status !== 'normal';
  if (filter === 'normal') return status === 'normal';
  return true;
}

export default function BiomarkersScreen() {
  const [filter, setFilter] = useState<Filter>('all');
  const visibleBiomarkers = biomarkers.filter(({ status }) => matchesFilter(status, filter));
  return (
    <Screen>
      <PageHeader title="Biomarkers" description="Latest measurements and changes across your laboratory reports." />
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <AppText variant="metadata" color="textMuted">Latest Measurements</AppText>
          <AppText variant="caption" color="textMuted">{visibleBiomarkers.length} shown</AppText>
        </View>
        <View accessibilityRole="tablist" style={styles.filters}>
          {filters.map((item) => {
            const active = filter === item.id;
            return (
              <Pressable key={item.id} accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={() => setFilter(item.id)} style={[styles.filter, active && styles.activeFilter]}>
                <AppText variant="label" color={active ? 'textPrimary' : 'textMuted'}>{item.label}</AppText>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.list}>
          {visibleBiomarkers.map((item) => <BiomarkerRow key={item.id} biomarker={item} />)}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  filters: { flexDirection: 'row', flexWrap: 'wrap', borderBottomWidth: 1, borderBottomColor: colors.border },
  filter: { minHeight: 40, justifyContent: 'center', paddingHorizontal: spacing.md, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeFilter: { borderBottomColor: colors.textPrimary },
  list: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface, overflow: 'hidden' },
});
