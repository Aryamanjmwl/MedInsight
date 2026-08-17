from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ...biomarkers import BiomarkerStatus, ReferenceOperator
from ...biomarkers.vocabulary import BIOMARKERS_BY_NORMALIZED_NAME
from ...ai_explanations import (
    AIConfigurationError,
    AIInvalidResponseError,
    AIProviderError,
    AIProviderTimeoutError,
    BiomarkerExplanation,
    build_biomarker_explanation_context,
    get_explanation_provider,
)
from ...ai_explanations.provider import ExplanationProvider
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


@router.post(
    "/{normalized_name}/explain",
    response_model=BiomarkerExplanation,
)
def explain_biomarker(
    normalized_name: str,
    session: Session = Depends(get_db_session),
    provider: ExplanationProvider = Depends(get_explanation_provider),
) -> BiomarkerExplanation:
    definition = BIOMARKERS_BY_NORMALIZED_NAME.get(normalized_name)
    if definition is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="This biomarker is not supported for AI explanation.",
        )

    records = get_biomarker_history(session, normalized_name)
    if not records:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No saved measurement is available for this biomarker.",
        )

    trend = calculate_trend(normalized_name, records)
    context = build_biomarker_explanation_context(definition, records, trend)
    try:
        return provider.explain(context)
    except AIConfigurationError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI explanations are not configured on this server.",
        ) from error
    except AIProviderTimeoutError as error:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="The AI explanation service timed out. Please try again.",
        ) from error
    except AIInvalidResponseError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The AI explanation service returned an invalid response.",
        ) from error
    except AIProviderError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The AI explanation service is temporarily unavailable.",
        ) from error
