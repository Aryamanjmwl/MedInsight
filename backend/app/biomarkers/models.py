from enum import Enum
from typing import Literal

from pydantic import BaseModel, ConfigDict

ReferenceOperator = Literal["<", "<=", ">", ">="]


class BiomarkerStatus(str, Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    UNKNOWN = "unknown"


class MeasurementSource(str, Enum):
    REPORT = "report"
    MANUAL = "manual"


class Biomarker(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    test_name: str
    normalized_name: str
    value: float
    unit: str
    reference_low: float | None
    reference_high: float | None
    reference_operator: ReferenceOperator | None
    raw_reference: str
    source_text: str
    status: BiomarkerStatus = BiomarkerStatus.UNKNOWN


class BiomarkerTextRequest(BaseModel):
    text: str


class BiomarkerParseResult(BaseModel):
    biomarkers: list[Biomarker]
    count: int
    unparsed_line_count: int
