import io
import unittest
from unittest.mock import patch

import pytesseract
from PIL import Image, ImageDraw, ImageFont

from backend.app.document_processing import (
    MAX_OCR_PAGE_COUNT,
    OCRExtractionError,
    OCRExtractionResult,
    OCRPageLimitError,
    OCRUnavailableError,
    extract_pdf_ocr,
    extract_pdf_text,
    extract_report_text,
    has_meaningful_text,
    is_ocr_available,
    normalize_ocr_text,
)
from backend.tests.test_report_extraction import make_pdf


def make_image_only_pdf(*page_texts: str) -> bytes:
    images: list[Image.Image] = []
    font = ImageFont.load_default(size=34)
    for text in page_texts:
        image = Image.new("L", (1240, 1754), "white")
        ImageDraw.Draw(image).multiline_text(
            (80, 100), text, fill="black", font=font, spacing=24
        )
        images.append(image)

    output = io.BytesIO()
    images[0].save(
        output,
        format="PDF",
        save_all=True,
        append_images=images[1:],
        resolution=150,
    )
    for image in images:
        image.close()
    return output.getvalue()


def make_ocr_result(*page_texts: str) -> OCRExtractionResult:
    text = "\n\n".join(page_texts)
    return OCRExtractionResult(
        page_texts=tuple(page_texts),
        page_count=len(page_texts),
        text=text,
        character_count=len(text),
        has_meaningful_text=has_meaningful_text(text),
    )


class OCRNormalizationTests(unittest.TestCase):
    def test_normalization_preserves_lines_and_normalizes_safe_variants(self) -> None:
        normalized = normalize_ocr_text(
            " Hemoglobin\u00a0 13.5  g/dL  12.0\u201315.5 \r\n"
            "Glucose\t92 mg/dL 70\u201499 "
        )

        self.assertEqual(
            normalized,
            "Hemoglobin 13.5 g/dL 12.0-15.5\nGlucose 92 mg/dL 70-99",
        )


class OCRRenderingTests(unittest.TestCase):
    def test_image_only_pdf_is_rendered_and_ocr_runs_in_page_order(self) -> None:
        pdf_bytes = make_image_only_pdf("page one image", "page two image")
        self.assertFalse(extract_pdf_text(pdf_bytes).has_meaningful_text)

        with (
            patch(
                "backend.app.document_processing.ocr._configure_and_check_tesseract"
            ),
            patch(
                "backend.app.document_processing.ocr.pytesseract.image_to_string",
                side_effect=["First  page\n", "Second\u2013page\n"],
            ) as image_to_string,
        ):
            result = extract_pdf_ocr(pdf_bytes)

        self.assertEqual(result.page_texts, ("First page", "Second-page"))
        self.assertEqual(result.text, "First page\n\nSecond-page")
        self.assertEqual(result.page_count, 2)
        self.assertEqual(image_to_string.call_count, 2)

    def test_ocr_page_limit_is_explicit_and_does_not_truncate(self) -> None:
        pdf_bytes = make_pdf(*([""] * (MAX_OCR_PAGE_COUNT + 1)))

        with self.assertRaises(OCRPageLimitError) as context:
            extract_pdf_ocr(pdf_bytes)

        self.assertIn(str(MAX_OCR_PAGE_COUNT), str(context.exception))

    def test_ocr_runtime_failure_is_sanitized(self) -> None:
        with (
            patch(
                "backend.app.document_processing.ocr._configure_and_check_tesseract"
            ),
            patch(
                "backend.app.document_processing.ocr.pytesseract.image_to_string",
                side_effect=pytesseract.TesseractError(1, "raw engine failure"),
            ),
        ):
            with self.assertRaises(OCRExtractionError) as context:
                extract_pdf_ocr(make_image_only_pdf("synthetic scan"))

        self.assertNotIn("raw engine failure", str(context.exception))


class ReportExtractionOrchestrationTests(unittest.TestCase):
    def test_machine_readable_pdf_does_not_call_ocr(self) -> None:
        with patch(
            "backend.app.document_processing.report_extractor.extract_pdf_ocr"
        ) as ocr:
            result = extract_report_text(
                make_pdf("Hemoglobin 13.5 g/dL 12.0 - 15.5")
            )

        ocr.assert_not_called()
        self.assertFalse(result.requires_ocr)
        self.assertFalse(result.ocr_used)

    def test_scanned_pdf_uses_ocr_and_preserves_page_boundaries(self) -> None:
        ocr_result = make_ocr_result(
            "Hemoglobin 13.5 g/dL 12.0 - 15.5",
            "Glucose 92 mg/dL 70 - 99",
        )
        with patch(
            "backend.app.document_processing.report_extractor.extract_pdf_ocr",
            return_value=ocr_result,
        ):
            result = extract_report_text(make_pdf("", ""))

        self.assertTrue(result.requires_ocr)
        self.assertTrue(result.ocr_used)
        self.assertEqual(result.page_texts, ocr_result.page_texts)
        self.assertIn("\n\n", result.text)


@unittest.skipUnless(is_ocr_available(), "Tesseract is not installed")
class OptionalTesseractIntegrationTests(unittest.TestCase):
    def test_real_tesseract_reads_synthetic_image_only_pdf(self) -> None:
        synthetic_text = (
            "Hemoglobin 13.5 g/dL 12.0 - 15.5\n"
            "Glucose 92 mg/dL 70 - 99\n"
            "Creatinine 0.84 mg/dL 0.6 - 1.1"
        )
        result = extract_pdf_ocr(
            make_image_only_pdf(synthetic_text)
        )

        self.assertTrue(result.has_meaningful_text)
        self.assertIn("Hemoglobin", result.text)
        self.assertIn("13.5", result.text)


if __name__ == "__main__":
    unittest.main()
