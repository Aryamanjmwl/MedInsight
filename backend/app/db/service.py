from collections.abc import Sequence
from dataclasses import dataclass, replace
from datetime import datetime
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, selectinload

from ..biomarkers import Biomarker
from .models import BiomarkerResult, Report


@dataclass(frozen=True)
class BiomarkerHistoryRecord:
    report_id: int
    uploaded_at: datetime
    value: float
    unit: str
    status: str
    reference_low: float | None
    reference_high: float | None
    reference_operator: str | None
    raw_reference: str


@dataclass(frozen=True)
class BiomarkerOverviewRecord:
    normalized_name: str
    test_name: str
    latest_value: float
    latest_unit: str
    latest_status: str
    latest_report_date: datetime
    measurement_count: int


@dataclass(frozen=True)
class ReportStatistics:
    total_reports: int
    latest_report_date: datetime | None


def save_processed_report(
    session: Session,
    *,
    user_id: UUID,
    filename: str,
    page_count: int,
    character_count: int,
    requires_ocr: bool,
    biomarkers: list[Biomarker],
) -> Report:
    report = Report(
        user_id=user_id,
        filename=filename,
        page_count=page_count,
        character_count=character_count,
        requires_ocr=requires_ocr,
        biomarkers=[
            BiomarkerResult(
                test_name=biomarker.test_name,
                normalized_name=biomarker.normalized_name,
                value=biomarker.value,
                unit=biomarker.unit,
                reference_low=biomarker.reference_low,
                reference_high=biomarker.reference_high,
                reference_operator=biomarker.reference_operator,
                raw_reference=biomarker.raw_reference,
                status=biomarker.status.value,
                source_text=biomarker.source_text,
            )
            for biomarker in biomarkers
        ],
    )

    try:
        session.add(report)
        session.commit()
        session.refresh(report)
    except SQLAlchemyError:
        session.rollback()
        raise

    return report


def list_saved_reports(session: Session, user_id: UUID) -> Sequence[Report]:
    statement = (
        select(Report)
        .where(Report.user_id == user_id)
        .options(selectinload(Report.biomarkers))
        .order_by(Report.uploaded_at.desc(), Report.id.desc())
    )
    return session.scalars(statement).all()


def get_saved_report(session: Session, user_id: UUID, report_id: int) -> Report | None:
    statement = (
        select(Report)
        .where(Report.id == report_id, Report.user_id == user_id)
        .options(selectinload(Report.biomarkers))
    )
    return session.scalar(statement)


def get_biomarker_history(
    session: Session, user_id: UUID, normalized_name: str
) -> list[BiomarkerHistoryRecord]:
    statement = (
        select(BiomarkerResult, Report.uploaded_at)
        .join(Report, BiomarkerResult.report_id == Report.id)
        .where(
            Report.user_id == user_id,
            BiomarkerResult.normalized_name == normalized_name,
        )
        .order_by(
            Report.uploaded_at.asc(),
            Report.id.asc(),
            BiomarkerResult.id.asc(),
        )
    )
    rows = session.execute(statement).all()
    return [
        BiomarkerHistoryRecord(
            report_id=biomarker.report_id,
            uploaded_at=uploaded_at,
            value=biomarker.value,
            unit=biomarker.unit,
            status=biomarker.status,
            reference_low=biomarker.reference_low,
            reference_high=biomarker.reference_high,
            reference_operator=biomarker.reference_operator,
            raw_reference=biomarker.raw_reference,
        )
        for biomarker, uploaded_at in rows
    ]


def list_biomarker_overviews(
    session: Session, user_id: UUID
) -> list[BiomarkerOverviewRecord]:
    statement = (
        select(BiomarkerResult, Report.uploaded_at)
        .join(Report, BiomarkerResult.report_id == Report.id)
        .where(Report.user_id == user_id)
        .order_by(
            BiomarkerResult.normalized_name.asc(),
            Report.uploaded_at.desc(),
            Report.id.desc(),
            BiomarkerResult.id.desc(),
        )
    )
    rows = session.execute(statement).all()
    latest_by_name: dict[str, BiomarkerOverviewRecord] = {}
    counts: dict[str, int] = {}

    for biomarker, uploaded_at in rows:
        normalized_name = biomarker.normalized_name
        counts[normalized_name] = counts.get(normalized_name, 0) + 1
        if normalized_name not in latest_by_name:
            latest_by_name[normalized_name] = BiomarkerOverviewRecord(
                normalized_name=normalized_name,
                test_name=biomarker.test_name,
                latest_value=biomarker.value,
                latest_unit=biomarker.unit,
                latest_status=biomarker.status,
                latest_report_date=uploaded_at,
                measurement_count=0,
            )

    return [
        replace(record, measurement_count=counts[normalized_name])
        for normalized_name, record in latest_by_name.items()
    ]


def get_report_statistics(session: Session, user_id: UUID) -> ReportStatistics:
    statement = select(func.count(Report.id), func.max(Report.uploaded_at)).where(
        Report.user_id == user_id
    )
    total_reports, latest_report_date = session.execute(statement).one()
    return ReportStatistics(
        total_reports=total_reports,
        latest_report_date=latest_report_date,
    )
