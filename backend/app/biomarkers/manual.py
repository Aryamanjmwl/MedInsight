import math
from datetime import date, datetime, time, timezone
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from .models import BiomarkerStatus, MeasurementSource, ReferenceOperator


class ManualMeasurementValues(BaseModel):
    model_config = ConfigDict(extra="forbid")

    value: float
    unit: str = Field(min_length=1, max_length=100)
    measurement_date: date
    reference_low: float | None = None
    reference_high: float | None = None
    reference_operator: ReferenceOperator | None = None

    @field_validator("value", "reference_low", "reference_high", mode="before")
    @classmethod
    def reject_non_numeric_values(cls, value):
        if value is None:
            return value
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            raise ValueError("A numeric value is required.")
        return value

    @field_validator("value", "reference_low", "reference_high")
    @classmethod
    def require_finite_values(cls, value: float | None) -> float | None:
        if value is not None and not math.isfinite(value):
            raise ValueError("Numeric values must be finite.")
        return value

    @field_validator("measurement_date")
    @classmethod
    def reject_future_dates(cls, value: date) -> date:
        if value > datetime.now(timezone.utc).date():
            raise ValueError("Measurement date cannot be in the future.")
        return value

    @model_validator(mode="after")
    def validate_reference_structure(self):
        low = self.reference_low
        high = self.reference_high
        operator = self.reference_operator

        if operator is None:
            if low is None and high is None:
                return self
            if low is None or high is None:
                raise ValueError("Both lower and upper reference bounds are required.")
            if low > high:
                raise ValueError("Reference lower bound cannot exceed the upper bound.")
            return self

        if operator in ("<", "<="):
            if low is not None or high is None:
                raise ValueError("This reference operator requires only an upper threshold.")
            return self

        if high is not None or low is None:
            raise ValueError("This reference operator requires only a lower threshold.")
        return self

    def measured_at(self) -> datetime:
        return datetime.combine(self.measurement_date, time.min, tzinfo=timezone.utc)


class ManualMeasurementCreate(ManualMeasurementValues):
    normalized_name: str = Field(min_length=1, max_length=255)


class ManualMeasurementUpdate(ManualMeasurementValues):
    """Editable fields for an existing saved measurement.

    The biomarker identity is intentionally immutable. A manual entry may also
    change its date; for report-derived rows the report date remains authoritative.
    """


class ManualMeasurementResponse(BaseModel):
    measurement_id: int
    normalized_name: str
    test_name: str
    value: float
    unit: str
    measurement_date: datetime
    reference_low: float | None
    reference_high: float | None
    reference_operator: ReferenceOperator | None
    raw_reference: str
    status: BiomarkerStatus
    source: MeasurementSource
    user_edited: bool = False


class ManualMeasurementDeleteResponse(BaseModel):
    measurement_id: int
    status: Literal["deleted"] = "deleted"


def format_manual_reference(payload: ManualMeasurementValues) -> str:
    if payload.reference_operator is None:
        if payload.reference_low is None or payload.reference_high is None:
            return ""
        return f"{payload.reference_low:g} - {payload.reference_high:g}"
    threshold = (
        payload.reference_high
        if payload.reference_operator.startswith("<")
        else payload.reference_low
    )
    return f"{payload.reference_operator}{threshold:g}"
