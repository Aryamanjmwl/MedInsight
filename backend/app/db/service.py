from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, selectinload

from ..biomarkers import Biomarker
from .models import BiomarkerResult, Report


def save_processed_report(
    session: Session,
    *,
    filename: str,
    page_count: int,
    character_count: int,
    requires_ocr: bool,
    biomarkers: list[Biomarker],
) -> Report:
    report = Report(
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


def list_saved_reports(session: Session) -> Sequence[Report]:
    statement = (
        select(Report)
        .options(selectinload(Report.biomarkers))
        .order_by(Report.uploaded_at.desc(), Report.id.desc())
    )
    return session.scalars(statement).all()


def get_saved_report(session: Session, report_id: int) -> Report | None:
    statement = (
        select(Report)
        .where(Report.id == report_id)
        .options(selectinload(Report.biomarkers))
    )
    return session.scalar(statement)
