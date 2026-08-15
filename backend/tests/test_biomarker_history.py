import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy.orm import Session, sessionmaker

from backend.app.api.routes.biomarkers import biomarker_history, list_biomarkers
from backend.app.api.routes.reports import process_and_save_report
from backend.app.db import Base, Report, create_database_engine
from backend.tests.test_report_extraction import make_pdf
from backend.tests.test_reports import make_upload


class BiomarkerHistoryTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self) -> None:
        self.temp_directory = tempfile.TemporaryDirectory()
        database_path = Path(self.temp_directory.name) / "history-test.db"
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

    async def save_report(
        self,
        filename: str,
        uploaded_at: datetime,
        *lines: str,
    ) -> int:
        response = await process_and_save_report(
            make_upload(filename, "application/pdf", make_pdf(*lines)),
            self.session,
        )
        report = self.session.get(Report, response.report_id)
        report.uploaded_at = uploaded_at
        self.session.commit()
        return response.report_id

    async def test_history_is_chronological_with_correct_values_and_ids(self) -> None:
        latest_id = await self.save_report(
            "latest.pdf",
            datetime(2026, 3, 1, tzinfo=timezone.utc),
            "LDL Cholesterol 118 mg/dL <100",
        )
        earliest_id = await self.save_report(
            "earliest.pdf",
            datetime(2024, 1, 1, tzinfo=timezone.utc),
            "LDL Cholesterol 92 mg/dL <100",
        )
        middle_id = await self.save_report(
            "middle.pdf",
            datetime(2025, 2, 1, tzinfo=timezone.utc),
            "LDL Cholesterol 101 mg/dL <100",
        )

        response = biomarker_history("ldl_cholesterol", self.session)

        self.assertEqual(response.count, 3)
        self.assertEqual(
            [item.report_id for item in response.history],
            [earliest_id, middle_id, latest_id],
        )
        self.assertEqual([item.value for item in response.history], [92, 101, 118])
        self.assertEqual(
            [item.status for item in response.history],
            ["normal", "high", "high"],
        )
        self.assertTrue(all(item.unit == "mg/dL" for item in response.history))
        self.assertTrue(
            all(item.reference_operator == "<" for item in response.history)
        )
        self.assertTrue(
            all(item.raw_reference == "<100" for item in response.history)
        )

    def test_empty_history_is_not_an_error(self) -> None:
        response = biomarker_history("creatinine", self.session)

        self.assertEqual(response.normalized_name, "creatinine")
        self.assertEqual(response.count, 0)
        self.assertEqual(response.history, [])

    async def test_overview_uses_latest_measurement_and_keeps_names_separate(
        self,
    ) -> None:
        await self.save_report(
            "older.pdf",
            datetime(2024, 1, 1, tzinfo=timezone.utc),
            "LDL Cholesterol 92 mg/dL <100",
            "HDL Cholesterol 35 mg/dL >40",
        )
        await self.save_report(
            "newer.pdf",
            datetime(2025, 1, 1, tzinfo=timezone.utc),
            "LDL Cholesterol 118 mg/dL <100",
            "HDL Cholesterol 48 mg/dL >40",
        )
        await self.save_report(
            "latest.pdf",
            datetime(2026, 1, 1, tzinfo=timezone.utc),
            "LDL Cholesterol 95 mg/dL <100",
        )

        response = list_biomarkers(self.session)
        by_name = {item.normalized_name: item for item in response}

        self.assertEqual(set(by_name), {"hdl_cholesterol", "ldl_cholesterol"})
        self.assertEqual(by_name["ldl_cholesterol"].latest_value, 95)
        self.assertEqual(by_name["ldl_cholesterol"].latest_status, "normal")
        self.assertEqual(by_name["ldl_cholesterol"].latest_unit, "mg/dL")
        self.assertEqual(by_name["ldl_cholesterol"].latest_report_date.year, 2026)
        self.assertEqual(by_name["ldl_cholesterol"].measurement_count, 3)
        self.assertEqual(by_name["hdl_cholesterol"].latest_value, 48)
        self.assertEqual(by_name["hdl_cholesterol"].latest_status, "normal")
        self.assertEqual(by_name["hdl_cholesterol"].measurement_count, 2)


if __name__ == "__main__":
    unittest.main()
