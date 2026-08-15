from typing import Literal

from pydantic import BaseModel

ReferenceOperator = Literal["<", "<=", ">", ">="]


class Biomarker(BaseModel):
    test_name: str
    normalized_name: str
    value: float
    unit: str
    reference_low: float | None
    reference_high: float | None
    reference_operator: ReferenceOperator | None
    raw_reference: str
    source_text: str


class BiomarkerTextRequest(BaseModel):
    text: str


class BiomarkerParseResult(BaseModel):
    biomarkers: list[Biomarker]
    count: int
    unparsed_line_count: int
