import unittest

from backend.app.api.routes.reports import extract_biomarkers, extract_report
from backend.app.biomarkers import BiomarkerTextRequest, parse_biomarkers
from backend.app.main import app, health_check
from backend.tests.auth_helpers import USER_A
from backend.tests.test_report_extraction import make_pdf
from backend.tests.test_reports import make_upload


class BiomarkerParserTests(unittest.TestCase):
    def test_standard_reference_range_and_decimal_values(self) -> None:
        result = parse_biomarkers("Hemoglobin 10.8 g/dL 12.0 - 15.5")

        self.assertEqual(result.count, 1)
        biomarker = result.biomarkers[0]
        self.assertEqual(biomarker.value, 10.8)
        self.assertEqual(biomarker.unit, "g/dL")
        self.assertEqual(biomarker.reference_low, 12.0)
        self.assertEqual(biomarker.reference_high, 15.5)
        self.assertIsNone(biomarker.reference_operator)

    def test_en_dash_reference_range(self) -> None:
        result = parse_biomarkers("Creatinine 0.84 mg/dL 0.60–1.10")

        biomarker = result.biomarkers[0]
        self.assertEqual(biomarker.reference_low, 0.60)
        self.assertEqual(biomarker.reference_high, 1.10)
        self.assertEqual(biomarker.raw_reference, "0.60–1.10")

    def test_less_than_reference_formats(self) -> None:
        cases = (("<100", "<"), ("<=100", "<="))

        for reference, operator in cases:
            with self.subTest(reference=reference):
                result = parse_biomarkers(
                    f"LDL Cholesterol 167 mg/dL {reference}"
                )
                biomarker = result.biomarkers[0]
                self.assertEqual(biomarker.reference_operator, operator)
                self.assertIsNone(biomarker.reference_low)
                self.assertEqual(biomarker.reference_high, 100.0)

    def test_greater_than_reference_formats(self) -> None:
        cases = ((">40", ">"), (">=40", ">="))

        for reference, operator in cases:
            with self.subTest(reference=reference):
                result = parse_biomarkers(
                    f"HDL Cholesterol 48 mg/dL {reference}"
                )
                biomarker = result.biomarkers[0]
                self.assertEqual(biomarker.reference_operator, operator)
                self.assertEqual(biomarker.reference_low, 40.0)
                self.assertIsNone(biomarker.reference_high)

    def test_multiple_biomarkers_and_normalized_names(self) -> None:
        text = "\n".join(
            (
                "Hemoglobin 10.8 g/dL 12.0 - 15.5",
                "WBC 6.3 x10^9/L 4.0 - 11.0",
                "Glucose 92 mg/dL 70 - 99",
            )
        )

        result = parse_biomarkers(text)

        self.assertEqual(result.count, 3)
        self.assertEqual(result.unparsed_line_count, 0)
        self.assertEqual(
            [item.normalized_name for item in result.biomarkers],
            ["hemoglobin", "wbc", "glucose"],
        )

    def test_all_explicit_test_names_are_supported(self) -> None:
        text = "\n".join(
            (
                "Hemoglobin 13 g/dL 12 - 16",
                "WBC 6 x10^9/L 4 - 11",
                "RBC 5 x10^12/L 4 - 6",
                "Platelets 250 x10^9/L 150 - 400",
                "Glucose 92 mg/dL 70 - 99",
                "Creatinine 0.84 mg/dL 0.60 - 1.10",
                "LDL Cholesterol 100 mg/dL <100",
                "HDL Cholesterol 48 mg/dL >40",
                "Triglycerides 120 mg/dL <150",
            )
        )

        result = parse_biomarkers(text)

        self.assertEqual(result.count, 9)
        self.assertEqual(
            {item.normalized_name for item in result.biomarkers},
            {
                "hemoglobin",
                "wbc",
                "rbc",
                "platelets",
                "glucose",
                "creatinine",
                "ldl_cholesterol",
                "hdl_cholesterol",
                "triglycerides",
            },
        )

    def test_unparseable_lines_are_ignored_and_counted(self) -> None:
        text = "Report heading\nUnknown Test 12 mg/dL 10 - 20\n\nGlucose: 92"

        result = parse_biomarkers(text)

        self.assertEqual(result.biomarkers, [])
        self.assertEqual(result.count, 0)
        self.assertEqual(result.unparsed_line_count, 3)

    def test_original_source_text_is_preserved(self) -> None:
        source_line = "  Glucose 92 mg/dL 70 - 99  "

        result = parse_biomarkers(source_line)

        self.assertEqual(result.biomarkers[0].source_text, source_line)

    def test_biomarker_endpoint_returns_structured_result(self) -> None:
        response = extract_biomarkers(
            BiomarkerTextRequest(text="Glucose 92 mg/dL 70 - 99")
        )

        self.assertEqual(response.count, 1)
        self.assertEqual(response.biomarkers[0].normalized_name, "glucose")
        self.assertIn("post", app.openapi()["paths"]["/reports/biomarkers"])

    def test_health_endpoint_still_works(self) -> None:
        self.assertEqual(health_check(), {"status": "healthy"})


class ExistingExtractionTests(unittest.IsolatedAsyncioTestCase):
    async def test_existing_report_extraction_still_works(self) -> None:
        text = "Synthetic laboratory report with machine-readable text."

        response = await extract_report(
            make_upload("report.pdf", "application/pdf", make_pdf(text)), USER_A
        )

        self.assertTrue(response.text_extracted)
        self.assertIn(text, response.text)


if __name__ == "__main__":
    unittest.main()
