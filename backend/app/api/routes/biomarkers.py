from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ...auth import AuthenticatedUser, get_current_user
from ...biomarkers import BiomarkerStatus, ReferenceOperator
from ...biomarkers import (
    ManualMeasurementCreate,
    ManualMeasurementDeleteResponse,
    ManualMeasurementResponse,
    ManualMeasurementUpdate,
    MeasurementSource,
    classify_biomarker_value,
    format_manual_reference,
)
from ...biomarkers.normalization import normalize_unit
from ...biomarkers.vocabulary import BIOMARKERS, BIOMARKERS_BY_NORMALIZED_NAME
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
    delete_manual_measurement,
    get_biomarker_history,
    get_db_session,
    list_biomarker_overviews,
    save_manual_measurement,
    update_manual_measurement,
)
from ...security import (
    AI_EXPLANATION_RULE,
    enforce_user_rate_limit,
    log_security_event,
)
from ...trends import TrendResult, calculate_trend

router = APIRouter(prefix="/biomarkers", tags=["biomarkers"])


class BiomarkerHistoryItem(BaseModel):
    measurement_id: int
    report_id: int | None
    uploaded_at: datetime
    source: MeasurementSource
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
    latest_source: MeasurementSource
    measurement_count: int


class SupportedBiomarker(BaseModel):
    normalized_name: str
    display_name: str


def _validated_manual_unit(unit: str) -> str:
    normalized = normalize_unit(unit)
    if normalized is None or ("/" not in normalized and normalized not in {"%", "fL", "pg"}):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Enter a valid laboratory unit.",
        )
    return normalized


def _manual_measurement_response(measurement) -> ManualMeasurementResponse:
    return ManualMeasurementResponse(
        measurement_id=measurement.id,
        normalized_name=measurement.normalized_name,
        test_name=measurement.test_name,
        value=measurement.value,
        unit=measurement.unit,
        measurement_date=measurement.measured_at,
        reference_low=measurement.reference_low,
        reference_high=measurement.reference_high,
        reference_operator=measurement.reference_operator,
        raw_reference=measurement.raw_reference,
        status=measurement.status,
        source=measurement.source,
    )


