import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import type { ApiError, BiomarkerExplanation } from '@/api';
import { AppText } from '@/components/app-text';
import { colors, radii, spacing } from '@/theme';

type BiomarkerExplanationPanelProps = {
  explanation: BiomarkerExplanation | null;
  loading: boolean;
  error: ApiError | null;
  onRequest: () => void;
};

export function BiomarkerExplanationPanel({ explanation, loading, error, onRequest }: BiomarkerExplanationPanelProps) {
  const unavailable = error?.status === 503;

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <View style={styles.headingCopy}>
          <AppText variant="metadata" color="textMuted">AI Explanation</AppText>
          <AppText variant="section">Explain this result</AppText>
          {!explanation ? (
            <AppText variant="caption" color="textMuted">
              Get a concise educational explanation based only on this saved structured result.
            </AppText>
          ) : null}
        </View>
        {!explanation && !loading ? (
          <Pressable
            accessibilityRole="button"
            onPress={onRequest}
            style={({ pressed, hovered }) => [styles.action, (pressed || hovered) && styles.actionActive]}
          >
            <AppText variant="label" style={styles.actionText}>{error ? 'Try again' : 'Explain'}</AppText>
          </Pressable>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.state} accessibilityLiveRegion="polite">
          <ActivityIndicator size="small" color={colors.brand} />
          <AppText variant="caption" color="textMuted">Preparing explanation…</AppText>
        </View>
      ) : null}

      {error ? (
        <View style={styles.errorState} accessibilityLiveRegion="polite">
          <AppText variant="label" color="textSecondary">
            {unavailable ? 'AI explanations are currently unavailable.' : 'The explanation could not be loaded.'}
          </AppText>
          <AppText variant="caption" color="textMuted">{error.message}</AppText>
        </View>
      ) : null}

      {explanation ? (
        <View style={styles.content}>
          <ExplanationSection title="Summary" text={explanation.summary} />
          <ExplanationSection title="What this measures" text={explanation.what_it_measures} />
          <ExplanationSection title="Your result" text={explanation.result_context} />
          <ExplanationList title="General context" items={explanation.possible_context} />
          {explanation.trend_context ? <ExplanationSection title="Trend" text={explanation.trend_context} /> : null}
          <ExplanationList title="Questions you could ask" items={explanation.questions_for_doctor} />
          <View style={styles.safetyNote}>
            <AppText variant="metadata" color="textMuted">Safety note</AppText>
            <AppText variant="caption" color="textSecondary">{explanation.safety_note}</AppText>
          </View>
          <Pressable accessibilityRole="button" onPress={onRequest} style={({ pressed, hovered }) => [(pressed || hovered) && styles.actionActive]}>
            <AppText variant="label" color="brand">Refresh explanation</AppText>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function ExplanationSection({ title, text }: { title: string; text: string }) {
  return (
    <View style={styles.section}>
      <AppText variant="metadata" color="textMuted">{title}</AppText>
      <AppText color="textSecondary">{text}</AppText>
    </View>
  );
}

function ExplanationList({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <View style={styles.section}>
      <AppText variant="metadata" color="textMuted">{title}</AppText>
      {items.map((item, index) => (
        <View key={`${title}-${index}`} style={styles.listRow}>
          <AppText color="textFaint">•</AppText>
          <AppText color="textSecondary" style={styles.listText}>{item}</AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: spacing.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surfaceSubtle },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.lg },
  headingCopy: { flex: 1, minWidth: 220, gap: spacing.xs },
  action: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.lg, borderRadius: radii.sm, backgroundColor: colors.brand },
  actionText: { color: colors.white },
  actionActive: { opacity: 0.68 },
  state: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  errorState: { gap: spacing.xs, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.borderSubtle },
  content: { gap: spacing.lg, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  section: { gap: spacing.xs },
  listRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  listText: { flex: 1 },
  safetyNote: { gap: spacing.xs, padding: spacing.md, borderLeftWidth: 2, borderLeftColor: colors.brand, backgroundColor: colors.brandMuted },
});
