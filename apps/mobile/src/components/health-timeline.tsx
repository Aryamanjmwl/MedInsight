import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { healthHistory } from '@/data/mock-data';
import { colors, radii, spacing } from '@/theme';

export function HealthTimeline() {
  return (
    <View style={styles.section}>
      <AppText variant="metadata" color="textMuted">Health History</AppText>
      {healthHistory.map((group) => (
        <View key={group.year} style={styles.yearGroup}>
          <View style={styles.yearHeader}>
            <AppText variant="section" style={styles.year}>{group.year}</AppText>
            <View style={styles.yearRule} />
          </View>
          <View style={styles.timeline}>
            <View style={styles.line} />
            {group.entries.map((entry, index) => {
              const latest = group.year === '2026' && index === 0;
              return (
                <Pressable
                  key={entry.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${entry.title} from ${entry.date}`}
                  style={({ pressed, hovered }) => [styles.entry, (pressed || hovered) && styles.entryActive]}>
                  <View style={[styles.dot, latest && styles.latestDot]} />
                  <View style={styles.entryContent}>
                    <AppText variant="metadata" color={latest ? 'textPrimary' : 'textSecondary'} style={styles.date}>{entry.date}</AppText>
                    <AppText variant="bodyStrong" style={latest && styles.latestTitle}>{entry.title}</AppText>
                    <AppText variant="caption" color="textMuted">
                      {entry.biomarkerCount} biomarkers
                      {entry.outsideRange ? <AppText variant="caption" color="statusHigh"> · {entry.outsideRange} outside range</AppText> : null}
                    </AppText>
                    {entry.highlights.length ? (
                      <AppText variant="caption" color="textSecondary">{entry.highlights.join(' · ')}</AppText>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.xl, paddingVertical: spacing.lg },
  yearGroup: { maxWidth: 560, gap: spacing.lg },
  yearHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  year: { fontVariant: ['tabular-nums'] }, yearRule: { flex: 1, height: 1, backgroundColor: colors.textPrimary },
  timeline: { position: 'relative', paddingLeft: spacing.xxl },
  line: { position: 'absolute', left: 5, top: 7, bottom: 30, width: 1, backgroundColor: colors.borderStrong },
  entry: { position: 'relative', minHeight: 116, paddingBottom: spacing.xl, opacity: 0.92 },
  entryActive: { opacity: 1 },
  dot: { position: 'absolute', left: -32, top: 2, width: 11, height: 11, borderWidth: 1.5, borderColor: colors.textMuted, borderRadius: radii.pill, backgroundColor: colors.background },
  latestDot: { borderColor: colors.textPrimary, backgroundColor: colors.textPrimary },
  entryContent: { gap: spacing.xs },
  date: { fontVariant: ['tabular-nums'] }, latestTitle: { color: colors.textPrimary },
});
