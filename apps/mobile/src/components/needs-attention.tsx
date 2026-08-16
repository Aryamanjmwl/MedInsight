import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { getStatusColor, getStatusLabel } from '@/components/status-utils';
import { attentionBiomarkers } from '@/data/mock-data';
import { colors, radii, spacing } from '@/theme';

export function NeedsAttention() {
  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <AppText variant="metadata" color="textMuted">Needs Attention</AppText>
        <AppText variant="section" color="statusHigh">{attentionBiomarkers.length}</AppText>
      </View>
      {attentionBiomarkers.map((item) => {
        const statusColor = getStatusColor(item.status);
        return (
          <View key={item.id} style={styles.row}>
            <View style={[styles.marker, { backgroundColor: statusColor }]} />
            <View style={styles.details}>
              <AppText variant="label">{item.name}</AppText>
              <AppText variant="section" style={[styles.numeric, { color: statusColor }]}>{item.value} <AppText variant="caption" style={{ color: statusColor }}>{item.unit}</AppText></AppText>
              <AppText variant="caption" color="textFaint">Reference {item.reference}</AppText>
            </View>
            <AppText variant="metadata" style={{ color: statusColor }}>{getStatusLabel(item.status)}</AppText>
          </View>
        );
      })}
      <Pressable accessibilityRole="button" style={styles.action}><AppText variant="label" color="brand">Review all →</AppText></Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { width: '100%', minWidth: 0, padding: spacing.xl, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: spacing.md },
  row: { minHeight: 92, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, paddingVertical: spacing.lg, borderTopWidth: 1, borderTopColor: colors.borderSubtle },
  marker: { width: 2, height: 42, marginTop: spacing.xs }, details: { flex: 1, gap: spacing.xxs },
  numeric: { fontVariant: ['tabular-nums'] }, action: { paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.borderSubtle },
});
