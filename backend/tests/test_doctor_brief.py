import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy.orm import Session, sessionmaker

from backend.app.api.routes.dashboard import doctor_visit_brief
from backend.app.biomarkers.vocabulary import BIOMARKERS_BY_NORMALIZED_NAME
from backend.app.db import Base, BiomarkerResult, Report, create_database_engine
from backend.app.doctor_brief import build_doctor_visit_brief
from backend.app.doctor_brief.service import (
    NEEDS_ATTENTION_LIMIT,
    QUESTION_LIMIT,
    RECENT_REPORT_LIMIT,
)


class DoctorVisitBriefTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_directory = tempfile.TemporaryDirectory()
        database_path = Path(self.temp_directory.name) / "doctor-brief.db"
        self.engine = create_database_engine(f"sqlite:///{database_path.as_posix()}")
        Base.metadata.create_all(bind=self.engine)
        factory = sessionmaker(
            bind=self.engine, autoflush=False, expire_on_commit=False
        )
        self.session: Session = factory()

    def tearDown(self) -> None:
        self.session.close()
        self.engine.dispose()
        self.temp_directory.cleanup()

    def add_report(
        self,
        uploaded_at: datetime,
        *measurements: dict[str, object],
        requires_ocr: bool = False,
        page_count: int = 1,
    ) -> int:
        biomarkers = []
        for item in measurements:
            normalized_name = str(item["normalized_name"])
            definition = BIOMARKERS_BY_NORMALIZED_NAME[normalized_name]
            biomarkers.append(
                BiomarkerResult(
                    test_name=definition.display_name,
                    normalized_name=normalized_name,
                    value=float(item["value"]),
                    unit=str(item.get("unit", "mg/dL")),
                    reference_low=item.get("reference_low", 70),
                    reference_high=item.get("reference_high", 99),
                    reference_operator=item.get("reference_operator"),
                    raw_reference=str(item.get("raw_reference", "70 - 99")),
                    status=str(item.get("status", "normal")),
                    source_text=str(
                        item.get("source_text", "PRIVATE RAW LABORATORY SOURCE TEXT")
                    ),
                )
            )
        report = Report(
            filename="private-report-name.pdf",
            uploaded_at=uploaded_at,
            page_count=page_count,
            character_count=500,
            requires_ocr=requires_ocr,
            biomarkers=biomarkers,
        )
        self.session.add(report)
        self.session.commit()
        return report.id

    def measurement(
        self,
        normalized_name: str,
        value: float,
        *,
        unit: str = "mg/dL",
        status: str = "normal",
        reference_low: float | None = 70,
        reference_high: float | None = 99,
        raw_reference: str = "70 - 99",
    ) -> dict[str, object]:
        return {
            "normalized_name": normalized_name,
            "value": value,
            "unit": unit,
            "status": status,
            "reference_low": reference_low,
            "reference_high": reference_high,
            "raw_reference": raw_reference,
        }

    def test_empty_database_returns_a_complete_empty_brief(self) -> None:
        brief = doctor_visit_brief(self.session)

        self.assertEqual(brief.report_count, 0)
        self.assertIsNone(brief.latest_report_date)
        self.assertEqual(brief.recent_reports, [])
        self.assertEqual(brief.latest_measurements, [])
        self.assertEqual(brief.needs_attention, [])
        self.assertEqual(brief.trend_summary, [])
        self.assertEqual(brief.unclassified_measurements, [])
        self.assertEqual(brief.questions_to_discuss, [])

    def test_one_normal_report_has_measurement_without_attention_question(self) -> None:
        report_id = self.add_report(
            datetime(2026, 1, 1, tzinfo=timezone.utc),
            self.measurement("glucose", 92),
            page_count=2,
        )

        brief = build_doctor_visit_brief(self.session)

        self.assertEqual(brief.report_count, 1)
        self.assertEqual(brief.recent_reports[0].report_id, report_id)
        self.assertEqual(brief.recent_reports[0].page_count, 2)
        self.assertEqual(brief.latest_measurements[0].normalized_name, "glucose")
        self.assertEqual(brief.needs_attention, [])
        self.assertEqual(brief.questions_to_discuss, [])

    def test_latest_high_and_low_measurements_are_neutral_and_ordered(self) -> None:
        latest_date = datetime(2026, 3, 1, tzinfo=timezone.utc)
        self.add_report(
            latest_date,
            self.measurement("glucose", 110, status="high"),
            self.measurement("hemoglobin", 10.8, unit="g/dL", status="low"),
        )

        brief = build_doctor_visit_brief(self.session)

        self.assertEqual(
            [item.normalized_name for item in brief.needs_attention],
            ["glucose", "hemoglobin"],
        )
        self.assertEqual([item.status for item in brief.needs_attention], ["high", "low"])
        self.assertNotIn("urgent", brief.model_dump_json().casefold())
        self.assertNotIn("critical", brief.model_dump_json().casefold())

    def test_unknown_latest_measurement_is_separate_and_not_attention(self) -> None:
        self.add_report(
            datetime(2026, 2, 1, tzinfo=timezone.utc),
            self.measurement(
                "creatinine",
                0.84,
                status="unknown",
                reference_low=None,
                reference_high=None,
                raw_reference="",
            ),
        )

        brief = build_doctor_visit_brief(self.session)

        self.assertEqual(brief.needs_attention, [])
        self.assertEqual(len(brief.unclassified_measurements), 1)
        self.assertIn("report-provided reference range", brief.unclassified_measurements[0].reason)
        self.assertIn("did not provide a usable reference range", brief.questions_to_discuss[0])

    def test_increasing_and_decreasing_comparable_trends_are_summarized(self) -> None:
        self.add_report(
            datetime(2025, 1, 1, tzinfo=timezone.utc),
            self.measurement("glucose", 80),
            self.measurement("ldl_cholesterol", 120),
        )
        self.add_report(
            datetime(2026, 1, 1, tzinfo=timezone.utc),
            self.measurement("glucose", 92),
            self.measurement("ldl_cholesterol", 100),
        )

        brief = build_doctor_visit_brief(self.session)
        trends = {item.normalized_name: item for item in brief.trend_summary}

        self.assertEqual(trends["glucose"].direction, "increasing")
        self.assertEqual(trends["glucose"].absolute_change, 12)
        self.assertEqual(trends["ldl_cholesterol"].direction, "decreasing")
        self.assertEqual(trends["ldl_cholesterol"].absolute_change, -20)

    def test_stable_and_mixed_unit_histories_have_no_directional_summary(self) -> None:
        self.add_report(
            datetime(2025, 1, 1, tzinfo=timezone.utc),
            self.measurement("glucose", 92, unit="mg/dL"),
            self.measurement("creatinine", 0.84, unit="mg/dL"),
        )
        self.add_report(
            datetime(2026, 1, 1, tzinfo=timezone.utc),
            self.measurement("glucose", 92, unit="mg/dL"),
            self.measurement("creatinine", 74, unit="µmol/L"),
        )

        brief = build_doctor_visit_brief(self.session)

        self.assertEqual(brief.trend_summary, [])
        self.assertFalse(any("changed from" in item for item in brief.questions_to_discuss))

    def test_latest_measurement_wins_and_older_abnormal_is_not_attention(self) -> None:
        self.add_report(
            datetime(2025, 1, 1, tzinfo=timezone.utc),
            self.measurement("glucose", 110, status="high"),
        )
        latest_report_id = self.add_report(
            datetime(2026, 1, 1, tzinfo=timezone.utc),
            self.measurement("glucose", 92, status="normal"),
        )

        brief = build_doctor_visit_brief(self.session)

        self.assertEqual(len(brief.latest_measurements), 1)
        self.assertEqual(brief.latest_measurements[0].value, 92)
        self.assertEqual(brief.latest_measurements[0].report_id, latest_report_id)
        self.assertEqual(brief.needs_attention, [])

    def test_questions_are_unique_priority_ordered_and_limited(self) -> None:
        names = [
            "glucose",
            "creatinine",
            "total_cholesterol",
            "ldl_cholesterol",
            "hdl_cholesterol",
            "triglycerides",
        ]
        self.add_report(
            datetime(2026, 1, 1, tzinfo=timezone.utc),
            *(self.measurement(name, 120, status="high") for name in names),
        )

        brief = build_doctor_visit_brief(self.session)

        self.assertEqual(len(brief.questions_to_discuss), QUESTION_LIMIT)
        self.assertEqual(
            len(brief.questions_to_discuss), len(set(brief.questions_to_discuss))
        )
        self.assertTrue(all(question.startswith("My ") for question in brief.questions_to_discuss))
        self.assertLessEqual(len(brief.needs_attention), NEEDS_ATTENTION_LIMIT)

    def test_recent_reports_are_bounded_newest_first_and_exclude_filename(self) -> None:
        for year in range(2020, 2027):
            self.add_report(
                datetime(year, 1, 1, tzinfo=timezone.utc),
                self.measurement("glucose", 90 + year - 2020),
            )

        brief = build_doctor_visit_brief(self.session)

        self.assertEqual(len(brief.recent_reports), RECENT_REPORT_LIMIT)
        self.assertEqual(
            [item.uploaded_at.year for item in brief.recent_reports],
            [2026, 2025, 2024, 2023, 2022],
        )
        self.assertNotIn("filename", brief.model_dump()["recent_reports"][0])

    def test_raw_report_and_source_text_are_never_in_the_brief(self) -> None:
        secret = "PRIVATE PATIENT SOURCE CONTENT"
        item = self.measurement("glucose", 92)
        item["source_text"] = secret
        self.add_report(datetime(2026, 1, 1, tzinfo=timezone.utc), item)

        serialized = build_doctor_visit_brief(self.session).model_dump_json()

        self.assertNotIn(secret, serialized)
        self.assertNotIn("private-report-name.pdf", serialized)
        self.assertNotIn("source_text", serialized)

    def test_measurements_use_deterministic_date_then_name_order(self) -> None:
        date = datetime(2026, 1, 1, tzinfo=timezone.utc)
        self.add_report(
            date,
            self.measurement("wbc", 6.3, unit="x10^9/L"),
            self.measurement("glucose", 92),
            self.measurement("creatinine", 0.84),
        )

        brief = build_doctor_visit_brief(self.session)

        self.assertEqual(
            [item.display_name for item in brief.latest_measurements],
            ["Creatinine", "Glucose", "White Blood Cell Count"],
        )


if __name__ == "__main__":
    unittest.main()
