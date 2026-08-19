import { StyleSheet, View } from 'react-native';

import type { BiomarkerStatus, MeasurementSource } from '@/api';
import { AppText } from '@/components/app-text';
import { getStatusColor, getStatusLabel } from '@/components/status-utils';
import { radii, spacing } from '@/theme';

export function StatusBadge({ status, source = 'report' }: { status: BiomarkerStatus; source?: MeasurementSource }) {
  const textColor = getStatusColor(status);
  return (
    <View style={styles.badge}>
      {status !== 'normal' ? <View style={[styles.marker, { backgroundColor: textColor }]} /> : null}
      <AppText variant="metadata" style={{ color: textColor }}>
        {getStatusLabel(status, source)}
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
