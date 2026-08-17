import unittest
from unittest.mock import patch

from fastapi import HTTPException

from backend.app.api.routes.reports import (
    MAX_UPLOAD_SIZE_BYTES,
    extract_biomarkers,
    extract_report,
    process_report,
    upload_report,
)
from backend.app.biomarkers import BiomarkerTextRequest
from backend.app.document_processing import (
    OCRExtractionError,
    OCRUnavailableError,
)
from backend.app.main import app, health_check
from backend.tests.test_report_extraction import make_pdf
from backend.tests.test_ocr import make_ocr_result
from backend.tests.test_reports import make_upload


class IntegratedReportProcessingTests(unittest.IsolatedAsyncioTestCase):
    async def test_valid_pdf_returns_multiple_classified_biomarkers(self) -> None:
        pdf_bytes = make_pdf(
            "Hemoglobin 10.8 g/dL 12.0 - 15.5",
            "Glucose 92 mg/dL 70 - 99",
            "LDL Cholesterol 167 mg/dL <100",
        )

        response = await process_report(
            make_upload("report.pdf", "application/pdf", pdf_bytes)
        )

        self.assertEqual(response.filename, "report.pdf")
        self.assertEqual(response.page_count, 3)
        self.assertGreater(response.character_count, 0)
        self.assertFalse(response.requires_ocr)
        self.assertFalse(response.ocr_used)
        self.assertEqual(response.biomarker_count, 3)
        self.assertEqual(response.unparsed_line_count, 0)
        self.assertEqual(
            [biomarker.status for biomarker in response.biomarkers],
            ["low", "normal", "high"],
        )
        self.assertFalse(hasattr(response, "text"))

    async def test_unparseable_lines_are_counted(self) -> None:
        pdf_bytes = make_pdf(
            "Synthetic laboratory report heading",
            "Glucose 92 mg/dL 70 - 99",
            "Unsupported result format",
        )

        response = await process_report(
            make_upload("report.pdf", "application/pdf", pdf_bytes)
        )

        self.assertEqual(response.biomarker_count, 1)
        self.assertEqual(response.unparsed_line_count, 2)

    async def test_pdf_without_meaningful_text_requires_ocr(self) -> None:
        with patch(
            "backend.app.document_processing.report_extractor.extract_pdf_ocr",
            return_value=make_ocr_result(""),
        ):
            response = await process_report(
                make_upload("scan.pdf", "application/pdf", make_pdf(""))
            )

        self.assertTrue(response.requires_ocr)
        self.assertTrue(response.ocr_used)
        self.assertEqual(response.biomarkers, [])
        self.assertEqual(response.biomarker_count, 0)
        self.assertEqual(response.unparsed_line_count, 0)

    async def test_scanned_pdf_uses_ocr_and_classifies_biomarkers(self) -> None:
        ocr_result = make_ocr_result(
            "Hemoglobin 10.8 g/dL 12.0 - 15.5",
            "Glucose 92 mg/dL 70 - 99",
            "LDL Cholesterol 167 mg/dL <100",
        )
        with patch(
            "backend.app.document_processing.report_extractor.extract_pdf_ocr",
            return_value=ocr_result,
        ):
            response = await process_report(
                make_upload("scan.pdf", "application/pdf", make_pdf("", "", ""))
            )

        self.assertTrue(response.requires_ocr)
        self.assertTrue(response.ocr_used)
        self.assertEqual(response.biomarker_count, 3)
        self.assertEqual(
            [item.status for item in response.biomarkers],
            ["low", "normal", "high"],
        )

    async def test_ocr_unavailable_returns_503_for_scan(self) -> None:
        with patch(
            "backend.app.document_processing.report_extractor.extract_pdf_ocr",
            side_effect=OCRUnavailableError("OCR capability unavailable."),
        ):
            with self.assertRaises(HTTPException) as context:
                await process_report(
                    make_upload("scan.pdf", "application/pdf", make_pdf(""))
                )

        self.assertEqual(context.exception.status_code, 503)
        self.assertEqual(context.exception.detail, "OCR capability unavailable.")

    async def test_machine_readable_pdf_works_when_ocr_is_unavailable(self) -> None:
        with patch(
            "backend.app.document_processing.report_extractor.extract_pdf_ocr",
            side_effect=OCRUnavailableError("OCR capability unavailable."),
        ) as ocr:
            response = await process_report(
                make_upload(
                    "text.pdf",
                    "application/pdf",
                    make_pdf("Hemoglobin 13.5 g/dL 12.0 - 15.5"),
                )
            )

        ocr.assert_not_called()
        self.assertEqual(response.biomarker_count, 1)
        self.assertFalse(response.requires_ocr)

    async def test_ocr_runtime_failure_returns_sanitized_422(self) -> None:
        with patch(
            "backend.app.document_processing.report_extractor.extract_pdf_ocr",
            side_effect=OCRExtractionError("The report could not be read using OCR."),
        ):
            with self.assertRaises(HTTPException) as context:
                await process_report(
                    make_upload("scan.pdf", "application/pdf", make_pdf(""))
                )

        self.assertEqual(context.exception.status_code, 422)
        self.assertEqual(
            context.exception.detail, "The report could not be read using OCR."
        )

    async def test_text_and_scanned_pdfs_produce_equivalent_biomarkers(self) -> None:
        page_texts = (
            "Hemoglobin 13.5 g/dL 12.0 - 15.5",
            "Glucose 92 mg/dL 70 - 99",
            "Creatinine 0.84 mg/dL 0.60 - 1.10",
        )
        direct = await process_report(
            make_upload("text.pdf", "application/pdf", make_pdf(*page_texts))
        )
        with patch(
            "backend.app.document_processing.report_extractor.extract_pdf_ocr",
            return_value=make_ocr_result(*page_texts),
        ):
            scanned = await process_report(
                make_upload("scan.pdf", "application/pdf", make_pdf("", "", ""))
            )

        self.assertEqual(direct.biomarkers, scanned.biomarkers)
        self.assertEqual(direct.biomarker_count, scanned.biomarker_count)
        self.assertFalse(direct.ocr_used)
        self.assertTrue(scanned.ocr_used)

    async def test_corrupted_pdf_is_rejected(self) -> None:
        with self.assertRaises(HTTPException) as context:
            await process_report(
                make_upload("corrupted.pdf", "application/pdf", b"not a PDF")
            )

        self.assertEqual(context.exception.status_code, 422)

    async def test_non_pdf_is_rejected(self) -> None:
        with self.assertRaises(HTTPException) as context:
            await process_report(make_upload("report.png", "image/png", b"image"))

        self.assertEqual(context.exception.status_code, 415)

    async def test_oversized_pdf_is_rejected(self) -> None:
        content = b"x" * (MAX_UPLOAD_SIZE_BYTES + 1)

        with self.assertRaises(HTTPException) as context:
            await process_report(
                make_upload("large.pdf", "application/pdf", content)
            )

        self.assertEqual(context.exception.status_code, 413)

    async def test_existing_upload_still_works(self) -> None:
        content = make_pdf("Synthetic report text for upload validation.")

        response = await upload_report(
            make_upload("report.pdf", "application/pdf", content)
        )

        self.assertEqual(response.status, "accepted")

    async def test_existing_extract_still_works(self) -> None:
        text = "Synthetic machine-readable laboratory report text."

        response = await extract_report(
            make_upload("report.pdf", "application/pdf", make_pdf(text))
        )

        self.assertIn(text, response.text)


class ExistingEndpointTests(unittest.TestCase):
    def test_existing_biomarker_endpoint_still_works(self) -> None:
        response = extract_biomarkers(
            BiomarkerTextRequest(text="Glucose 92 mg/dL 70 - 99")
        )

        self.assertEqual(response.biomarkers[0].status, "normal")

    def test_health_endpoint_still_works(self) -> None:
        self.assertEqual(health_check(), {"status": "healthy"})

    def test_process_route_is_registered(self) -> None:
        self.assertIn("post", app.openapi()["paths"]["/reports/process"])


if __name__ == "__main__":
    unittest.main()
