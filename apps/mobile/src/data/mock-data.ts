export type BiomarkerStatus = 'normal' | 'high' | 'low';
export type MockBiomarker = {
  id: string; name: string; value: string; unit: string; reference: string;
  status: BiomarkerStatus; date: string; trend?: 'up' | 'down' | 'stable'; change?: string;
};
export type MockReport = {
  id: string; filename: string; title: string; laboratory?: string; date: string;
  dateLabel: string; year: string; biomarkerCount: number; needsAttention: number;
};
export type TrendMeasurement = { month: string; date: string; value: number };
export type MockBiomarkerTrend = {
  id: string; name: string; unit: string; status: BiomarkerStatus; reference: string;
  referenceMarkers: number[]; absoluteChange: string; percentChange: string; measurements: TrendMeasurement[];
};
export type TimelineEntry = {
  id: string; date: string; title: string; biomarkerCount: number;
  outsideRange: number; highlights: string[];
};
export type TimelineYear = { year: string; entries: TimelineEntry[] };

export const biomarkers: MockBiomarker[] = [
  { id: 'ldl', name: 'LDL Cholesterol', value: '167', unit: 'mg/dL', reference: '<100', status: 'high', date: '12 Aug 2026', trend: 'up', change: '+18 mg/dL since May' },
  { id: 'hemoglobin', name: 'Hemoglobin', value: '10.8', unit: 'g/dL', reference: '12.0–15.5', status: 'low', date: '12 Aug 2026', trend: 'down', change: '−0.7 g/dL since May' },
  { id: 'glucose', name: 'Fasting Glucose', value: '92', unit: 'mg/dL', reference: '70–99', status: 'normal', date: '12 Aug 2026', trend: 'stable', change: '+1 mg/dL since May' },
  { id: 'creatinine', name: 'Creatinine', value: '0.84', unit: 'mg/dL', reference: '0.6–1.1', status: 'normal', date: '12 Aug 2026', trend: 'stable', change: '+0.01 mg/dL since May' },
  { id: 'hdl', name: 'HDL Cholesterol', value: '48', unit: 'mg/dL', reference: '>40', status: 'normal', date: '12 Aug 2026', change: 'First recorded measurement' },
];

export const reports: MockReport[] = [
  { id: 'annual-2026', filename: 'Annual blood panel.pdf', title: 'Annual Blood Panel', laboratory: 'City Diagnostics Lab', date: '12 Aug 2026', dateLabel: '12 AUG', year: '2026', biomarkerCount: 9, needsAttention: 2 },
  { id: 'metabolic-2026', filename: 'Metabolic panel.pdf', title: 'Metabolic Panel', date: '04 May 2026', dateLabel: '04 MAY', year: '2026', biomarkerCount: 5, needsAttention: 0 },
  { id: 'routine-2025', filename: 'Routine laboratory report.pdf', title: 'Routine Laboratory Report', date: '18 Nov 2025', dateLabel: '18 NOV', year: '2025', biomarkerCount: 8, needsAttention: 1 },
];

export const biomarkerTrends: MockBiomarkerTrend[] = [
  { id: 'ldl', name: 'LDL Cholesterol', unit: 'mg/dL', status: 'high', reference: '<100 mg/dL', referenceMarkers: [100], absoluteChange: '+49 mg/dL', percentChange: '+41.5%', measurements: [
    { month: 'JAN', date: 'Jan 2026', value: 118 }, { month: 'MAR', date: 'Mar 2026', value: 132 },
    { month: 'MAY', date: 'May 2026', value: 149 }, { month: 'AUG', date: 'Aug 2026', value: 167 },
  ] },
  { id: 'hemoglobin', name: 'Hemoglobin', unit: 'g/dL', status: 'low', reference: '12.0–15.5 g/dL', referenceMarkers: [12, 15.5], absoluteChange: '−1.6 g/dL', percentChange: '−12.9%', measurements: [
    { month: 'JAN', date: 'Jan 2026', value: 12.4 }, { month: 'MAR', date: 'Mar 2026', value: 12.1 },
    { month: 'MAY', date: 'May 2026', value: 11.5 }, { month: 'AUG', date: 'Aug 2026', value: 10.8 },
  ] },
  { id: 'glucose', name: 'Fasting Glucose', unit: 'mg/dL', status: 'normal', reference: '70–99 mg/dL', referenceMarkers: [70, 99], absoluteChange: '+4 mg/dL', percentChange: '+4.5%', measurements: [
    { month: 'JAN', date: 'Jan 2026', value: 88 }, { month: 'MAR', date: 'Mar 2026', value: 90 },
    { month: 'MAY', date: 'May 2026', value: 91 }, { month: 'AUG', date: 'Aug 2026', value: 92 },
  ] },
  { id: 'creatinine', name: 'Creatinine', unit: 'mg/dL', status: 'normal', reference: '0.6–1.1 mg/dL', referenceMarkers: [0.6, 1.1], absoluteChange: '+0.02 mg/dL', percentChange: '+2.4%', measurements: [
    { month: 'JAN', date: 'Jan 2026', value: 0.82 }, { month: 'MAY', date: 'May 2026', value: 0.83 },
    { month: 'AUG', date: 'Aug 2026', value: 0.84 },
  ] },
];

export const healthHistory: TimelineYear[] = [
  { year: '2026', entries: [
    { id: 'aug-2026', date: 'AUG 12', title: 'Annual Blood Panel', biomarkerCount: 9, outsideRange: 2, highlights: ['LDL 167 ↑', 'Hb 10.8 ↓'] },
    { id: 'may-2026', date: 'MAY 04', title: 'Metabolic Panel', biomarkerCount: 5, outsideRange: 0, highlights: ['Glucose 91', 'Creatinine 0.83'] },
    { id: 'feb-2026', date: 'FEB 18', title: 'Thyroid Profile', biomarkerCount: 6, outsideRange: 0, highlights: [] },
  ] },
  { year: '2025', entries: [
    { id: 'nov-2025', date: 'NOV 18', title: 'Routine Laboratory Report', biomarkerCount: 8, outsideRange: 1, highlights: ['Glucose 91', 'LDL 118'] },
  ] },
];

export const latestReportPreview = biomarkers.slice(0, 3);
export const attentionBiomarkers = biomarkers.filter(({ status }) => status !== 'normal');
