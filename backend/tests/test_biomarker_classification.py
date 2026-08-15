import unittest

from backend.app.api.routes.reports import extract_biomarkers
from backend.app.biomarkers import (
    BiomarkerStatus,
    BiomarkerTextRequest,
    classify_biomarker_value,
)


def classify(
    value: float,
    low: float | None = None,
    high: float | None = None,
    operator: str | None = None,
) -> BiomarkerStatus:
    return classify_biomarker_value(
        value=value,
        reference_low=low,
        reference_high=high,
        reference_operator=operator,
    )


class RangeClassificationTests(unittest.TestCase):
    def test_below_lower_bound_is_low(self) -> None:
        self.assertEqual(classify(10.8, low=12.0, high=15.5), "low")

    def test_inside_range_is_normal(self) -> None:
        self.assertEqual(classify(13.5, low=12.0, high=15.5), "normal")

    def test_above_upper_bound_is_high(self) -> None:
        self.assertEqual(classify(16.0, low=12.0, high=15.5), "high")

    def test_range_boundaries_are_normal(self) -> None:
        self.assertEqual(classify(12.0, low=12.0, high=15.5), "normal")
        self.assertEqual(classify(15.5, low=12.0, high=15.5), "normal")


class OperatorClassificationTests(unittest.TestCase):
    def test_less_than_reference(self) -> None:
        self.assertEqual(classify(92, high=100, operator="<"), "normal")
        self.assertEqual(classify(167, high=100, operator="<"), "high")
        self.assertEqual(classify(100, high=100, operator="<"), "high")

    def test_less_than_or_equal_reference(self) -> None:
        self.assertEqual(classify(100, high=100, operator="<="), "normal")
        self.assertEqual(classify(101, high=100, operator="<="), "high")

    def test_greater_than_reference(self) -> None:
        self.assertEqual(classify(48, low=40, operator=">"), "normal")
        self.assertEqual(classify(35, low=40, operator=">"), "low")
        self.assertEqual(classify(40, low=40, operator=">"), "low")

    def test_greater_than_or_equal_reference(self) -> None:
        self.assertEqual(classify(40, low=40, operator=">="), "normal")
        self.assertEqual(classify(39, low=40, operator=">="), "low")


class UnknownClassificationTests(unittest.TestCase):
    def test_missing_or_incomplete_reference_is_unknown(self) -> None:
        self.assertEqual(classify(10), "unknown")
        self.assertEqual(classify(10, low=5), "unknown")
        self.assertEqual(classify(10, high=15), "unknown")

    def test_conflicting_or_inverted_reference_is_unknown(self) -> None:
        self.assertEqual(classify(10, low=15, high=5), "unknown")
        self.assertEqual(classify(10, low=5, high=15, operator="<"), "unknown")


class BiomarkerStatusResponseTests(unittest.TestCase):
    def test_biomarker_api_response_includes_status_and_source_data(self) -> None:
        source_text = "LDL Cholesterol 167 mg/dL <100"

        response = extract_biomarkers(BiomarkerTextRequest(text=source_text))

        biomarker = response.biomarkers[0]
        self.assertEqual(biomarker.status, "high")
        self.assertEqual(biomarker.raw_reference, "<100")
        self.assertEqual(biomarker.source_text, source_text)


if __name__ == "__main__":
    unittest.main()
