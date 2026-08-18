import re
from dataclasses import dataclass
from typing import cast

from .classification import classify_biomarker_value
from .models import Biomarker, BiomarkerParseResult, ReferenceOperator
from .normalization import normalize_structure, normalize_unit, parse_number
from .vocabulary import BIOMARKERS, BiomarkerDefinition

NUMBER_TOKEN = r"[+-]?(?:\d{1,3}(?:,\d{3})+|\d+(?:[.,]\d+)?|[.,]\d+)"
VALUE_RE = re.compile(rf"^(?P<value>{NUMBER_TOKEN})(?=$|\s|[|\[(:])")
REFERENCE_RE = re.compile(
    rf"(?:\b(?:ref(?:erence)?|normal\s+range)\s*:?\s*)?"
    rf"[\[(]?\s*(?P<reference>"
    rf"(?P<operator><=|>=|≤|≥|<|>)\s*(?P<limit>{NUMBER_TOKEN})"
    rf"|(?P<low>{NUMBER_TOKEN})\s*(?:-|–|—|\bto\b)\s*"
    rf"(?P<high>{NUMBER_TOKEN})"
    rf")\s*[\])]?(?=$|\s|[|,;])",
    re.IGNORECASE,
)
LAB_FLAG_RE = re.compile(r"^(?:H|L|HIGH|LOW|\*|↑|↓)$", re.IGNORECASE)


def _alias_pattern(alias: str) -> str:
    return re.escape(alias).replace(r"\ ", r"\s+")


ALIASES = sorted(
    ((alias, definition) for definition in BIOMARKERS for alias in definition.aliases),
    key=lambda item: len(item[0]),
    reverse=True,
)
NAME_RE = re.compile(
    r"^(?P<name>"
    + "|".join(_alias_pattern(alias) for alias, _ in ALIASES)
    + r")(?=$|\s|[:|.\[(])",
    re.IGNORECASE,
)
DEFINITION_BY_ALIAS = {
    " ".join(alias.casefold().split()): definition for alias, definition in ALIASES
}


@dataclass(frozen=True)
class SourceLine:
    index: int
    raw: str
    normalized: str


@dataclass(frozen=True)
class ResolvedName:
    definition: BiomarkerDefinition
    test_name: str
    remainder: str


def resolve_biomarker_name(text: str) -> ResolvedName | None:
    match = NAME_RE.match(text)
    if match is None:
        return None
    test_name = match.group("name")
    lookup = " ".join(test_name.casefold().split())
    definition = DEFINITION_BY_ALIAS.get(lookup)
    if definition is None:
        return None
    remainder = text[match.end() :].lstrip(" :.|[]()")
    return ResolvedName(definition, test_name, remainder)


def _strip_lab_flags(text: str) -> str:
    tokens = text.strip(" :;,.|[]()").split()
    while tokens and LAB_FLAG_RE.fullmatch(tokens[0]):
        tokens.pop(0)
    return " ".join(tokens)


def _parse_reference(
    match: re.Match[str],
    *,
    allow_grouped_thousands: bool,
) -> tuple[float | None, float | None, ReferenceOperator | None, str] | None:
    operator = match.group("operator")
    if operator == "≤":
        operator = "<="
    elif operator == "≥":
        operator = ">="
    limit = parse_number(
        match.group("limit"), allow_grouped_thousands=allow_grouped_thousands
    ) if match.group("limit") else None
    low = parse_number(
        match.group("low"), allow_grouped_thousands=allow_grouped_thousands
    ) if match.group("low") else None
    high = parse_number(
        match.group("high"), allow_grouped_thousands=allow_grouped_thousands
    ) if match.group("high") else None
    if (match.group("limit") and limit is None) or (match.group("low") and low is None) or (match.group("high") and high is None):
        return None
    reference_operator = cast(ReferenceOperator, operator) if operator else None
    reference_low = low
    reference_high = high
    if limit is not None and operator in (">", ">="):
        reference_low = limit
    elif limit is not None:
        reference_high = limit
    return reference_low, reference_high, reference_operator, match.group("reference")


