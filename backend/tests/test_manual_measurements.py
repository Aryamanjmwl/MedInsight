import tempfile
import unittest
from datetime import date, datetime, timezone
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from pydantic import ValidationError
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, sessionmaker

from backend.app.ai_explanations import build_biomarker_explanation_context
from backend.app.api.routes.biomarkers import (
    biomarker_history,
    biomarker_trend,
    create_manual_measurement,
    list_biomarkers,
    remove_manual_measurement,
)
from backend.app.api.routes.biomarkers import router as biomarkers_router
from backend.app.api.routes.dashboard import dashboard_summary, doctor_visit_brief
from backend.app.api.routes.reports import process_and_save_report
from backend.app.biomarkers import ManualMeasurementCreate
from backend.app.biomarkers.vocabulary import BIOMARKERS_BY_NORMALIZED_NAME
from backend.app.db import Base, BiomarkerResult, Report, create_database_engine
from backend.app.trends import calculate_trend
from backend.tests.auth_helpers import USER_A, USER_A_ID, USER_B
from backend.tests.test_report_extraction import make_pdf
from backend.tests.test_reports import make_upload


class ManualMeasurementTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self) -> None:
        self.temp_directory = tempfile.TemporaryDirectory()
        database_path = Path(self.temp_directory.name) / "manual-measurements.db"
        self.engine = create_database_engine(f"sqlite:///{database_path.as_posix()}")
        Base.metadata.create_all(bind=self.engine)
        factory = sessionmaker(bind=self.engine, autoflush=False, expire_on_commit=False)
        self.session: Session = factory()

    def tearDown(self) -> None:
        self.session.close()
        self.engine.dispose()
        self.temp_directory.cleanup()

    def payload(self, **overrides) -> ManualMeasurementCreate:
        data = {
            "normalized_name": "hemoglobin",
            "value": 13.5,
            "unit": "g/dL",
            "measurement_date": date(2026, 8, 18),
            "reference_low": None,
            "reference_high": None,
            "reference_operator": None,
        }
        data.update(overrides)
        return ManualMeasurementCreate(**data)

    def create(self, *, user=USER_A, **overrides):
        return create_manual_measurement(
            self.payload(**overrides), self.session, user
        )

    def test_without_reference_is_unknown_and_does_not_create_report(self) -> None:
        response = self.create()

        self.assertEqual(response.status, "unknown")
        self.assertEqual(response.source, "manual")
        self.assertEqual(response.raw_reference, "")
        self.assertIsNone(response.reference_low)
        self.assertIsNone(response.reference_high)
        self.assertEqual(self.session.scalar(select(func.count(Report.id))), 0)
        stored = self.session.get(BiomarkerResult, response.measurement_id)
        self.assertIsNone(stored.report_id)
        self.assertEqual(stored.user_id, USER_A_ID)
        self.assertEqual(stored.source_text, "")

    def test_database_rejects_unowned_manual_measurement(self) -> None:
        self.session.add(
            BiomarkerResult(
                report_id=None,
                user_id=None,
                source="manual",
                measured_at=datetime(2026, 8, 18, tzinfo=timezone.utc),
                test_name="Hemoglobin",
                normalized_name="hemoglobin",
                value=13.5,
                unit="g/dL",
                reference_low=None,
                reference_high=None,
                reference_operator=None,
                raw_reference="",
                status="unknown",
                source_text="",
            )
        )

        with self.assertRaises(IntegrityError):
            self.session.commit()
        self.session.rollback()

    def test_range_classification_is_calculated_server_side(self) -> None:
        cases = ((13.5, "normal"), (11.5, "low"), (16.0, "high"))
        for value, expected_status in cases:
            with self.subTest(value=value):
                response = self.create(
                    value=value,
                    reference_low=12.0,
                    reference_high=15.5,
                )
                self.assertEqual(response.status, expected_status)
                self.assertEqual(response.raw_reference, "12 - 15.5")

    def test_operator_reference_is_supported(self) -> None:
        response = self.create(
            normalized_name="ldl_cholesterol",
            value=167,
            unit="mg/dL",
            reference_high=100,
            reference_operator="<",
        )

        self.assertEqual(response.status, "high")
        self.assertEqual(response.raw_reference, "<100")

    def test_unsupported_biomarker_and_invalid_unit_are_rejected(self) -> None:
        with self.assertRaises(HTTPException) as unsupported:
            self.create(normalized_name="unsupported_test")
        self.assertEqual(unsupported.exception.status_code, 422)

        with self.assertRaises(HTTPException) as invalid_unit:
            self.create(unit="not a valid unit")
        self.assertEqual(invalid_unit.exception.status_code, 422)

    def test_invalid_value_range_and_date_are_rejected(self) -> None:
        with self.assertRaises(ValidationError):
            ManualMeasurementCreate(
                normalized_name="hemoglobin",
                value="normal",
                unit="g/dL",
                measurement_date="2026-08-18",
            )
        with self.assertRaises(ValidationError):
            self.payload(reference_low=15.5, reference_high=12.0)
        with self.assertRaises(ValidationError):
            self.payload(reference_low=12.0)
        with self.assertRaises(ValidationError):
            self.payload(measurement_date=date(2099, 1, 1))
        for invalid_value in (float("nan"), float("inf"), float("-inf")):
            with self.subTest(invalid_value=invalid_value), self.assertRaises(ValidationError):
                self.payload(value=invalid_value)
        with self.assertRaises(ValidationError):
            self.payload(reference_high=15.5)
        with self.assertRaises(ValidationError):
            ManualMeasurementCreate(
                normalized_name="hemoglobin",
                value=13.5,
                unit="g/dL",
                measurement_date="2026-08-18",
                status="normal",
            )

        for invalid_unit in ("", "   ", "unsupported-unit"):
            with self.subTest(invalid_unit=invalid_unit):
                with self.assertRaises((ValidationError, HTTPException)):
                    self.create(unit=invalid_unit)

    def test_manual_history_is_chronological_and_user_scoped(self) -> None:
        user_a = self.create(value=13.5)
        self.create(user=USER_B, value=9.5)

        history_a = biomarker_history("hemoglobin", self.session, USER_A)
        history_b = biomarker_history("hemoglobin", self.session, USER_B)

        self.assertEqual([item.value for item in history_a.history], [13.5])
        self.assertEqual(history_a.history[0].measurement_id, user_a.measurement_id)
        self.assertIsNone(history_a.history[0].report_id)
        self.assertEqual(history_a.history[0].source, "manual")
        self.assertEqual([item.value for item in history_b.history], [9.5])

    async def test_report_and_manual_measurements_share_history_and_trend(self) -> None:
        saved = await process_and_save_report(
            make_upload(
                "report.pdf",
                "application/pdf",
                make_pdf("Hemoglobin 12.5 g/dL 12.0 - 15.5"),
            ),
            self.session,
            USER_A,
        )
        report = self.session.get(Report, saved.report_id)
        report.uploaded_at = datetime(2026, 7, 17, tzinfo=timezone.utc)
        self.session.commit()
        self.create(
            value=13.5,
            reference_low=12.0,
            reference_high=15.5,
        )

        history = biomarker_history("hemoglobin", self.session, USER_A)
        trend = biomarker_trend("hemoglobin", self.session, USER_A)

        self.assertEqual([item.source for item in history.history], ["report", "manual"])
        self.assertEqual([item.value for item in history.history], [12.5, 13.5])
        self.assertEqual(trend.direction, "increasing")
        self.assertEqual(trend.absolute_change, 1.0)

    def test_mixed_units_remain_non_comparable(self) -> None:
        self.create(value=13.5, unit="g/dL", measurement_date=date(2026, 7, 17))
        self.create(value=135, unit="g/L")

        trend = biomarker_trend("hemoglobin", self.session, USER_A)

        self.assertFalse(trend.comparable_units)
        self.assertEqual(trend.issue, "mixed_units")
        self.assertIsNone(trend.absolute_change)

    def test_latest_dashboard_brief_and_ai_context_preserve_manual_source(self) -> None:
        self.create(
            value=11.5,
            reference_low=12.0,
            reference_high=15.5,
        )

        overview = list_biomarkers(self.session, USER_A)[0]
        dashboard = dashboard_summary(self.session, USER_A)
        brief = doctor_visit_brief(self.session, USER_A)
        history = biomarker_history("hemoglobin", self.session, USER_A)
        trend = calculate_trend("hemoglobin", history.history)
        context = build_biomarker_explanation_context(
            BIOMARKERS_BY_NORMALIZED_NAME["hemoglobin"], history.history, trend
        )

        self.assertEqual(overview.latest_source, "manual")
        self.assertEqual(dashboard.abnormal_biomarker_count, 1)
        self.assertEqual(dashboard.latest_biomarkers[0].latest_source, "manual")
        self.assertEqual(dashboard.recent_manual_measurements[0].value, 11.5)
        self.assertEqual(brief.report_count, 0)
        self.assertEqual(brief.latest_measurements[0].source, "manual")
        self.assertEqual(brief.needs_attention[0].source, "manual")
        self.assertEqual(context.measurement_source, "manual")

    def test_owner_delete_recalculates_latest_and_preserves_other_measurements(self) -> None:
        earlier = self.create(
            value=12.0,
            measurement_date=date(2026, 6, 17),
        )
        retained_latest = self.create(
            value=12.5,
            measurement_date=date(2026, 7, 17),
        )
        latest = self.create(value=13.5)

        response = remove_manual_measurement(
            latest.measurement_id,
            self.session,
            USER_A,
        )

        self.assertEqual(response.status, "deleted")
        history = biomarker_history("hemoglobin", self.session, USER_A)
        self.assertEqual(
            [item.measurement_id for item in history.history],
            [earlier.measurement_id, retained_latest.measurement_id],
        )
        self.assertEqual(list_biomarkers(self.session, USER_A)[0].latest_value, 12.5)
        trend = biomarker_trend("hemoglobin", self.session, USER_A)
        self.assertEqual(trend.latest_value, 12.5)
        self.assertEqual(trend.absolute_change, 0.5)
        self.assertEqual(dashboard_summary(self.session, USER_A).latest_biomarkers[0].latest_value, 12.5)
        self.assertEqual(doctor_visit_brief(self.session, USER_A).latest_measurements[0].value, 12.5)
        self.assertIsNone(self.session.get(BiomarkerResult, latest.measurement_id))
        self.assertIsNotNone(self.session.get(BiomarkerResult, earlier.measurement_id))
        self.assertIsNotNone(self.session.get(BiomarkerResult, retained_latest.measurement_id))
        self.assertEqual(self.session.scalar(select(func.count(Report.id))), 0)

    def test_cross_user_and_nonexistent_delete_return_404(self) -> None:
        other_user = self.create(user=USER_B, value=9.5)

        for measurement_id in (other_user.measurement_id, 999_999):
            with self.subTest(measurement_id=measurement_id), self.assertRaises(HTTPException) as error:
                remove_manual_measurement(measurement_id, self.session, USER_A)
            self.assertEqual(error.exception.status_code, 404)

        self.assertIsNotNone(self.session.get(BiomarkerResult, other_user.measurement_id))

    def test_delete_route_requires_authentication(self) -> None:
        api = FastAPI()
        api.include_router(biomarkers_router)

        response = TestClient(api).delete("/biomarkers/manual/1")

        self.assertEqual(response.status_code, 401)

    async def test_report_result_cannot_be_deleted_through_manual_route(self) -> None:
        saved = await process_and_save_report(
            make_upload(
                "report.pdf",
                "application/pdf",
                make_pdf("Hemoglobin 12.5 g/dL 12.0 - 15.5"),
            ),
            self.session,
            USER_A,
        )
        report_biomarker = self.session.scalar(
            select(BiomarkerResult).where(BiomarkerResult.report_id == saved.report_id)
        )

        with self.assertRaises(HTTPException) as error:
            remove_manual_measurement(report_biomarker.id, self.session, USER_A)

        self.assertEqual(error.exception.status_code, 404)
        self.assertIsNotNone(self.session.get(Report, saved.report_id))
        self.assertIsNotNone(self.session.get(BiomarkerResult, report_biomarker.id))


if __name__ == "__main__":
    unittest.main()
