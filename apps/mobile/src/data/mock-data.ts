export type BiomarkerStatus = 'normal' | 'high' | 'low';
export type MockBiomarker = {
  id: string; name: string; value: string; unit: string; reference: string;
  status: BiomarkerStatus; date: string; trend?: 'up' | 'down' | 'stable'; change?: string;
};

export const biomarkers: MockBiomarker[] = [
  { id: 'ldl', name: 'LDL Cholesterol', value: '167', unit: 'mg/dL', reference: '<100', status: 'high', date: '12 Aug 2026', trend: 'up', change: '+18 mg/dL since May' },
  { id: 'hemoglobin', name: 'Hemoglobin', value: '10.8', unit: 'g/dL', reference: '12.0–15.5', status: 'low', date: '12 Aug 2026', trend: 'down', change: '−0.7 g/dL since May' },
  { id: 'glucose', name: 'Fasting Glucose', value: '92', unit: 'mg/dL', reference: '70–99', status: 'normal', date: '12 Aug 2026', trend: 'stable', change: '+1 mg/dL since May' },
  { id: 'creatinine', name: 'Creatinine', value: '0.84', unit: 'mg/dL', reference: '0.6–1.1', status: 'normal', date: '12 Aug 2026', trend: 'stable', change: '+0.01 mg/dL since May' },
  { id: 'hdl', name: 'HDL Cholesterol', value: '48', unit: 'mg/dL', reference: '>40', status: 'normal', date: '12 Aug 2026', change: 'First recorded measurement' },
];
