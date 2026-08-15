import math

from .models import BiomarkerStatus, ReferenceOperator


def classify_biomarker_value(
    *,
    value: float,
    reference_low: float | None,
    reference_high: float | None,
    reference_operator: ReferenceOperator | None,
) -> BiomarkerStatus:
    """Classify a value using only its reported structured reference data."""
    if not math.isfinite(value):
        return BiomarkerStatus.UNKNOWN

    if reference_operator is None:
        if reference_low is None or reference_high is None:
            return BiomarkerStatus.UNKNOWN
        if not math.isfinite(reference_low) or not math.isfinite(reference_high):
            return BiomarkerStatus.UNKNOWN
        if reference_low > reference_high:
            return BiomarkerStatus.UNKNOWN
        if value < reference_low:
            return BiomarkerStatus.LOW
        if value > reference_high:
            return BiomarkerStatus.HIGH
        return BiomarkerStatus.NORMAL

    if reference_operator in ("<", "<="):
        if reference_low is not None or reference_high is None:
            return BiomarkerStatus.UNKNOWN
        if not math.isfinite(reference_high):
            return BiomarkerStatus.UNKNOWN
        if reference_operator == "<":
            return (
                BiomarkerStatus.NORMAL
                if value < reference_high
                else BiomarkerStatus.HIGH
            )
        return (
            BiomarkerStatus.NORMAL
            if value <= reference_high
            else BiomarkerStatus.HIGH
        )

    if reference_operator in (">", ">="):
        if reference_low is None or reference_high is not None:
            return BiomarkerStatus.UNKNOWN
        if not math.isfinite(reference_low):
            return BiomarkerStatus.UNKNOWN
        if reference_operator == ">":
            return (
                BiomarkerStatus.NORMAL
                if value > reference_low
                else BiomarkerStatus.LOW
            )
        return (
            BiomarkerStatus.NORMAL
            if value >= reference_low
            else BiomarkerStatus.LOW
        )

    return BiomarkerStatus.UNKNOWN
