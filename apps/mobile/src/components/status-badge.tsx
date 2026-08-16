import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import type { BiomarkerStatus } from '@/data/mock-data';
import { colors, radii, spacing } from '@/theme';

const statusStyles = {
  normal: { label: 'In range', text: colors.textMuted },
  high: { label: 'High', text: colors.statusHigh },
  low: { label: 'Low', text: colors.statusLow },
};

export function StatusBadge({ status }: { status: BiomarkerStatus }) {
  const statusStyle = statusStyles[status];
  return (
    <View style={styles.badge}>
      {status !== 'normal' ? <View style={[styles.marker, { backgroundColor: statusStyle.text }]} /> : null}
      <AppText variant="metadata" style={{ color: statusStyle.text }}>
        {statusStyle.label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  marker: { width: 2, height: 12, borderRadius: radii.xs },
});
