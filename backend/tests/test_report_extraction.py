import io
import unittest
from unittest.mock import patch

from fastapi import HTTPException
from pypdf import PdfWriter
from pypdf.generic import DecodedStreamObject, DictionaryObject, NameObject

from backend.app.api.routes.reports import extract_report, upload_report
from backend.app.document_processing import OCRExtractionResult
from backend.app.main import health_check
from backend.tests.test_reports import make_upload


def make_pdf(*page_texts: str) -> bytes:
    writer = PdfWriter()
    font = DictionaryObject(
        {
            NameObject("/Type"): NameObject("/Font"),
            NameObject("/Subtype"): NameObject("/Type1"),
            NameObject("/BaseFont"): NameObject("/Helvetica"),
        }
    )
    font_reference = writer._add_object(font)

    for text in page_texts:
        page = writer.add_blank_page(width=612, height=792)
        page[NameObject("/Resources")] = DictionaryObject(
            {
                NameObject("/Font"): DictionaryObject(
                    {NameObject("/F1"): font_reference}
                )
            }
        )
        if text:
            escaped_text = (
                text.replace("\\", "\\\\")
                .replace("(", "\\(")
                .replace(")", "\\)")
            )
            content = DecodedStreamObject()
            content.set_data(
                f"BT /F1 12 Tf 72 720 Td ({escaped_text}) Tj ET".encode("ascii")
            )
            page[NameObject("/Contents")] = writer._add_object(content)

    output = io.BytesIO()
    writer.write(output)
    return output.getvalue()


def make_empty_ocr_result() -> OCRExtractionResult:
    return OCRExtractionResult(
        page_texts=("",),
        page_count=1,
        text="",
        character_count=0,
        has_meaningful_text=False,
    )


class ReportExtractionTests(unittest.IsolatedAsyncioTestCase):
    async def test_valid_text_based_pdf_extraction(self) -> None:
        text = "Synthetic laboratory report with machine-readable text."

        response = await extract_report(
            make_upload("report.pdf", "application/pdf", make_pdf(text))
        )

        self.assertEqual(response.filename, "report.pdf")
        self.assertEqual(response.page_count, 1)
        self.assertIn(text, response.text)
        self.assertEqual(response.character_count, len(response.text))
        self.assertTrue(response.text_extracted)
        self.assertFalse(response.requires_ocr)
        self.assertFalse(response.ocr_used)

    async def test_multi_page_pdf_extraction(self) -> None:
        first_page = "First page synthetic laboratory information."
        second_page = "Second page synthetic laboratory information."

        response = await extract_report(
            make_upload(
                "multi-page.pdf",
                "application/pdf",
                make_pdf(first_page, second_page),
            )
        )

        self.assertEqual(response.page_count, 2)
        self.assertIn(first_page, response.text)
        self.assertIn(second_page, response.text)
        self.assertIn("\n\n", response.text)

    async def test_corrupted_pdf_is_rejected(self) -> None:
        with self.assertRaises(HTTPException) as context:
            await extract_report(
                make_upload("corrupted.pdf", "application/pdf", b"not a PDF")
            )

        self.assertEqual(context.exception.status_code, 422)
        self.assertIn("valid or readable PDF", context.exception.detail)

    async def test_non_pdf_is_rejected(self) -> None:
        with self.assertRaises(HTTPException) as context:
            await extract_report(make_upload("report.png", "image/png", b"image"))

        self.assertEqual(context.exception.status_code, 415)
        self.assertIn("PDF files are required", context.exception.detail)

    async def test_pdf_without_extractable_text_requires_ocr(self) -> None:
        with patch(
            "backend.app.document_processing.report_extractor.extract_pdf_ocr",
            return_value=make_empty_ocr_result(),
        ):
            response = await extract_report(
                make_upload("scan.pdf", "application/pdf", make_pdf(""))
            )

        self.assertEqual(response.page_count, 1)
        self.assertEqual(response.character_count, 0)
        self.assertFalse(response.text_extracted)
        self.assertTrue(response.requires_ocr)
        self.assertTrue(response.ocr_used)
        self.assertEqual(response.text, "")

    async def test_extract_returns_ocr_text_and_usage_metadata(self) -> None:
        text = "Hemoglobin 13.5 g/dL 12.0 - 15.5"
        ocr_result = OCRExtractionResult(
            page_texts=(text,),
            page_count=1,
            text=text,
            character_count=len(text),
            has_meaningful_text=True,
        )
        with patch(
            "backend.app.document_processing.report_extractor.extract_pdf_ocr",
            return_value=ocr_result,
        ):
            response = await extract_report(
                make_upload("scan.pdf", "application/pdf", make_pdf(""))
            )

        self.assertTrue(response.text_extracted)
        self.assertTrue(response.requires_ocr)
        self.assertTrue(response.ocr_used)
        self.assertEqual(response.text, text)

    async def test_existing_upload_endpoint_still_works(self) -> None:
        content = make_pdf("Synthetic report content for upload validation.")

        response = await upload_report(
            make_upload("report.pdf", "application/pdf", content)
        )

        self.assertEqual(response.status, "accepted")
        self.assertEqual(response.size_bytes, len(content))

    def test_health_endpoint_still_works(self) -> None:
        self.assertEqual(health_check(), {"status": "healthy"})


if __name__ == "__main__":
    unittest.main()
