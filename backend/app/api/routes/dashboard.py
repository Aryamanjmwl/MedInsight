from datetime import datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ...auth import AuthenticatedUser, get_current_user
from ...biomarkers import BiomarkerStatus, MeasurementSource
from ...db import (
    get_biomarker_history,
    get_db_session,
    get_report_statistics,
    list_biomarker_overviews,
    list_recent_manual_measurements,
)
from ...doctor_brief import DoctorVisitBriefResponse, build_doctor_visit_brief
from ...trends import TrendDirection, TrendResult, calculate_trend

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


class DashboardBiomarkerSummary(BaseModel):
    normalized_name: str
    test_name: str
    latest_value: float
    latest_unit: str
    latest_status: BiomarkerStatus
    latest_report_date: datetime
    latest_source: MeasurementSource
    measurement_count: int


class DashboardManualMeasurement(BaseModel):
    measurement_id: int
    normalized_name: str
    test_name: str
    measured_at: datetime
    value: float
    unit: str
    status: BiomarkerStatus
    source: MeasurementSource = MeasurementSource.MANUAL


class DashboardSummaryResponse(BaseModel):
    total_reports: int
    total_distinct_biomarkers: int
    abnormal_biomarker_count: int
    latest_report_date: datetime | None
    latest_health_record_date: datetime | None
    latest_biomarkers: list[DashboardBiomarkerSummary]
    recent_manual_measurements: list[DashboardManualMeasurement]
    trends: list[TrendResult]


@router.get("/summary", response_model=DashboardSummaryResponse)
def dashboard_summary(
    session: Session = Depends(get_db_session),
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> DashboardSummaryResponse:
    report_statistics = get_report_statistics(session, current_user.id)
    overviews = list_biomarker_overviews(session, current_user.id)
    latest_biomarkers = sorted(
        (
            DashboardBiomarkerSummary.model_validate(item, from_attributes=True)
            for item in overviews
        ),
        key=lambda item: (item.latest_report_date, item.normalized_name),
        reverse=True,
    )
    recent_manual_measurements = [
        DashboardManualMeasurement.model_validate(item, from_attributes=True)
        for item in list_recent_manual_measurements(session, current_user.id)
    ]
    latest_health_record_date = max(
        (
            item
            for item in (
                report_statistics.latest_report_date,
                *(biomarker.latest_report_date for biomarker in latest_biomarkers),
            )
            if item is not None
        ),
        default=None,
    )

    trends: list[TrendResult] = []
    for overview in overviews:
        if overview.measurement_count < 2:
            continue
        history = get_biomarker_history(
            session, current_user.id, overview.normalized_name
        )
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
        latest_health_record_date=latest_health_record_date,
        latest_biomarkers=latest_biomarkers,
        recent_manual_measurements=recent_manual_measurements,
        trends=trends,
    )


@router.get("/doctor-brief", response_model=DoctorVisitBriefResponse)
def doctor_visit_brief(
    session: Session = Depends(get_db_session),
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> DoctorVisitBriefResponse:
    return build_doctor_visit_brief(session, current_user.id)
