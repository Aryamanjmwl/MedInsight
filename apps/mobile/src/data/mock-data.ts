export type BiomarkerStatus = 'normal' | 'high' | 'low';

export type MockBiomarker = {
  id: string;
  name: string;
  value: string;
  unit: string;
  status: BiomarkerStatus;
  date: string;
};

export type MockReport = {
  id: string;
  filename: string;
  date: string;
  biomarkerCount: number;
  needsAttention: number;
};

export const summaryMetrics = [
  { label: 'Reports', value: '12', supportingText: '2 this month', tone: 'brand' as const },
  { label: 'Biomarkers', value: '9', supportingText: 'Across all reports', tone: 'neutral' as const },
  { label: 'Outside Range', value: '2', supportingText: 'Review recommended', tone: 'alert' as const },
];

export const biomarkers: MockBiomarker[] = [
  {
    id: 'ldl',
    name: 'LDL Cholesterol',
    value: '167',
    unit: 'mg/dL',
    status: 'high',
    date: 'Aug 12, 2026',
  },
  {
    id: 'hemoglobin',
    name: 'Hemoglobin',
    value: '10.8',
    unit: 'g/dL',
    status: 'low',
    date: 'Aug 12, 2026',
  },
  {
    id: 'glucose',
    name: 'Glucose',
    value: '92',
    unit: 'mg/dL',
    status: 'normal',
    date: 'Aug 12, 2026',
  },
  {
    id: 'creatinine',
    name: 'Creatinine',
    value: '0.84',
    unit: 'mg/dL',
    status: 'normal',
    date: 'May 04, 2026',
  },
  {
    id: 'hdl',
    name: 'HDL Cholesterol',
    value: '48',
    unit: 'mg/dL',
    status: 'normal',
    date: 'May 04, 2026',
  },
];

export const reports: MockReport[] = [
  {
    id: 'annual-2026',
    filename: 'Annual blood panel.pdf',
    date: 'Aug 12, 2026',
    biomarkerCount: 9,
    needsAttention: 2,
  },
  {
    id: 'metabolic-2026',
    filename: 'Metabolic panel.pdf',
    date: 'May 04, 2026',
    biomarkerCount: 5,
    needsAttention: 0,
  },
  {
    id: 'routine-2025',
    filename: 'Routine laboratory report.pdf',
    date: 'Nov 18, 2025',
    biomarkerCount: 8,
    needsAttention: 1,
  },
];
