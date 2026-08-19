from collections.abc import Sequence
from dataclasses import dataclass, replace
from datetime import datetime
from uuid import UUID

from sqlalchemy import case, func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, selectinload

from ..biomarkers import Biomarker, BiomarkerStatus, MeasurementSource, ReferenceOperator
from .models import BiomarkerResult, Report, utc_now


@dataclass(frozen=True)
class BiomarkerHistoryRecord:
    report_id: int | None
    uploaded_at: datetime
    value: float
    unit: str
    status: str
    reference_low: float | None
    reference_high: float | None
    reference_operator: str | None
    raw_reference: str
    measurement_id: int = 0
    source: str = MeasurementSource.REPORT.value


@dataclass(frozen=True)
class BiomarkerOverviewRecord:
    normalized_name: str
    test_name: str
    latest_value: float
    latest_unit: str
    latest_status: str
    latest_report_date: datetime
    measurement_count: int
    latest_source: str = MeasurementSource.REPORT.value


@dataclass(frozen=True)
class RecentManualMeasurementRecord:
    measurement_id: int
    normalized_name: str
    test_name: str
    measured_at: datetime
    value: float
    unit: str
    status: str


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
    uploaded_at = utc_now()
    report = Report(
        user_id=user_id,
        filename=filename,
        uploaded_at=uploaded_at,
        page_count=page_count,
        character_count=character_count,
        requires_ocr=requires_ocr,
        biomarkers=[
            BiomarkerResult(
                user_id=user_id,
                source=MeasurementSource.REPORT.value,
                measured_at=uploaded_at,
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


def save_manual_measurement(
    session: Session,
    *,
    user_id: UUID,
    test_name: str,
    normalized_name: str,
    value: float,
    unit: str,
    measured_at: datetime,
    reference_low: float | None,
    reference_high: float | None,
    reference_operator: ReferenceOperator | None,
    raw_reference: str,
    status: BiomarkerStatus,
) -> BiomarkerResult:
    measurement = BiomarkerResult(
        report_id=None,
        user_id=user_id,
        source=MeasurementSource.MANUAL.value,
        measured_at=measured_at,
        test_name=test_name,
        normalized_name=normalized_name,
        value=value,
        unit=unit,
        reference_low=reference_low,
        reference_high=reference_high,
        reference_operator=reference_operator,
        raw_reference=raw_reference,
        status=status.value,
        source_text="",
    )
    try:
        session.add(measurement)
        session.commit()
        session.refresh(measurement)
    except SQLAlchemyError:
        session.rollback()
        raise
    return measurement


def delete_manual_measurement(
    session: Session,
    *,
    user_id: UUID,
    measurement_id: int,
) -> bool:
    statement = select(BiomarkerResult).where(
        BiomarkerResult.id == measurement_id,
        BiomarkerResult.user_id == user_id,
        BiomarkerResult.source == MeasurementSource.MANUAL.value,
    )
    measurement = session.scalar(statement)
    if measurement is None:
        return False

    try:
        session.delete(measurement)
        session.commit()
    except SQLAlchemyError:
        session.rollback()
        raise
    return True


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
    effective_date = case(
        (
            BiomarkerResult.source == MeasurementSource.REPORT.value,
            Report.uploaded_at,
        ),
        else_=BiomarkerResult.measured_at,
    )
    statement = (
        select(BiomarkerResult, effective_date.label("effective_date"))
        .outerjoin(Report, BiomarkerResult.report_id == Report.id)
        .where(
            BiomarkerResult.user_id == user_id,
            BiomarkerResult.normalized_name == normalized_name,
        )
        .order_by(
            effective_date.asc(),
            BiomarkerResult.id.asc(),
        )
    )
    rows = session.execute(statement).all()
    return [
        BiomarkerHistoryRecord(
            measurement_id=biomarker.id,
            report_id=biomarker.report_id,
            uploaded_at=uploaded_at,
            source=biomarker.source,
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
    effective_date = case(
        (
            BiomarkerResult.source == MeasurementSource.REPORT.value,
            Report.uploaded_at,
        ),
        else_=BiomarkerResult.measured_at,
    )
    statement = (
        select(BiomarkerResult, effective_date.label("effective_date"))
        .outerjoin(Report, BiomarkerResult.report_id == Report.id)
        .where(BiomarkerResult.user_id == user_id)
        .order_by(
            BiomarkerResult.normalized_name.asc(),
            effective_date.desc(),
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
                latest_source=biomarker.source,
                measurement_count=0,
            )

    return [
        replace(record, measurement_count=counts[normalized_name])
        for normalized_name, record in latest_by_name.items()
    ]


def list_recent_manual_measurements(
    session: Session,
    user_id: UUID,
    *,
    limit: int = 5,
) -> list[RecentManualMeasurementRecord]:
    statement = (
        select(BiomarkerResult)
        .where(
            BiomarkerResult.user_id == user_id,
            BiomarkerResult.source == MeasurementSource.MANUAL.value,
        )
        .order_by(BiomarkerResult.measured_at.desc(), BiomarkerResult.id.desc())
        .limit(limit)
    )
    return [
        RecentManualMeasurementRecord(
            measurement_id=item.id,
            normalized_name=item.normalized_name,
            test_name=item.test_name,
            measured_at=item.measured_at,
            value=item.value,
            unit=item.unit,
            status=item.status,
        )
        for item in session.scalars(statement).all()
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
