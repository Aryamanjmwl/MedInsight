import re
from typing import cast

from .classification import classify_biomarker_value
from .models import Biomarker, BiomarkerParseResult, ReferenceOperator

NORMALIZED_TEST_NAMES = {
    "hemoglobin": "hemoglobin",
    "wbc": "wbc",
    "rbc": "rbc",
    "platelets": "platelets",
    "glucose": "glucose",
    "creatinine": "creatinine",
    "ldl cholesterol": "ldl_cholesterol",
    "hdl cholesterol": "hdl_cholesterol",
    "triglycerides": "triglycerides",
}

NUMBER_PATTERN = r"[+-]?(?:\d+(?:\.\d+)?|\.\d+)"
TEST_NAME_PATTERN = "|".join(
    re.escape(name).replace(r"\ ", r"\s+")
    for name in sorted(NORMALIZED_TEST_NAMES, key=len, reverse=True)
)
LAB_LINE_PATTERN = re.compile(
    rf"^\s*(?P<test_name>{TEST_NAME_PATTERN})\s+"
    rf"(?P<value>{NUMBER_PATTERN})\s+"
    rf"(?P<unit>\S+)\s+"
    rf"(?P<reference>"
    rf"(?P<operator><=|>=|<|>)\s*(?P<limit>{NUMBER_PATTERN})"
    rf"|(?P<low>{NUMBER_PATTERN})\s*(?:-|–)\s*(?P<high>{NUMBER_PATTERN})"
    rf")\s*$",
    re.IGNORECASE,
)


def parse_biomarkers(text: str) -> BiomarkerParseResult:
    biomarkers: list[Biomarker] = []
    unparsed_line_count = 0

    for source_line in text.splitlines():
        if not source_line.strip():
            continue

        match = LAB_LINE_PATTERN.fullmatch(source_line)
        if match is None:
            unparsed_line_count += 1
            continue

        test_name = match.group("test_name")
        normalized_lookup_name = " ".join(test_name.casefold().split())
        operator = match.group("operator")
        limit = match.group("limit")
        low = match.group("low")
        high = match.group("high")
        value = float(match.group("value"))
        reference_operator = (
            cast(ReferenceOperator, operator) if operator is not None else None
        )

        reference_low = float(low) if low is not None else None
        reference_high = float(high) if high is not None else None
        if limit is not None and operator in (">", ">="):
            reference_low = float(limit)
        elif limit is not None:
            reference_high = float(limit)

        biomarkers.append(
            Biomarker(
                test_name=test_name,
                normalized_name=NORMALIZED_TEST_NAMES[normalized_lookup_name],
                value=value,
                unit=match.group("unit"),
                reference_low=reference_low,
                reference_high=reference_high,
                reference_operator=reference_operator,
                raw_reference=match.group("reference"),
                source_text=source_line,
                status=classify_biomarker_value(
                    value=value,
                    reference_low=reference_low,
                    reference_high=reference_high,
                    reference_operator=reference_operator,
                ),
            )
        )

    return BiomarkerParseResult(
        biomarkers=biomarkers,
        count=len(biomarkers),
        unparsed_line_count=unparsed_line_count,
    )
