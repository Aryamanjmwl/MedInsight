import math
from collections.abc import Sequence
from datetime import datetime
from typing import Protocol

from .models import TrendDirection, TrendResult

# Differences within 0.0001% of the larger magnitude are treated as stable.
STABLE_RELATIVE_TOLERANCE = 1e-6


class TrendMeasurement(Protocol):
    report_id: int | None
    uploaded_at: datetime
    value: float
    unit: str


def calculate_trend(
    normalized_name: str,
    measurements: Sequence[TrendMeasurement],
) -> TrendResult:
    ordered = sorted(
        enumerate(measurements),
        key=lambda item: (
            item[1].uploaded_at,
            item[1].report_id if item[1].report_id is not None else -1,
            item[0],
        ),
    )
    records = [measurement for _, measurement in ordered]
    measurement_count = len(records)

    if measurement_count == 0:
        return TrendResult(
            normalized_name=normalized_name,
            measurement_count=0,
            unit=None,
            first_value=None,
            latest_value=None,
            absolute_change=None,
            percent_change=None,
            direction=TrendDirection.INSUFFICIENT_DATA,
            first_date=None,
            latest_date=None,
            comparable_units=True,
            issue="insufficient_measurements",
        )

    first = records[0]
    latest = records[-1]
    units = {record.unit for record in records}
    if len(units) != 1:
        return TrendResult(
            normalized_name=normalized_name,
            measurement_count=measurement_count,
            unit=None,
            first_value=first.value,
            latest_value=latest.value,
            absolute_change=None,
            percent_change=None,
            direction=TrendDirection.INSUFFICIENT_DATA,
            first_date=first.uploaded_at,
            latest_date=latest.uploaded_at,
            comparable_units=False,
            issue="mixed_units",
        )

    unit = first.unit
    if measurement_count == 1:
        return TrendResult(
            normalized_name=normalized_name,
            measurement_count=1,
            unit=unit,
            first_value=first.value,
            latest_value=latest.value,
            absolute_change=None,
            percent_change=None,
            direction=TrendDirection.INSUFFICIENT_DATA,
            first_date=first.uploaded_at,
            latest_date=latest.uploaded_at,
            comparable_units=True,
            issue="insufficient_measurements",
        )

    absolute_change = latest.value - first.value
    percent_change = (
        (absolute_change / abs(first.value)) * 100
        if first.value != 0
        else None
    )
    if math.isclose(
        latest.value,
        first.value,
        rel_tol=STABLE_RELATIVE_TOLERANCE,
        abs_tol=0.0,
    ):
        direction = TrendDirection.STABLE
    elif absolute_change > 0:
        direction = TrendDirection.INCREASING
    else:
        direction = TrendDirection.DECREASING

    return TrendResult(
        normalized_name=normalized_name,
        measurement_count=measurement_count,
        unit=unit,
        first_value=first.value,
        latest_value=latest.value,
        absolute_change=absolute_change,
        percent_change=percent_change,
        direction=direction,
        first_date=first.uploaded_at,
        latest_date=latest.uploaded_at,
        comparable_units=True,
        issue=None,
    )
