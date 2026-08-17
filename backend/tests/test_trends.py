import tempfile
import unittest
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy.orm import Session, sessionmaker

from backend.app.api.routes.biomarkers import biomarker_trend
from backend.app.api.routes.dashboard import dashboard_summary
from backend.app.api.routes.reports import process_and_save_report
from backend.app.db import Base, Report, create_database_engine
from backend.app.trends import calculate_trend
from backend.tests.test_report_extraction import make_pdf
from backend.tests.test_reports import make_upload
from backend.tests.auth_helpers import USER_A


@dataclass(frozen=True)
class Measurement:
    report_id: int
    uploaded_at: datetime
    value: float
    unit: str = "mg/dL"


def measurement(value: float, year: int, unit: str = "mg/dL") -> Measurement:
    return Measurement(
        report_id=year,
        uploaded_at=datetime(year, 1, 1, tzinfo=timezone.utc),
        value=value,
        unit=unit,
    )


class TrendCalculationTests(unittest.TestCase):
    def test_increasing_trend_and_percent_change(self) -> None:
        result = calculate_trend(
            "ldl_cholesterol",
            [measurement(100, 2024), measurement(125, 2025)],
        )

        self.assertEqual(result.direction, "increasing")
        self.assertEqual(result.absolute_change, 25)
        self.assertEqual(result.percent_change, 25)

    def test_decreasing_trend(self) -> None:
        result = calculate_trend(
            "glucose", [measurement(100, 2024), measurement(80, 2025)]
        )

        self.assertEqual(result.direction, "decreasing")
        self.assertEqual(result.absolute_change, -20)

    def test_tiny_relative_change_is_stable(self) -> None:
        result = calculate_trend(
            "glucose", [measurement(100, 2024), measurement(100.00005, 2025)]
        )

        self.assertEqual(result.direction, "stable")

    def test_zero_or_one_measurement_is_insufficient(self) -> None:
        empty = calculate_trend("glucose", [])
        single = calculate_trend("glucose", [measurement(92, 2025)])

        self.assertEqual(empty.direction, "insufficient_data")
        self.assertEqual(empty.measurement_count, 0)
        self.assertEqual(single.direction, "insufficient_data")
        self.assertEqual(single.measurement_count, 1)

    def test_zero_first_value_has_no_percent_change(self) -> None:
        result = calculate_trend(
            "glucose", [measurement(0, 2024), measurement(10, 2025)]
        )

        self.assertEqual(result.absolute_change, 10)
        self.assertIsNone(result.percent_change)
        self.assertEqual(result.direction, "increasing")

    def test_mixed_units_are_not_compared(self) -> None:
        result = calculate_trend(
            "glucose",
            [measurement(92, 2024, "mg/dL"), measurement(5.1, 2025, "mmol/L")],
        )

        self.assertEqual(result.direction, "insufficient_data")
        self.assertFalse(result.comparable_units)
        self.assertEqual(result.issue, "mixed_units")
        self.assertIsNone(result.unit)
        self.assertIsNone(result.absolute_change)
        self.assertIsNone(result.percent_change)


class TrendApiTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self) -> None:
        self.temp_directory = tempfile.TemporaryDirectory()
        database_path = Path(self.temp_directory.name) / "trend-test.db"
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
        self, filename: str, uploaded_at: datetime, *lines: str
    ) -> int:
        response = await process_and_save_report(
            make_upload(filename, "application/pdf", make_pdf(*lines)),
            self.session,
            USER_A,
        )
        report = self.session.get(Report, response.report_id)
        report.uploaded_at = uploaded_at
        self.session.commit()
        return response.report_id

    def test_missing_history_returns_insufficient_data(self) -> None:
        result = biomarker_trend("creatinine", self.session, USER_A)

        self.assertEqual(result.measurement_count, 0)
        self.assertEqual(result.direction, "insufficient_data")

    async def test_dashboard_summary_counts_and_trends(self) -> None:
        await self.save_report(
            "older.pdf",
            datetime(2024, 1, 1, tzinfo=timezone.utc),
            "LDL Cholesterol 92 mg/dL <100",
            "HDL Cholesterol 35 mg/dL >40",
        )
        await self.save_report(
            "latest.pdf",
            datetime(2025, 6, 1, tzinfo=timezone.utc),
            "LDL Cholesterol 118 mg/dL <100",
            "HDL Cholesterol 48 mg/dL >40",
            "Glucose 92 mg/dL 70 - 99",
        )

        result = dashboard_summary(self.session, USER_A)
        ldl_trend = biomarker_trend("ldl_cholesterol", self.session, USER_A)

        self.assertEqual(result.total_reports, 2)
        self.assertEqual(result.total_distinct_biomarkers, 3)
        self.assertEqual(result.abnormal_biomarker_count, 1)
        self.assertEqual(result.latest_report_date.year, 2025)
        self.assertEqual(len(result.latest_biomarkers), 3)
        self.assertEqual(
            {trend.normalized_name for trend in result.trends},
            {"hdl_cholesterol", "ldl_cholesterol"},
        )
        self.assertEqual(ldl_trend.direction, "increasing")
        self.assertEqual(ldl_trend.absolute_change, 26)


if __name__ == "__main__":
    unittest.main()
