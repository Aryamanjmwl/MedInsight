"""Remove persisted report source-text excerpts.

Revision ID: 0004_scrub_biomarker_source_text
Revises: 0003_add_manual_measurements
"""
from collections.abc import Sequence

from alembic import op

revision: str = "0004_scrub_biomarker_source_text"
down_revision: str | None = "0003_add_manual_measurements"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Source lines are not required for any longitudinal product feature. Existing
    # excerpts are irreversibly cleared to reduce retained report content.
    op.execute("UPDATE biomarker_results SET source_text = '' WHERE source_text <> ''")


def downgrade() -> None:
    # Privacy deletion is intentionally irreversible; removed report text cannot
    # and should not be reconstructed during downgrade.
    pass
