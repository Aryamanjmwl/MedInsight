from datetime import datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ...biomarkers import BiomarkerStatus, ReferenceOperator
from ...db import (
    get_biomarker_history,
    get_db_session,
    list_biomarker_overviews,
)
from ...trends import TrendResult, calculate_trend

router = APIRouter(prefix="/biomarkers", tags=["biomarkers"])


class BiomarkerHistoryItem(BaseModel):
    report_id: int
    uploaded_at: datetime
    value: float
    unit: str
    status: BiomarkerStatus
    reference_low: float | None
    reference_high: float | None
    reference_operator: ReferenceOperator | None
    raw_reference: str


class BiomarkerHistoryResponse(BaseModel):
    normalized_name: str
    count: int
    history: list[BiomarkerHistoryItem]


class BiomarkerOverview(BaseModel):
    normalized_name: str
    test_name: str
    latest_value: float
    latest_unit: str
    latest_status: BiomarkerStatus
    latest_report_date: datetime
    measurement_count: int


@router.get("", response_model=list[BiomarkerOverview])
def list_biomarkers(
    session: Session = Depends(get_db_session),
) -> list[BiomarkerOverview]:
    return [
        BiomarkerOverview.model_validate(record, from_attributes=True)
        for record in list_biomarker_overviews(session)
    ]


@router.get(
    "/{normalized_name}/history",
    response_model=BiomarkerHistoryResponse,
)
def biomarker_history(
    normalized_name: str,
    session: Session = Depends(get_db_session),
) -> BiomarkerHistoryResponse:
    records = get_biomarker_history(session, normalized_name)
    history = [
        BiomarkerHistoryItem.model_validate(record, from_attributes=True)
        for record in records
    ]
    return BiomarkerHistoryResponse(
        normalized_name=normalized_name,
        count=len(history),
        history=history,
    )


@router.get("/{normalized_name}/trend", response_model=TrendResult)
def biomarker_trend(
    normalized_name: str,
    session: Session = Depends(get_db_session),
) -> TrendResult:
    records = get_biomarker_history(session, normalized_name)
    return calculate_trend(normalized_name, records)
