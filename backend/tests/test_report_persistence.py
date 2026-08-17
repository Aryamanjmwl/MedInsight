import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, sessionmaker

from backend.app.api.routes.reports import (
    get_report,
    get_reports,
    process_and_save_report,
)
from backend.app.db import Base, BiomarkerResult, Report, create_database_engine
from backend.tests.test_report_extraction import make_pdf
from backend.tests.test_reports import make_upload
from backend.tests.test_ocr import make_ocr_result


class ReportPersistenceTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self) -> None:
        self.temp_directory = tempfile.TemporaryDirectory()
        database_path = Path(self.temp_directory.name) / "test.db"
        self.engine = create_database_engine(f"sqlite:///{database_path.as_posix()}")
        Base.metadata.create_all(bind=self.engine)
        session_factory = sessionmaker(
            bind=self.engine, autoflush=False, expire_on_commit=False
        )
        self.session: Session = session_factory()

    def tearDown(self) -> None:
        self.session.close()
        self.engine.dispose()
        self.temp_directory.cleanup()

    async def test_saves_processed_report_and_linked_biomarkers(self) -> None:
        pdf_bytes = make_pdf(
            "Hemoglobin 10.8 g/dL 12.0 - 15.5",
            "Glucose 92 mg/dL 70 - 99",
        )

        response = await process_and_save_report(
            make_upload("report.pdf", "application/pdf", pdf_bytes),
            self.session,
        )

        self.assertGreater(response.report_id, 0)
        self.assertEqual(response.result.biomarker_count, 2)
        saved_biomarkers = self.session.scalars(select(BiomarkerResult)).all()
        self.assertEqual(len(saved_biomarkers), 2)
        self.assertTrue(
            all(item.report_id == response.report_id for item in saved_biomarkers)
        )
        self.assertEqual(
            [item.status for item in saved_biomarkers], ["low", "normal"]
        )

    async def test_lists_and_retrieves_saved_report(self) -> None:
        saved = await process_and_save_report(
            make_upload(
                "report.pdf",
                "application/pdf",
                make_pdf("LDL Cholesterol 167 mg/dL <100"),
            ),
            self.session,
        )

        reports = get_reports(self.session)
        detail = get_report(saved.report_id, self.session)

        self.assertEqual(len(reports), 1)
        self.assertEqual(reports[0].id, saved.report_id)
        self.assertEqual(reports[0].biomarker_count, 1)
        self.assertEqual(detail.filename, "report.pdf")
        self.assertEqual(detail.biomarkers[0].normalized_name, "ldl_cholesterol")
        self.assertEqual(detail.biomarkers[0].status, "high")

    def test_missing_report_returns_404(self) -> None:
        with self.assertRaises(HTTPException) as context:
            get_report(999, self.session)

        self.assertEqual(context.exception.status_code, 404)

    async def test_report_with_zero_biomarkers_can_be_saved(self) -> None:
        with patch(
            "backend.app.document_processing.report_extractor.extract_pdf_ocr",
            return_value=make_ocr_result(""),
        ):
            response = await process_and_save_report(
                make_upload("scan.pdf", "application/pdf", make_pdf("")),
                self.session,
            )

        detail = get_report(response.report_id, self.session)
        self.assertTrue(detail.requires_ocr)
        self.assertEqual(detail.biomarker_count, 0)
        self.assertEqual(detail.biomarkers, [])

    async def test_ocr_derived_biomarkers_are_saved_without_raw_content(self) -> None:
        page_texts = (
            "Hemoglobin 10.8 g/dL 12.0 - 15.5",
            "Glucose 92 mg/dL 70 - 99",
        )
        with patch(
            "backend.app.document_processing.report_extractor.extract_pdf_ocr",
            return_value=make_ocr_result(*page_texts),
        ):
            response = await process_and_save_report(
                make_upload("scan.pdf", "application/pdf", make_pdf("", "")),
                self.session,
            )

        detail = get_report(response.report_id, self.session)
        saved_report = self.session.get(Report, response.report_id)
        self.assertTrue(response.result.requires_ocr)
        self.assertTrue(response.result.ocr_used)
        self.assertEqual(detail.biomarker_count, 2)
        self.assertEqual(
            {column.name for column in Report.__table__.columns},
            {
                "id",
                "filename",
                "uploaded_at",
                "page_count",
                "character_count",
                "requires_ocr",
            },
        )
        self.assertFalse(hasattr(saved_report, "text"))
        self.assertFalse(hasattr(saved_report, "pdf_bytes"))
        self.assertFalse(hasattr(saved_report, "page_images"))


if __name__ == "__main__":
    unittest.main()
