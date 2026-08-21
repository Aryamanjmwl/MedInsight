import tempfile
import unittest
from pathlib import Path

from sqlalchemy.orm import Session, sessionmaker

from backend.app.biomarkers import Biomarker, BiomarkerStatus
from backend.app.db import Base, BiomarkerResult, create_database_engine, save_processed_report
from backend.tests.auth_helpers import USER_A_ID


class PersistedReportDataMinimizationTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_directory = tempfile.TemporaryDirectory()
        database_path = Path(self.temp_directory.name) / "data-minimization.db"
        self.engine = create_database_engine(f"sqlite:///{database_path.as_posix()}")
        Base.metadata.create_all(bind=self.engine)
        factory = sessionmaker(bind=self.engine, autoflush=False, expire_on_commit=False)
        self.session: Session = factory()

    def tearDown(self) -> None:
        self.session.close()
        self.engine.dispose()
        self.temp_directory.cleanup()

    def test_report_source_line_is_not_persisted(self) -> None:
        source_line = "Hemoglobin 13.5 g/dL 12.0 - 15.5"
        biomarker = Biomarker(
            test_name="Hemoglobin",
            normalized_name="hemoglobin",
            value=13.5,
            unit="g/dL",
            reference_low=12.0,
            reference_high=15.5,
            reference_operator=None,
            raw_reference="12.0 - 15.5",
            source_text=source_line,
            status=BiomarkerStatus.NORMAL,
        )

        report = save_processed_report(
            self.session,
            user_id=USER_A_ID,
            filename="synthetic-report.pdf",
            page_count=1,
            character_count=128,
            requires_ocr=False,
            biomarkers=[biomarker],
        )

        stored = self.session.get(BiomarkerResult, report.biomarkers[0].id)
        self.assertIsNotNone(stored)
        self.assertEqual(stored.source_text, "")
        self.assertEqual(stored.value, 13.5)
        self.assertEqual(stored.raw_reference, "12.0 - 15.5")
        self.assertEqual(biomarker.source_text, source_line)


if __name__ == "__main__":
    unittest.main()
