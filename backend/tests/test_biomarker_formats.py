import unittest
from dataclasses import dataclass

from backend.app.biomarkers import parse_biomarkers
from backend.app.biomarkers.vocabulary import BIOMARKERS


@dataclass(frozen=True)
class ExpectedBiomarker:
    normalized_name: str
    value: float
    unit: str
    reference_low: float | None = None
    reference_high: float | None = None
    reference_operator: str | None = None


@dataclass(frozen=True)
class FormatCase:
    name: str
    text: str
    expected: tuple[ExpectedBiomarker, ...]


@dataclass(frozen=True)
class EvaluationMetrics:
    expected_matches: int
    missed_matches: int
    false_positives: int
    incorrect_values: int
    incorrect_units: int
    incorrect_references: int
    incorrect_normalized_names: int


E = ExpectedBiomarker
FORMAT_CASES = (
    FormatCase(
        "standard one-line",
        "Hemoglobin 13.5 g/dL 12.0 - 15.5\n"
        "Glucose 92 mg/dL 70 - 99\n"
        "Creatinine 0.84 mg/dL 0.60 - 1.10",
        (E("hemoglobin", 13.5, "g/dL", 12.0, 15.5), E("glucose", 92, "mg/dL", 70, 99), E("creatinine", 0.84, "mg/dL", 0.6, 1.1)),
    ),
    FormatCase(
        "whitespace table",
        "Test Result Unit Reference\n"
        "Hematocrit    41.2    %    36.0-46.0\n"
        "Platelets    250    x10^9/L    150-400",
        (E("hematocrit", 41.2, "%", 36, 46), E("platelets", 250, "x10^9/L", 150, 400)),
    ),
    FormatCase(
        "pipe-delimited table",
        "ALT | 28 | U/L | 0-40\nAST | 24 | U/L | 0-35",
        (E("alt", 28, "U/L", 0, 40), E("ast", 24, "U/L", 0, 35)),
    ),
    FormatCase(
        "European decimal comma",
        "Creatinine 0,84 mg / dL 0,60 to 1,10\n"
        "Potassium 4,2 mmol / L 3,5-5,1",
        (E("creatinine", 0.84, "mg/dL", 0.6, 1.1), E("potassium", 4.2, "mmol/L", 3.5, 5.1)),
    ),
    FormatCase(
        "multi-line name value reference",
        "Hemoglobin\n13.5 g/dL\n12.0 - 15.5",
        (E("hemoglobin", 13.5, "g/dL", 12, 15.5),),
    ),
    FormatCase(
        "OCR-spaced text",
        "Glucose     92    mg / dL     Ref: 70 - 99\n"
        "Albumin .... 4.3   g / dL   3.5—5.0",
        (E("glucose", 92, "mg/dL", 70, 99), E("albumin", 4.3, "g/dL", 3.5, 5.0)),
    ),
    FormatCase(
        "operator references",
        "LDL-C 92 mg/dL ≤ 100\nHDL 48 mg/dL ≥ 40",
        (E("ldl_cholesterol", 92, "mg/dL", reference_high=100, reference_operator="<="), E("hdl_cholesterol", 48, "mg/dL", reference_low=40, reference_operator=">=")),
    ),
    FormatCase(
        "abbreviated analytes",
        "HGB 13.5 g/dL [12.0 - 15.5]\n"
        "Leukocytes 6.3 x10^9/L 4.0-11.0\n"
        "Creat. 0.84 mg/dL 0.60-1.10",
        (E("hemoglobin", 13.5, "g/dL", 12, 15.5), E("wbc", 6.3, "x10^9/L", 4, 11), E("creatinine", 0.84, "mg/dL", 0.6, 1.1)),
    ),
    FormatCase(
        "duplicated summary detail",
        "Glucose 92 mg/dL 70-99\nGlucose 92 mg/dL 70-99",
        (E("glucose", 92, "mg/dL", 70, 99),),
    ),
    FormatCase(
        "unsupported mixed with supported",
        "Amylase 70 U/L 30-110\nTotal Protein 7.2 g/dL 6.0-8.3",
        (E("total_protein", 7.2, "g/dL", 6, 8.3),),
    ),
    FormatCase(
        "missing reference range",
        "TSH: 2.1 mIU/L",
        (E("tsh", 2.1, "mIU/L"),),
    ),
    FormatCase(
        "missing unit rejected",
        "Sodium 140 135-145",
        (),
    ),
    FormatCase(
        "grouped thousands and unrelated identifiers",
        "Patient ID 13,500\nReport date 2026-08-17\n"
        "Creatinine 1,100 mg/dL 0,600-1,200\n"
        "WBC 4,500 /µL 4,000 - 11,000",
        (E("wbc", 4500, "/µL", 4000, 11000),),
    ),
    FormatCase(
        "lab flags",
        "ALT 55 H U/L 0-40\nFerritin 8 Low ng/mL 15-150",
        (E("alt", 55, "U/L", 0, 40), E("ferritin", 8, "ng/mL", 15, 150)),
    ),
    FormatCase(
        "Unicode units and dashes",
        "Creatinine 84 umol / L 60—110\n"
        "Platelets 250 ×10^9 / L 150–400",
        (E("creatinine", 84, "µmol/L", 60, 110), E("platelets", 250, "x10^9/L", 150, 400)),
    ),
)


