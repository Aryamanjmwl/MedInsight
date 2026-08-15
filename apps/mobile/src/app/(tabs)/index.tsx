import { StyleSheet, View } from 'react-native';

import { BiomarkerRow } from '@/components/biomarker-row';
import { PageHeader } from '@/components/page-header';
import { ReportCard } from '@/components/report-card';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { SummaryCard } from '@/components/summary-card';
import { TrendPlaceholder } from '@/components/trend-placeholder';
import { biomarkers, reports, summaryMetrics } from '@/data/mock-data';
import { colors, radii, spacing } from '@/theme';

export default function DashboardScreen() {
  return (
    <Screen>
      <PageHeader
        eyebrow="Health overview"
        title="MedInsight"
        description="A clear view of your laboratory report history and the results that may need attention."
      />

      <View style={styles.summaryGrid}>
        {summaryMetrics.map((metric) => (
          <SummaryCard key={metric.label} {...metric} />
        ))}
      </View>

      <View style={styles.section}>
        <SectionHeader
          title="Needs Attention"
          supportingText="Based only on the reference ranges printed in your reports"
        />
        <View style={styles.surfaceList}>
          {biomarkers
            .filter((item) => item.status !== 'normal')
            .map((item) => (
              <BiomarkerRow key={item.id} biomarker={item} />
            ))}
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Recent Biomarkers" supportingText="Latest reported measurements" />
        <View style={styles.surfaceList}>
          {biomarkers.slice(0, 3).map((item) => (
            <BiomarkerRow key={item.id} biomarker={item} />
          ))}
        </View>
      </View>

      <TrendPlaceholder />

      <View style={styles.section}>
        <SectionHeader title="Recent Reports" supportingText="Recently processed documents" />
        <View style={styles.reportList}>
          {reports.slice(0, 2).map((report) => (
            <ReportCard key={report.id} report={report} />
          ))}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  section: {
    gap: spacing.md,
  },
  surfaceList: {
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  reportList: {
    gap: spacing.md,
  },
});
