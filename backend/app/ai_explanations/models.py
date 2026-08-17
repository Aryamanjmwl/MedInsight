from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from ..biomarkers import BiomarkerStatus, ReferenceOperator
from ..trends import TrendDirection


class BiomarkerExplanationContext(BaseModel):
    """Minimal structured health data allowed to cross the AI provider boundary."""

    model_config = ConfigDict(extra="forbid")

    canonical_name: str
    display_name: str
    value: float
    unit: str
    reference_low: float | None
    reference_high: float | None
    reference_operator: ReferenceOperator | None
    status: BiomarkerStatus
    measurement_date: datetime
    trend_comparison_available: bool
    trend_direction: TrendDirection | None
    baseline_value: float | None
    baseline_unit: str | None
    baseline_date: datetime | None
    trend_unavailable_reason: Literal[
        "single_measurement", "mixed_units", "insufficient_data"
    ] | None


class BiomarkerExplanation(BaseModel):
    model_config = ConfigDict(extra="forbid")

    summary: str = Field(min_length=1, max_length=700)
    what_it_measures: str = Field(min_length=1, max_length=700)
    result_context: str = Field(min_length=1, max_length=900)
    possible_context: list[str] = Field(max_length=4)
    trend_context: str | None = Field(default=None, max_length=700)
    questions_for_doctor: list[str] = Field(max_length=4)
    safety_note: str = Field(min_length=1, max_length=500)
