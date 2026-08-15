from datetime import datetime
from enum import Enum
from typing import Literal

from pydantic import BaseModel


class TrendDirection(str, Enum):
    INCREASING = "increasing"
    DECREASING = "decreasing"
    STABLE = "stable"
    INSUFFICIENT_DATA = "insufficient_data"


class TrendResult(BaseModel):
    normalized_name: str
    measurement_count: int
    unit: str | None
    first_value: float | None
    latest_value: float | None
    absolute_change: float | None
    percent_change: float | None
    direction: TrendDirection
    first_date: datetime | None
    latest_date: datetime | None
    comparable_units: bool
    issue: Literal["insufficient_measurements", "mixed_units"] | None
