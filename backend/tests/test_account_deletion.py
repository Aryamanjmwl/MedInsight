import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session, sessionmaker

from backend.app.account import delete_user_health_data
from backend.app.api.routes.account import delete_my_account, delete_my_health_data
from backend.app.auth import (
    AuthAdminConfigurationError,
    AuthAdminDeletionError,
    SupabaseAdminSettings,
)
from backend.app.db import Base, BiomarkerResult, Report, create_database_engine
from backend.tests.auth_helpers import USER_A, USER_A_ID, USER_B, USER_B_ID


class AccountDeletionTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_directory = tempfile.TemporaryDirectory()
        database_path = Path(self.temp_directory.name) / "account-deletion.db"
        self.engine = create_database_engine(f"sqlite:///{database_path.as_posix()}")
        Base.metadata.create_all(bind=self.engine)
        factory = sessionmaker(bind=self.engine, autoflush=False, expire_on_commit=False)
        self.session: Session = factory()
        self._seed_user(USER_A_ID, "a.pdf", 1)
        self._seed_user(USER_B_ID, "b.pdf", 2)

    def tearDown(self) -> None:
        self.session.close()
        self.engine.dispose()
        self.temp_directory.cleanup()

    def _seed_user(self, user_id, filename: str, report_id: int) -> None:
        measured_at = datetime(2026, 8, 21, tzinfo=timezone.utc)
        report = Report(
            id=report_id,
            user_id=user_id,
            filename=filename,
            uploaded_at=measured_at,
            page_count=1,
            character_count=100,
            requires_ocr=False,
        )
        report.biomarkers.append(
            BiomarkerResult(
                user_id=user_id,
                source="report",
                measured_at=measured_at,
                test_name="Glucose",
                normalized_name="glucose",
                value=92,
                unit="mg/dL",
                reference_low=70,
                reference_high=99,
                reference_operator=None,
                raw_reference="70 - 99",
                status="normal",
                source_text="Glucose 92 mg/dL 70 - 99",
            )
        )
        manual = BiomarkerResult(
            report_id=None,
            user_id=user_id,
            source="manual",
            measured_at=measured_at,
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
        self.session.add_all([report, manual])
        self.session.commit()

    def _counts(self, user_id) -> tuple[int, int]:
        reports = self.session.scalar(select(func.count(Report.id)).where(Report.user_id == user_id))
        biomarkers = self.session.scalar(
            select(func.count(BiomarkerResult.id)).where(BiomarkerResult.user_id == user_id)
        )
        return int(reports or 0), int(biomarkers or 0)

    def test_data_deletion_removes_only_authenticated_users_records(self) -> None:
        result = delete_user_health_data(self.session, USER_A_ID)

        self.assertEqual(result.reports_deleted, 1)
        self.assertEqual(result.biomarkers_deleted, 2)
        self.assertEqual(self._counts(USER_A_ID), (0, 0))
        self.assertEqual(self._counts(USER_B_ID), (1, 2))

    def test_data_endpoint_keeps_authentication_account_out_of_scope(self) -> None:
        response = delete_my_health_data(self.session, USER_A)

        self.assertEqual(response.status, "deleted")
        self.assertEqual(response.reports_deleted, 1)
        self.assertEqual(response.biomarkers_deleted, 2)
        self.assertEqual(self._counts(USER_A_ID), (0, 0))

    def test_account_deletion_checks_admin_configuration_before_data_removal(self) -> None:
        with patch(
            "backend.app.api.routes.account.get_supabase_admin_settings",
            side_effect=AuthAdminConfigurationError,
        ):
            with self.assertRaises(HTTPException) as raised:
                delete_my_account(self.session, USER_A)

        self.assertEqual(raised.exception.status_code, 503)
        self.assertEqual(self._counts(USER_A_ID), (1, 2))

    def test_account_deletion_removes_data_then_auth_identity(self) -> None:
        settings = SupabaseAdminSettings(
            url="https://example.supabase.co",
            secret_key="synthetic-server-secret",
        )
        with patch(
            "backend.app.api.routes.account.get_supabase_admin_settings",
            return_value=settings,
        ), patch("backend.app.api.routes.account.delete_auth_user") as delete_auth_user:
            response = delete_my_account(self.session, USER_A)

        delete_auth_user.assert_called_once_with(USER_A_ID, settings=settings)
        self.assertTrue(response.account_deleted)
        self.assertEqual(self._counts(USER_A_ID), (0, 0))
        self.assertEqual(self._counts(USER_B_ID), (1, 2))

    def test_provider_failure_does_not_restore_deleted_health_data(self) -> None:
        settings = SupabaseAdminSettings(
            url="https://example.supabase.co",
            secret_key="synthetic-server-secret",
        )
        with patch(
            "backend.app.api.routes.account.get_supabase_admin_settings",
            return_value=settings,
        ), patch(
            "backend.app.api.routes.account.delete_auth_user",
            side_effect=AuthAdminDeletionError,
        ):
            with self.assertRaises(HTTPException) as raised:
                delete_my_account(self.session, USER_A)

        self.assertEqual(raised.exception.status_code, 502)
        self.assertEqual(self._counts(USER_A_ID), (0, 0))
        self.assertEqual(self._counts(USER_B_ID), (1, 2))


if __name__ == "__main__":
    unittest.main()
