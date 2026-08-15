import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import type { BiomarkerStatus } from '@/data/mock-data';
import { colors, radii, spacing } from '@/theme';

const statusStyles = {
  normal: { label: 'In range', text: colors.statusNormal, background: colors.statusNormalMuted },
  high: { label: 'High', text: colors.statusHigh, background: colors.statusHighMuted },
  low: { label: 'Low', text: colors.statusLow, background: colors.statusLowMuted },
};

export function StatusBadge({ status }: { status: BiomarkerStatus }) {
  const statusStyle = statusStyles[status];
  return (
    <View style={[styles.badge, { backgroundColor: statusStyle.background }]}>
      <AppText variant="caption" style={{ color: statusStyle.text }}>
        {statusStyle.label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
});
