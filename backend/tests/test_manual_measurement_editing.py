import tempfile
import unittest
from datetime import date
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session, sessionmaker

from backend.app.api.routes.biomarkers import (
    biomarker_history,
    biomarker_trend,
    create_manual_measurement,
    edit_manual_measurement,
    list_biomarkers,
    router as biomarkers_router,
)
from backend.app.api.routes.dashboard import dashboard_summary
from backend.app.api.routes.reports import process_and_save_report
from backend.app.biomarkers import ManualMeasurementCreate, ManualMeasurementUpdate
from backend.app.db import Base, BiomarkerResult, Report, create_database_engine
from backend.tests.auth_helpers import USER_A, USER_A_ID, USER_B
from backend.tests.test_report_extraction import make_pdf
from backend.tests.test_reports import make_upload


class ManualMeasurementEditingTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self) -> None:
        self.temp_directory = tempfile.TemporaryDirectory()
        database_path = Path(self.temp_directory.name) / "manual-measurement-editing.db"
        self.engine = create_database_engine(f"sqlite:///{database_path.as_posix()}")
        Base.metadata.create_all(bind=self.engine)
        factory = sessionmaker(bind=self.engine, autoflush=False, expire_on_commit=False)
        self.session: Session = factory()

    def tearDown(self) -> None:
        self.session.close()
        self.engine.dispose()
        self.temp_directory.cleanup()

    def create(self, *, user=USER_A, value=13.5, measurement_date=date(2026, 8, 18)):
        return create_manual_measurement(
            ManualMeasurementCreate(
                normalized_name="hemoglobin",
                value=value,
                unit="g/dL",
                measurement_date=measurement_date,
                reference_low=12.0,
                reference_high=15.5,
                reference_operator=None,
            ),
            self.session,
            user,
        )

    def update_payload(self, **overrides) -> ManualMeasurementUpdate:
        data = {
            "value": 11.8,
            "unit": "g/dL",
            "measurement_date": date(2026, 8, 19),
            "reference_low": 12.0,
            "reference_high": 15.5,
            "reference_operator": None,
        }
        data.update(overrides)
        return ManualMeasurementUpdate(**data)

    def test_owner_can_update_manual_measurement_and_status_is_recalculated(self) -> None:
        created = self.create()

        response = edit_manual_measurement(
            created.measurement_id,
            self.update_payload(),
            self.session,
            USER_A,
        )

        self.assertEqual(response.measurement_id, created.measurement_id)
        self.assertEqual(response.normalized_name, "hemoglobin")
        self.assertEqual(response.test_name, "Hemoglobin")
        self.assertEqual(response.value, 11.8)
        self.assertEqual(response.unit, "g/dL")
        self.assertEqual(response.status, "low")
        self.assertEqual(response.raw_reference, "12 - 15.5")
        self.assertEqual(response.measurement_date.date(), date(2026, 8, 19))

        stored = self.session.get(BiomarkerResult, created.measurement_id)
        self.assertEqual(stored.user_id, USER_A_ID)
        self.assertEqual(stored.source, "manual")
        self.assertIsNone(stored.report_id)
        self.assertEqual(stored.value, 11.8)
        self.assertEqual(stored.status, "low")
        self.assertEqual(self.session.query(Report).count(), 0)

    def test_update_recalculates_history_overview_dashboard_and_trend(self) -> None:
        earlier = self.create(value=13.0, measurement_date=date(2026, 7, 1))
        latest = self.create(value=14.0, measurement_date=date(2026, 8, 1))

        edit_manual_measurement(
            latest.measurement_id,
            self.update_payload(value=11.0, measurement_date=date(2026, 8, 2)),
            self.session,
            USER_A,
        )

        history = biomarker_history("hemoglobin", self.session, USER_A)
        overview = list_biomarkers(self.session, USER_A)[0]
        trend = biomarker_trend("hemoglobin", self.session, USER_A)
        dashboard = dashboard_summary(self.session, USER_A)

        self.assertEqual(
            [item.measurement_id for item in history.history],
            [earlier.measurement_id, latest.measurement_id],
        )
        self.assertEqual([item.value for item in history.history], [13.0, 11.0])
        self.assertEqual(overview.latest_value, 11.0)
        self.assertEqual(overview.latest_status, "low")
        self.assertEqual(trend.direction, "decreasing")
        self.assertEqual(trend.absolute_change, -2.0)
        self.assertEqual(dashboard.latest_biomarkers[0].latest_value, 11.0)

    def test_cross_user_and_nonexistent_updates_return_404(self) -> None:
        other_user = self.create(user=USER_B, value=9.5)

        for measurement_id in (other_user.measurement_id, 999_999):
            with self.subTest(measurement_id=measurement_id), self.assertRaises(HTTPException) as error:
                edit_manual_measurement(
                    measurement_id,
                    self.update_payload(),
                    self.session,
                    USER_A,
                )
            self.assertEqual(error.exception.status_code, 404)

        stored = self.session.get(BiomarkerResult, other_user.measurement_id)
        self.assertEqual(stored.value, 9.5)

    async def test_report_derived_measurement_cannot_be_edited_as_manual(self) -> None:
        saved = await process_and_save_report(
            make_upload(
                "report.pdf",
                "application/pdf",
                make_pdf("Hemoglobin 12.5 g/dL 12.0 - 15.5"),
            ),
            self.session,
            USER_A,
        )
        report_measurement = self.session.scalar(
            select(BiomarkerResult).where(BiomarkerResult.report_id == saved.report_id)
        )

        with self.assertRaises(HTTPException) as error:
            edit_manual_measurement(
                report_measurement.id,
                self.update_payload(),
                self.session,
                USER_A,
            )

        self.assertEqual(error.exception.status_code, 404)
        stored = self.session.get(BiomarkerResult, report_measurement.id)
        self.assertEqual(stored.value, 12.5)
        self.assertIsNotNone(self.session.get(Report, saved.report_id))

    def test_update_schema_does_not_allow_changing_biomarker_identity(self) -> None:
        with self.assertRaises(ValidationError):
            ManualMeasurementUpdate(
                normalized_name="glucose",
                value=11.8,
                unit="g/dL",
                measurement_date=date(2026, 8, 19),
                reference_low=12.0,
                reference_high=15.5,
            )

    def test_update_route_requires_authentication(self) -> None:
        api = FastAPI()
        api.include_router(biomarkers_router)

        response = TestClient(api).put(
            "/biomarkers/manual/1",
            json={
                "value": 11.8,
                "unit": "g/dL",
                "measurement_date": "2026-08-19",
                "reference_low": 12.0,
                "reference_high": 15.5,
                "reference_operator": None,
            },
        )

        self.assertEqual(response.status_code, 401)


if __name__ == "__main__":
    unittest.main()
