from collections.abc import Sequence

from ..biomarkers.vocabulary import BiomarkerDefinition
from ..db import BiomarkerHistoryRecord
from ..trends import TrendResult
from .models import BiomarkerExplanationContext


def build_biomarker_explanation_context(
    definition: BiomarkerDefinition,
    history: Sequence[BiomarkerHistoryRecord],
    trend: TrendResult,
) -> BiomarkerExplanationContext:
    """Build the complete, allowlisted payload sent to the model provider."""
    if not history:
        raise ValueError("A saved biomarker measurement is required.")

    latest = history[-1]
    comparison_available = (
        len(history) >= 2
        and trend.comparable_units
        and trend.direction != "insufficient_data"
        and trend.first_value is not None
        and trend.first_date is not None
        and trend.unit is not None
    )

    unavailable_reason = None
    if not comparison_available:
        if not trend.comparable_units or trend.issue == "mixed_units":
            unavailable_reason = "mixed_units"
        elif len(history) < 2:
            unavailable_reason = "single_measurement"
        else:
            unavailable_reason = "insufficient_data"

    return BiomarkerExplanationContext(
        canonical_name=definition.normalized_name,
        display_name=definition.display_name,
        value=latest.value,
        unit=latest.unit,
        reference_low=latest.reference_low,
        reference_high=latest.reference_high,
        reference_operator=latest.reference_operator,
        status=latest.status,
        measurement_date=latest.uploaded_at,
        trend_comparison_available=comparison_available,
        trend_direction=trend.direction if comparison_available else None,
        baseline_value=trend.first_value if comparison_available else None,
        baseline_unit=trend.unit if comparison_available else None,
        baseline_date=trend.first_date if comparison_available else None,
        trend_unavailable_reason=unavailable_reason,
    )
