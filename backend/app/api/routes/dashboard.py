from datetime import datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ...biomarkers import BiomarkerStatus
from ...db import (
    get_biomarker_history,
    get_db_session,
    get_report_statistics,
    list_biomarker_overviews,
)
from ...trends import TrendDirection, TrendResult, calculate_trend

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


class DashboardBiomarkerSummary(BaseModel):
    normalized_name: str
    test_name: str
    latest_value: float
    latest_unit: str
    latest_status: BiomarkerStatus
    latest_report_date: datetime
    measurement_count: int


class DashboardSummaryResponse(BaseModel):
    total_reports: int
    total_distinct_biomarkers: int
    abnormal_biomarker_count: int
    latest_report_date: datetime | None
    latest_biomarkers: list[DashboardBiomarkerSummary]
    trends: list[TrendResult]


@router.get("/summary", response_model=DashboardSummaryResponse)
def dashboard_summary(
    session: Session = Depends(get_db_session),
) -> DashboardSummaryResponse:
    report_statistics = get_report_statistics(session)
    overviews = list_biomarker_overviews(session)
    latest_biomarkers = sorted(
        (
            DashboardBiomarkerSummary.model_validate(item, from_attributes=True)
            for item in overviews
        ),
        key=lambda item: (item.latest_report_date, item.normalized_name),
        reverse=True,
    )

    trends: list[TrendResult] = []
    for overview in overviews:
        if overview.measurement_count < 2:
            continue
        history = get_biomarker_history(session, overview.normalized_name)
        trend = calculate_trend(overview.normalized_name, history)
        if (
            trend.comparable_units
            and trend.direction != TrendDirection.INSUFFICIENT_DATA
        ):
            trends.append(trend)

    return DashboardSummaryResponse(
        total_reports=report_statistics.total_reports,
        total_distinct_biomarkers=len(overviews),
        abnormal_biomarker_count=sum(
            item.latest_status in (BiomarkerStatus.LOW, BiomarkerStatus.HIGH)
            for item in latest_biomarkers
        ),
        latest_report_date=report_statistics.latest_report_date,
        latest_biomarkers=latest_biomarkers,
        trends=trends,
    )
