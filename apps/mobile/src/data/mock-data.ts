export type BiomarkerStatus = 'normal' | 'high' | 'low';
export type MockBiomarker = {
  id: string; name: string; value: string; unit: string; reference: string;
  status: BiomarkerStatus; date: string; trend?: 'up' | 'down' | 'stable'; change?: string;
};
export type MockReport = {
  id: string; filename: string; title: string; laboratory?: string; date: string;
  dateLabel: string; year: string; biomarkerCount: number; needsAttention: number;
};

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