def evaluate_format_cases() -> EvaluationMetrics:
    expected_matches = missed = false_positives = 0
    incorrect_values = incorrect_units = incorrect_references = incorrect_names = 0
    for case in FORMAT_CASES:
        actual = parse_biomarkers(case.text).biomarkers
        remaining = list(actual)
        for expected in case.expected:
            same_name = [item for item in remaining if item.normalized_name == expected.normalized_name]
            if not same_name:
                missed += 1
                if any(item.value == expected.value and item.unit == expected.unit for item in remaining):
                    incorrect_names += 1
                continue
            item = same_name[0]
            remaining.remove(item)
            expected_matches += 1
            incorrect_values += item.value != expected.value
            incorrect_units += item.unit != expected.unit
            incorrect_references += (
                item.reference_low != expected.reference_low
                or item.reference_high != expected.reference_high
                or item.reference_operator != expected.reference_operator
            )
        false_positives += len(remaining)
    return EvaluationMetrics(expected_matches, missed, false_positives, incorrect_values, incorrect_units, incorrect_references, incorrect_names)


class BiomarkerFormatEvaluationTests(unittest.TestCase):
    def test_curated_vocabulary_is_bounded_and_unambiguous(self) -> None:
        normalized_names = [item.normalized_name for item in BIOMARKERS]
        aliases = [alias.casefold() for item in BIOMARKERS for alias in item.aliases]
        self.assertEqual(len(BIOMARKERS), 36)
        self.assertEqual(len(normalized_names), len(set(normalized_names)))
        self.assertEqual(len(aliases), len(set(aliases)))

    def test_synthetic_format_evaluation_has_zero_extraction_errors(self) -> None:
        metrics = evaluate_format_cases()
        self.assertEqual(len(FORMAT_CASES), 15)
        self.assertEqual(metrics.expected_matches, 25)
        self.assertEqual(metrics.missed_matches, 0)
        self.assertEqual(metrics.false_positives, 0)
        self.assertEqual(metrics.incorrect_values, 0)
        self.assertEqual(metrics.incorrect_units, 0)
        self.assertEqual(metrics.incorrect_references, 0)
        self.assertEqual(metrics.incorrect_normalized_names, 0)

    def test_distinct_qualified_analytes_are_not_merged(self) -> None:
        result = parse_biomarkers(
            "Total Bilirubin 0.8 mg/dL 0.2-1.2\n"
            "Direct Bilirubin 0.2 mg/dL 0.0-0.3"
        )
        self.assertEqual(
            [item.normalized_name for item in result.biomarkers],
            ["total_bilirubin", "direct_bilirubin"],
        )

    def test_distinct_values_for_one_analyte_are_preserved(self) -> None:
        result = parse_biomarkers(
            "Glucose 92 mg/dL 70-99\nGlucose 105 mg/dL 70-99"
        )
        self.assertEqual([item.value for item in result.biomarkers], [92, 105])

    def test_multiline_source_block_is_preserved(self) -> None:
        source = "Hemoglobin\n13.5 g/dL\n12.0 - 15.5"
        result = parse_biomarkers(source)
        self.assertEqual(result.biomarkers[0].source_text, source)

    def test_missing_reference_is_unknown_and_missing_unit_is_rejected(self) -> None:
        without_reference = parse_biomarkers("TSH 2.1 mIU/L")
        without_unit = parse_biomarkers("TSH 2.1 0.4-4.0")
        self.assertEqual(without_reference.biomarkers[0].status, "unknown")
        self.assertEqual(without_reference.biomarkers[0].raw_reference, "")
        self.assertEqual(without_unit.biomarkers, [])


if __name__ == "__main__":
    unittest.main()
