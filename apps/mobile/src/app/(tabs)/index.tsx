import { StyleSheet, View } from 'react-native';

import { BiomarkerExplorer } from '@/components/biomarker-explorer';
import { HealthTimeline } from '@/components/health-timeline';
import { LatestMeasurements } from '@/components/latest-measurements';
import { LatestReportPanel } from '@/components/latest-report-panel';
import { NeedsAttention } from '@/components/needs-attention';
import { RecordHeader } from '@/components/record-header';
import { Screen } from '@/components/screen';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';
import { layout, spacing } from '@/theme';

export default function DashboardScreen() {
  const { isDesktop } = useResponsiveLayout();
  return (
    <Screen>
      <RecordHeader />
      {isDesktop ? (
        <View style={styles.desktopGrid}>
          <View style={styles.mainColumn}>
            <LatestReportPanel />
            <BiomarkerExplorer />
            <HealthTimeline />
          </View>
          <View style={styles.supportingRail}>
            <NeedsAttention />
            <LatestMeasurements />
          </View>
        </View>
      ) : (
        <View style={styles.mobileFlow}>
          <LatestReportPanel />
          <BiomarkerExplorer />
          <NeedsAttention />
          <LatestMeasurements />
          <HealthTimeline />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  desktopGrid: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xl },
  mainColumn: { flex: 1, minWidth: 0, gap: spacing.lg },
  supportingRail: { width: layout.supportingRailWidth, gap: spacing.lg },
  mobileFlow: { width: '100%', minWidth: 0, gap: spacing.xl },
});
