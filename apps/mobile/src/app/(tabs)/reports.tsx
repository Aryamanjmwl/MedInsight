import { StyleSheet, View } from 'react-native';

import { PageHeader } from '@/components/page-header';
import { ReportCard } from '@/components/report-card';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { reports } from '@/data/mock-data';
import { spacing } from '@/theme';

export default function ReportsScreen() {
  return (
    <Screen>
      <PageHeader
        title="Reports"
        description="Your processed laboratory reports will be available here. Upload and backend connectivity come next."
      />
      <View style={styles.section}>
        <SectionHeader title="Report history" supportingText={`${reports.length} mock reports`} />
        <View style={styles.list}>
          {reports.map((report) => (
            <ReportCard key={report.id} report={report} />
          ))}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  list: { gap: spacing.md },
});