@router.get("", response_model=list[BiomarkerOverview])
def list_biomarkers(
    session: Session = Depends(get_db_session),
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> list[BiomarkerOverview]:
    return [
        BiomarkerOverview.model_validate(record, from_attributes=True)
        for record in list_biomarker_overviews(session, current_user.id)
    ]


@router.get("/supported", response_model=list[SupportedBiomarker])
def list_supported_biomarkers(
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> list[SupportedBiomarker]:
    return [
        SupportedBiomarker(
            normalized_name=definition.normalized_name,
            display_name=definition.display_name,
        )
        for definition in BIOMARKERS
    ]


@router.post(
    "/manual",
    response_model=ManualMeasurementResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_manual_measurement(
    payload: ManualMeasurementCreate,
    session: Session = Depends(get_db_session),
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> ManualMeasurementResponse:
    definition = BIOMARKERS_BY_NORMALIZED_NAME.get(payload.normalized_name)
    if definition is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Select a supported laboratory biomarker.",
        )

    unit = _validated_manual_unit(payload.unit)
    calculated_status = classify_biomarker_value(
        value=payload.value,
        reference_low=payload.reference_low,
        reference_high=payload.reference_high,
        reference_operator=payload.reference_operator,
    )
    measurement = save_manual_measurement(
        session,
        user_id=current_user.id,
        test_name=definition.display_name,
        normalized_name=definition.normalized_name,
        value=payload.value,
        unit=unit,
        measured_at=payload.measured_at(),
        reference_low=payload.reference_low,
        reference_high=payload.reference_high,
        reference_operator=payload.reference_operator,
        raw_reference=format_manual_reference(payload),
        status=calculated_status,
    )
    return _manual_measurement_response(measurement)


@router.put(
    "/manual/{measurement_id}",
    response_model=ManualMeasurementResponse,
)
def edit_manual_measurement(
    measurement_id: int,
    payload: ManualMeasurementUpdate,
    session: Session = Depends(get_db_session),
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> ManualMeasurementResponse:
    unit = _validated_manual_unit(payload.unit)
    calculated_status = classify_biomarker_value(
        value=payload.value,
        reference_low=payload.reference_low,
        reference_high=payload.reference_high,
        reference_operator=payload.reference_operator,
    )
    measurement = update_manual_measurement(
        session,
        user_id=current_user.id,
        measurement_id=measurement_id,
        value=payload.value,
        unit=unit,
        measured_at=payload.measured_at(),
        reference_low=payload.reference_low,
        reference_high=payload.reference_high,
        reference_operator=payload.reference_operator,
        raw_reference=format_manual_reference(payload),
        status=calculated_status,
    )
    if measurement is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Manual measurement not found.",
        )

    log_security_event("manual_measurement_update", user_id=current_user.id)
    return _manual_measurement_response(measurement)


@router.delete(
    "/manual/{measurement_id}",
    response_model=ManualMeasurementDeleteResponse,
)
def remove_manual_measurement(
    measurement_id: int,
    session: Session = Depends(get_db_session),
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> ManualMeasurementDeleteResponse:
    deleted = delete_manual_measurement(
        session,
        user_id=current_user.id,
        measurement_id=measurement_id,
    )
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Manual measurement not found.",
        )
    log_security_event("manual_measurement_delete", user_id=current_user.id)
    return ManualMeasurementDeleteResponse(measurement_id=measurement_id)


@router.get(
    "/{normalized_name}/history",
    response_model=BiomarkerHistoryResponse,
)
def biomarker_history(
    normalized_name: str,
    session: Session = Depends(get_db_session),
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> BiomarkerHistoryResponse:
    records = get_biomarker_history(session, current_user.id, normalized_name)
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
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> TrendResult:
    records = get_biomarker_history(session, current_user.id, normalized_name)
    return calculate_trend(normalized_name, records)


@router.post(
    "/{normalized_name}/explain",
    response_model=BiomarkerExplanation,
)
def explain_biomarker(
    normalized_name: str,
    session: Session = Depends(get_db_session),
    provider: ExplanationProvider = Depends(get_explanation_provider),
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> BiomarkerExplanation:
    enforce_user_rate_limit(
        user_id=current_user.id,
        scope="ai_explanation",
        rule=AI_EXPLANATION_RULE,
    )

    definition = BIOMARKERS_BY_NORMALIZED_NAME.get(normalized_name)
    if definition is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="This biomarker is not supported for AI explanation.",
        )

    records = get_biomarker_history(session, current_user.id, normalized_name)
    if not records:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No saved measurement is available for this biomarker.",
        )

    trend = calculate_trend(normalized_name, records)
    context = build_biomarker_explanation_context(definition, records, trend)
    try:
        result = provider.explain(context)
    except AIConfigurationError as error:
        log_security_event(
            "ai_explanation",
            user_id=current_user.id,
            outcome="failure",
            reason="provider_not_configured",
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI explanations are not configured on this server.",
        ) from error
    except AIProviderTimeoutError as error:
        log_security_event(
            "ai_explanation",
            user_id=current_user.id,
            outcome="failure",
            reason="provider_timeout",
        )
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="The AI explanation service timed out. Please try again.",
        ) from error
    except AIInvalidResponseError as error:
        log_security_event(
            "ai_explanation",
            user_id=current_user.id,
            outcome="failure",
            reason="invalid_provider_response",
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The AI explanation service returned an invalid response.",
        ) from error
    except AIProviderError as error:
        log_security_event(
            "ai_explanation",
            user_id=current_user.id,
            outcome="failure",
            reason="provider_unavailable",
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The AI explanation service is temporarily unavailable.",
        ) from error

    log_security_event("ai_explanation", user_id=current_user.id)
    return result
