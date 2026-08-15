import io
import unittest

from fastapi import HTTPException, UploadFile
from starlette.datastructures import Headers

from backend.app.api.routes.reports import MAX_UPLOAD_SIZE_BYTES, upload_report
from backend.app.main import app, health_check


def make_upload(filename: str, content_type: str, content: bytes) -> UploadFile:
    return UploadFile(
        file=io.BytesIO(content),
        filename=filename,
        headers=Headers({"content-type": content_type}),
    )


class ReportUploadTests(unittest.IsolatedAsyncioTestCase):
    async def test_successful_pdf_upload(self) -> None:
        content = b"%PDF-1.4 test report"

        response = await upload_report(
            make_upload("blood_report.pdf", "application/pdf", content)
        )

        self.assertEqual(response.filename, "blood_report.pdf")
        self.assertEqual(response.content_type, "application/pdf")
        self.assertEqual(response.size_bytes, len(content))
        self.assertEqual(response.status, "accepted")

    async def test_successful_image_uploads(self) -> None:
        cases = (
            ("report.jpg", "image/jpeg", b"jpeg-data"),
            ("report.png", "image/png", b"png-data"),
        )

        for filename, content_type, content in cases:
            with self.subTest(content_type=content_type):
                response = await upload_report(
                    make_upload(filename, content_type, content)
                )

                self.assertEqual(response.filename, filename)
                self.assertEqual(response.content_type, content_type)
                self.assertEqual(response.size_bytes, len(content))
                self.assertEqual(response.status, "accepted")

    async def test_unsupported_file_type_is_rejected(self) -> None:
        with self.assertRaises(HTTPException) as context:
            await upload_report(make_upload("notes.txt", "text/plain", b"notes"))

        self.assertEqual(context.exception.status_code, 415)
        self.assertIn("Unsupported file type", context.exception.detail)

    async def test_oversized_file_is_rejected(self) -> None:
        content = b"x" * (MAX_UPLOAD_SIZE_BYTES + 1)

        with self.assertRaises(HTTPException) as context:
            await upload_report(
                make_upload("large-report.pdf", "application/pdf", content)
            )

        self.assertEqual(context.exception.status_code, 413)
        self.assertIn("10 MB", context.exception.detail)


class ExistingEndpointTests(unittest.TestCase):
    def test_health_endpoint_still_works(self) -> None:
        self.assertEqual(health_check(), {"status": "healthy"})

    def test_report_upload_route_is_registered(self) -> None:
        upload_operation = app.openapi()["paths"]["/reports/upload"]

        self.assertIn("post", upload_operation)


if __name__ == "__main__":
    unittest.main()
