import tempfile
import unittest
from datetime import date
from pathlib import Path

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, sessionmaker

from backend.app.api.routes.biomarkers import edit_saved_measurement, remove_saved_measurement
from backend.app.api.routes.reports import delete_report, process_and_save_report, rename_report, ReportRenameRequest
from backend.app.biomarkers import ManualMeasurementUpdate
from backend.app.db import Base, BiomarkerResult, Report, create_database_engine
from backend.app.security import global_rate_limiter
from backend.tests.auth_helpers import USER_A, USER_B
from backend.tests.test_report_extraction import make_pdf
from backend.tests.test_reports import make_upload


class RecordManagementTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self) -> None:
        self.temp_directory = tempfile.TemporaryDirectory()
        database_path = Path(self.temp_directory.name) / "record-management.db"
        self.engine = create_database_engine(f"sqlite:///{database_path.as_posix()}")
        Base.metadata.create_all(bind=self.engine)
        factory = sessionmaker(bind=self.engine, autoflush=False, expire_on_commit=False)
        self.session: Session = factory()
        global_rate_limiter.reset()

    def tearDown(self) -> None:
        global_rate_limiter.reset()
        self.session.close()
        self.engine.dispose()
        self.temp_directory.cleanup()

    async def save_report(self, filename: str = "lab-report.pdf"):
        return await process_and_save_report(
            make_upload(
                filename,
                "application/pdf",
                make_pdf("Hemoglobin 12.5 g/dL 12.0 - 15.5"),
            ),
            self.session,
            USER_A,
        )

    async def test_owner_can_correct_report_measurement_with_provenance(self) -> None:
        saved = await self.save_report()
        report = self.session.get(Report, saved.report_id)
        measurement = report.biomarkers[0]
        original_measured_at = measurement.measured_at

        response = edit_saved_measurement(
            measurement.id,
            ManualMeasurementUpdate(
                value=14.0,
                unit="g/dL",
                measurement_date=date(2026, 8, 18),
                reference_low=12.0,
                reference_high=15.5,
                reference_operator=None,
            ),
            self.session,
            USER_A,
        )

        self.assertEqual(response.value, 14.0)
        self.assertEqual(response.source, "report")
        self.assertTrue(response.user_edited)
        stored = self.session.get(BiomarkerResult, measurement.id)
        self.assertTrue(stored.user_edited)
        self.assertEqual(stored.report_id, saved.report_id)
        self.assertEqual(stored.measured_at, original_measured_at)

    async def test_other_user_cannot_modify_or_delete_measurement(self) -> None:
        saved = await self.save_report()
        measurement_id = self.session.scalar(
            select(BiomarkerResult.id).where(BiomarkerResult.report_id == saved.report_id)
        )
        payload = ManualMeasurementUpdate(
            value=14.0,
            unit="g/dL",
            measurement_date=date(2026, 8, 18),
            reference_low=12.0,
            reference_high=15.5,
            reference_operator=None,
        )

        with self.assertRaises(HTTPException) as edit_error:
            edit_saved_measurement(measurement_id, payload, self.session, USER_B)
        self.assertEqual(edit_error.exception.status_code, 404)

        with self.assertRaises(HTTPException) as delete_error:
            remove_saved_measurement(measurement_id, self.session, USER_B)
        self.assertEqual(delete_error.exception.status_code, 404)

    async def test_owner_can_delete_one_report_measurement_without_deleting_report(self) -> None:
        saved = await self.save_report()
        measurement_id = self.session.scalar(
            select(BiomarkerResult.id).where(BiomarkerResult.report_id == saved.report_id)
        )

        response = remove_saved_measurement(measurement_id, self.session, USER_A)

        self.assertEqual(response.status, "deleted")
        self.assertIsNone(self.session.get(BiomarkerResult, measurement_id))
        self.assertIsNotNone(self.session.get(Report, saved.report_id))

    async def test_owner_can_rename_and_delete_saved_report(self) -> None:
        saved = await self.save_report()

        renamed = rename_report(
            saved.report_id,
            ReportRenameRequest(filename="Annual blood work.pdf"),
            self.session,
            USER_A,
        )
        self.assertEqual(renamed.filename, "Annual blood work.pdf")

        deleted = delete_report(saved.report_id, self.session, USER_A)
        self.assertEqual(deleted.status, "deleted")
        self.assertEqual(deleted.measurements_deleted, 1)
        self.assertIsNone(self.session.get(Report, saved.report_id))
        self.assertEqual(
            self.session.scalars(
                select(BiomarkerResult).where(BiomarkerResult.report_id == saved.report_id)
            ).all(),
            [],
        )

    async def test_other_user_cannot_rename_or_delete_report(self) -> None:
        saved = await self.save_report()

        with self.assertRaises(HTTPException) as rename_error:
            rename_report(
                saved.report_id,
                ReportRenameRequest(filename="Not mine.pdf"),
                self.session,
                USER_B,
            )
        self.assertEqual(rename_error.exception.status_code, 404)

        with self.assertRaises(HTTPException) as delete_error:
            delete_report(saved.report_id, self.session, USER_B)
        self.assertEqual(delete_error.exception.status_code, 404)
        self.assertIsNotNone(self.session.get(Report, saved.report_id))


if __name__ == "__main__":
    unittest.main()