def _parse_candidate(
    resolved: ResolvedName,
    payload: str,
    source_text: str,
) -> Biomarker | None:
    value_match = VALUE_RE.match(payload)
    if value_match is None:
        return None
    remainder = payload[value_match.end() :].strip(" :;,.|")
    reference_match = REFERENCE_RE.search(remainder)
    reference_low: float | None = None
    reference_high: float | None = None
    reference_operator: ReferenceOperator | None = None
    raw_reference = ""

    if reference_match is None:
        unit_text = _strip_lab_flags(remainder)
    else:
        before = _strip_lab_flags(remainder[: reference_match.start()])
        after = _strip_lab_flags(remainder[reference_match.end() :])
        if before and after:
            return None
        unit_text = before or after

    unit = normalize_unit(unit_text)
    if unit is None:
        return None
    allow_grouped_thousands = unit == "/µL"
    value = parse_number(
        value_match.group("value"),
        allow_grouped_thousands=allow_grouped_thousands,
    )
    if value is None:
        return None
    if reference_match is not None:
        parsed_reference = _parse_reference(
            reference_match,
            allow_grouped_thousands=allow_grouped_thousands,
        )
        if parsed_reference is None:
            return None
        reference_low, reference_high, reference_operator, raw_reference = parsed_reference
    return Biomarker(
        test_name=resolved.test_name,
        normalized_name=resolved.definition.normalized_name,
        value=value,
        unit=unit,
        reference_low=reference_low,
        reference_high=reference_high,
        reference_operator=reference_operator,
        raw_reference=raw_reference,
        source_text=source_text,
        status=classify_biomarker_value(
            value=value,
            reference_low=reference_low,
            reference_high=reference_high,
            reference_operator=reference_operator,
        ),
    )


def _candidate_blocks(
    lines: list[SourceLine], start: int, resolved: ResolvedName
) -> list[tuple[str, str, tuple[int, ...]]]:
    available_continuations: list[SourceLine] = []
    for line in lines[start + 1 : start + 4]:
        if resolve_biomarker_name(line.normalized) is not None:
            break
        available_continuations.append(line)
    blocks: list[tuple[str, str, tuple[int, ...]]] = []

    # Some PDFs expose a visual table as one text line per cell. Associate the
    # fourth cell only when the complete name/value/unit/reference structure is
    # explicit and contiguous; mixed-content or partial cells remain unknown.
    if (
        not resolved.remainder
        and len(available_continuations) == 3
        and VALUE_RE.fullmatch(available_continuations[0].normalized) is not None
        and normalize_unit(available_continuations[1].normalized) is not None
        and REFERENCE_RE.fullmatch(available_continuations[2].normalized) is not None
    ):
        payload = " ".join(line.normalized for line in available_continuations)
        source_lines = [lines[start].raw, *(line.raw for line in available_continuations)]
        indices = (lines[start].index, *(line.index for line in available_continuations))
        blocks.append((payload, "\n".join(source_lines), indices))

    continuations = available_continuations[:2]
    for continuation_count in range(len(continuations), -1, -1):
        selected = continuations[:continuation_count]
        payload_parts = [resolved.remainder, *(line.normalized for line in selected)]
        payload = " ".join(part for part in payload_parts if part).strip()
        source_lines = [lines[start].raw, *(line.raw for line in selected)]
        indices = (lines[start].index, *(line.index for line in selected))
        blocks.append((payload, "\n".join(source_lines), indices))
    return blocks


def _deduplicate(biomarkers: list[Biomarker]) -> list[Biomarker]:
    unique: list[Biomarker] = []
    seen: set[tuple[object, ...]] = set()
    for biomarker in biomarkers:
        identity = (
            biomarker.normalized_name,
            biomarker.value,
            biomarker.unit.casefold(),
            biomarker.reference_low,
            biomarker.reference_high,
            biomarker.reference_operator,
        )
        if identity in seen:
            continue
        seen.add(identity)
        unique.append(biomarker)
    return unique


def parse_biomarkers(text: str) -> BiomarkerParseResult:
    lines = [
        SourceLine(index, raw_line, normalize_structure(raw_line))
        for index, raw_line in enumerate(text.splitlines())
        if raw_line.strip()
    ]
    biomarkers: list[Biomarker] = []
    consumed_indices: set[int] = set()
    for position, line in enumerate(lines):
        if line.index in consumed_indices:
            continue
        resolved = resolve_biomarker_name(line.normalized)
        if resolved is None:
            continue
        for payload, source_text, indices in _candidate_blocks(lines, position, resolved):
            biomarker = _parse_candidate(resolved, payload, source_text)
            if biomarker is not None:
                biomarkers.append(biomarker)
                consumed_indices.update(indices)
                break

    unique = _deduplicate(biomarkers)
    return BiomarkerParseResult(
        biomarkers=unique,
        count=len(unique),
        unparsed_line_count=sum(line.index not in consumed_indices for line in lines),
    )
