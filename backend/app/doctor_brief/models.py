from datetime import datetime

from pydantic import BaseModel

from ..biomarkers import BiomarkerStatus, ReferenceOperator
from ..trends import TrendDirection


class BriefRecentReport(BaseModel):
    report_id: int
    uploaded_at: datetime
    page_count: int
    biomarker_count: int
    requires_ocr: bool


class BriefMeasurement(BaseModel):
    report_id: int
    normalized_name: str
    display_name: str
    value: float
    unit: str
    status: BiomarkerStatus
    reference_low: float | None
    reference_high: float | None
    reference_operator: ReferenceOperator | None
    raw_reference: str
    measurement_date: datetime


class BriefUnclassifiedMeasurement(BriefMeasurement):
    reason: str


class BriefTrend(BaseModel):
    normalized_name: str
    display_name: str
    unit: str
    first_value: float
    latest_value: float
    absolute_change: float
    percent_change: float | None
    direction: TrendDirection
    first_date: datetime
    latest_date: datetime


class DoctorVisitBriefResponse(BaseModel):
    generated_at: datetime
    report_count: int
    latest_report_date: datetime | None
    recent_reports: list[BriefRecentReport]
    latest_measurements: list[BriefMeasurement]
    needs_attention: list[BriefMeasurement]
    trend_summary: list[BriefTrend]
    unclassified_measurements: list[BriefUnclassifiedMeasurement]
    questions_to_discuss: list[str]
    limitations: list[str]
