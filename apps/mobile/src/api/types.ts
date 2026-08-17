export type IsoDateTime = string;

export type BiomarkerStatus = 'low' | 'normal' | 'high' | 'unknown';
export type ReferenceOperator = '<' | '<=' | '>' | '>=';
export type TrendDirection = 'increasing' | 'decreasing' | 'stable' | 'insufficient_data';
export type TrendIssue = 'insufficient_measurements' | 'mixed_units';

export interface BiomarkerResult {
  test_name: string;
  normalized_name: string;
  value: number;
  unit: string;
  reference_low: number | null;
  reference_high: number | null;
  reference_operator: ReferenceOperator | null;
  raw_reference: string;
  source_text: string;
  status: BiomarkerStatus;
}

export interface SavedReportSummary {
  id: number;
  filename: string;
  uploaded_at: IsoDateTime;
  page_count: number;
  character_count: number;
  requires_ocr: boolean;
  biomarker_count: number;
}

export interface SavedReportDetail extends SavedReportSummary {
  biomarkers: BiomarkerResult[];
}

export interface ReportProcessingResult {
  filename: string;
  page_count: number;
  character_count: number;
  requires_ocr: boolean;
  ocr_used: boolean;
  biomarker_count: number;
  unparsed_line_count: number;
  biomarkers: BiomarkerResult[];
}

export interface ProcessAndSaveReportResponse {
  report_id: number;
  result: ReportProcessingResult;
}

export interface BiomarkerOverview {
  normalized_name: string;
  test_name: string;
  latest_value: number;
  latest_unit: string;
  latest_status: BiomarkerStatus;
  latest_report_date: IsoDateTime;
  measurement_count: number;
}

export interface BiomarkerHistoryItem {
  report_id: number;
  uploaded_at: IsoDateTime;
  value: number;
  unit: string;
  status: BiomarkerStatus;
  reference_low: number | null;
  reference_high: number | null;
  reference_operator: ReferenceOperator | null;
  raw_reference: string;
}

export interface BiomarkerHistoryResponse {
  normalized_name: string;
  count: number;
  history: BiomarkerHistoryItem[];
}

export interface BiomarkerExplanation {
  summary: string;
  what_it_measures: string;
  result_context: string;
  possible_context: string[];
  trend_context: string | null;
  questions_for_doctor: string[];
  safety_note: string;
}

export interface TrendResult {
  normalized_name: string;
  measurement_count: number;
  unit: string | null;
  first_value: number | null;
  latest_value: number | null;
  absolute_change: number | null;
  percent_change: number | null;
  direction: TrendDirection;
  first_date: IsoDateTime | null;
  latest_date: IsoDateTime | null;
  comparable_units: boolean;
  issue: TrendIssue | null;
}

export type DashboardBiomarkerSummary = BiomarkerOverview;

export interface DashboardSummaryResponse {
  total_reports: number;
  total_distinct_biomarkers: number;
  abnormal_biomarker_count: number;
  latest_report_date: IsoDateTime | null;
  latest_biomarkers: DashboardBiomarkerSummary[];
  trends: TrendResult[];
}
