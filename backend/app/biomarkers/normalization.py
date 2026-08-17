import re
import unicodedata


HORIZONTAL_WHITESPACE_RE = re.compile(r"[^\S\r\n]+")
DOT_LEADER_RE = re.compile(r"\.{2,}")
THOUSANDS_NUMBER_RE = re.compile(r"^[+-]?\d{1,3}(?:,\d{3})+$")
DECIMAL_NUMBER_RE = re.compile(r"^[+-]?(?:\d+(?:[.,]\d+)?|[.,]\d+)$")

UNIT_CANONICAL_NAMES = {
    "%": "%", "/ul": "/µL", "/µl": "/µL", "fl": "fL",
    "g/dl": "g/dL", "g/l": "g/L", "iu/l": "IU/L",
    "meq/l": "mEq/L", "mg/dl": "mg/dL", "mg/l": "mg/L",
    "mmol/l": "mmol/L", "ml/min/1.73m2": "mL/min/1.73m²",
    "ml/min/1.73m²": "mL/min/1.73m²", "ng/l": "ng/L",
    "ng/ml": "ng/mL", "pg": "pg", "pg/ml": "pg/mL",
    "u/l": "U/L", "ug/dl": "µg/dL", "ug/l": "µg/L",
    "umol/l": "µmol/L", "µg/dl": "µg/dL", "µg/l": "µg/L",
    "µmol/l": "µmol/L", "x10^3/ul": "x10^3/µL",
    "x10^3/µl": "x10^3/µL", "x10^9/l": "x10^9/L",
    "10^9/l": "10^9/L",
}


def normalize_structure(text: str) -> str:
    """Normalize layout characters without changing numeric comma meaning."""
    normalized = unicodedata.normalize("NFKC", text)
    normalized = normalized.translate(
        str.maketrans({"\u00a0": " ", "\u2007": " ", "\u202f": " ", "\t": " ", "|": " ", "≤": "<=", "≥": ">="})
    )
    normalized = DOT_LEADER_RE.sub(" ", normalized)
    return HORIZONTAL_WHITESPACE_RE.sub(" ", normalized).strip()


def parse_number(token: str, *, allow_grouped_thousands: bool = False) -> float | None:
    """Parse unambiguous decimal-dot, decimal-comma, or grouped-thousands tokens."""
    cleaned = token.strip()
    if THOUSANDS_NUMBER_RE.fullmatch(cleaned):
        unsigned = cleaned.lstrip("+-")
        leading_group = unsigned.split(",", 1)[0]
        if leading_group == "0" and unsigned.count(",") == 1:
            cleaned = cleaned.replace(",", ".")
        elif allow_grouped_thousands:
            cleaned = cleaned.replace(",", "")
        else:
            return None
    elif DECIMAL_NUMBER_RE.fullmatch(cleaned):
        if "," in cleaned:
            cleaned = cleaned.replace(",", ".")
    else:
        return None
    try:
        return float(cleaned)
    except ValueError:
        return None


def normalize_unit(raw_unit: str) -> str | None:
    """Normalize safe spelling/spacing variants without converting units."""
    unit = unicodedata.normalize("NFKC", raw_unit).strip(" [](){}:;,.|")
    unit = unit.replace("μ", "µ").replace("×", "x")
    unit = re.sub(r"\s*/\s*", "/", unit)
    unit = re.sub(r"\s*\^\s*", "^", unit)
    unit = re.sub(r"[xX]\s*10", "x10", unit)
    if re.search(r"\s", unit) or not unit or len(unit) > 40:
        return None
    if not re.fullmatch(r"[A-Za-zµ%/0-9^.*²-]+", unit):
        return None
    if not re.search(r"[A-Za-zµ%/]", unit):
        return None
    lookup = unit.casefold().replace("μ", "µ")
    return UNIT_CANONICAL_NAMES.get(lookup, unit)
