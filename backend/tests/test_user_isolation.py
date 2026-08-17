import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path

from fastapi import HTTPException
from sqlalchemy.orm import Session, sessionmaker

from backend.app.ai_explanations.models import BiomarkerExplanation
from backend.app.api.routes.biomarkers import (
    biomarker_history,
    biomarker_trend,
    explain_biomarker,
    list_biomarkers,
)
from backend.app.api.routes.dashboard import dashboard_summary, doctor_visit_brief
from backend.app.api.routes.reports import get_report, get_reports, process_and_save_report
from backend.app.db import Base, Report, create_database_engine
from backend.tests.auth_helpers import USER_A, USER_A_ID, USER_B
from backend.tests.test_report_extraction import make_pdf
from backend.tests.test_reports import make_upload


class CountingExplanationProvider:
    def __init__(self) -> None:
        self.calls = 0

    def explain(self, context):
        self.calls += 1
        return BiomarkerExplanation(
            summary="Synthetic educational summary.",
            what_it_measures="A synthetic measurement.",
            result_context="Compared only with the printed range.",
            possible_context=["Laboratory context may matter."],
            trend_context="Synthetic trend summary.",
            questions_for_doctor=["What context matters for this result?"],
            safety_note="Educational information only; not medical advice.",
        )


class UserIsolationTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self) -> None:
        self.temp_directory = tempfile.TemporaryDirectory()
        database_path = Path(self.temp_directory.name) / "isolation.db"
        self.engine = create_database_engine(f"sqlite:///{database_path.as_posix()}")
        Base.metadata.create_all(bind=self.engine)
        factory = sessionmaker(bind=self.engine, autoflush=False, expire_on_commit=False)
        self.session: Session = factory()

    def tearDown(self) -> None:
        self.session.close()
        self.engine.dispose()
        self.temp_directory.cleanup()

    async def save(self, user, filename: str, *lines: str) -> int:
        response = await process_and_save_report(
            make_upload(
                filename,
                "application/pdf",
                make_pdf(*lines, "Synthetic laboratory report for automated testing"),
            ),
            self.session,
            user,
        )
        return response.report_id

    async def test_report_ownership_listing_detail_and_cross_user_404(self) -> None:
        user_a_report = await self.save(
            USER_A, "a.pdf", "Glucose 92 mg/dL 70 - 99"
        )
        user_b_report = await self.save(
            USER_B, "b.pdf", "LDL Cholesterol 167 mg/dL <100"
        )

        self.assertEqual(self.session.get(Report, user_a_report).user_id, USER_A_ID)
        self.assertEqual([item.id for item in get_reports(self.session, USER_A)], [user_a_report])
        self.assertEqual([item.id for item in get_reports(self.session, USER_B)], [user_b_report])
        self.assertEqual(get_report(user_a_report, self.session, USER_A).id, user_a_report)
        with self.assertRaises(HTTPException) as raised:
            get_report(user_a_report, self.session, USER_B)
        self.assertEqual(raised.exception.status_code, 404)

    async def test_history_trends_dashboard_and_brief_are_user_scoped(self) -> None:
        first_id = await self.save(USER_A, "a-old.pdf", "Glucose 80 mg/dL 70 - 99")
        latest_id = await self.save(USER_A, "a-new.pdf", "Glucose 110 mg/dL 70 - 99")
        await self.save(USER_B, "b.pdf", "Glucose 55 mg/dL 70 - 99")
        self.session.get(Report, first_id).uploaded_at = datetime(2025, 1, 1, tzinfo=timezone.utc)
        self.session.get(Report, latest_id).uploaded_at = datetime(2026, 1, 1, tzinfo=timezone.utc)
        self.session.commit()

        history = biomarker_history("glucose", self.session, USER_A)
        trend = biomarker_trend("glucose", self.session, USER_A)
        overview = list_biomarkers(self.session, USER_A)
        dashboard = dashboard_summary(self.session, USER_A)
        brief = doctor_visit_brief(self.session, USER_A)

        self.assertEqual([item.value for item in history.history], [80, 110])
        self.assertEqual(trend.direction, "increasing")
        self.assertEqual(overview[0].measurement_count, 2)
        self.assertEqual(dashboard.total_reports, 2)
        self.assertEqual(dashboard.abnormal_biomarker_count, 1)
        self.assertEqual(brief.report_count, 2)
        self.assertNotIn(55, [item.value for item in brief.latest_measurements])
        self.assertTrue(
            all(item.first_value != 55 and item.latest_value != 55 for item in brief.trend_summary)
        )

    async def test_ai_explanation_never_uses_another_users_history(self) -> None:
        await self.save(USER_A, "a.pdf", "Glucose 92 mg/dL 70 - 99")
        provider = CountingExplanationProvider()

        explanation = explain_biomarker(
            "glucose", self.session, provider, USER_A
        )
        self.assertEqual(explanation.summary, "Synthetic educational summary.")
        self.assertEqual(provider.calls, 1)

        with self.assertRaises(HTTPException) as raised:
            explain_biomarker("glucose", self.session, provider, USER_B)
        self.assertEqual(raised.exception.status_code, 404)
        self.assertEqual(provider.calls, 1)

    def test_legacy_unowned_rows_are_inaccessible(self) -> None:
        legacy = Report(
            user_id=None,
            filename="legacy.pdf",
            page_count=1,
            character_count=10,
            requires_ocr=False,
        )
        self.session.add(legacy)
        self.session.commit()

        self.assertEqual(get_reports(self.session, USER_A), [])
        with self.assertRaises(HTTPException) as raised:
            get_report(legacy.id, self.session, USER_A)
        self.assertEqual(raised.exception.status_code, 404)
