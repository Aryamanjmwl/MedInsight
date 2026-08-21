from dataclasses import dataclass
from uuid import UUID

from sqlalchemy import delete
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from ..db.models import BiomarkerResult, Report


@dataclass(frozen=True)
class UserDataDeletionResult:
    reports_deleted: int
    biomarkers_deleted: int


def delete_user_health_data(session: Session, user_id: UUID) -> UserDataDeletionResult:
    """Permanently delete all application-owned health records for one user."""
    try:
        biomarker_result = session.execute(
            delete(BiomarkerResult).where(BiomarkerResult.user_id == user_id)
        )
        report_result = session.execute(delete(Report).where(Report.user_id == user_id))
        session.commit()
    except SQLAlchemyError:
        session.rollback()
        raise

    return UserDataDeletionResult(
        reports_deleted=max(report_result.rowcount or 0, 0),
        biomarkers_deleted=max(biomarker_result.rowcount or 0, 0),
    )
