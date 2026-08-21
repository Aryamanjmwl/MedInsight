"""Track owner corrections to saved biomarker measurements.

Revision ID: 0005_add_biomarker_user_edited
Revises: 0004_scrub_biomarker_source_text
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "0005_add_biomarker_user_edited"
down_revision: str | None = "0004_scrub_biomarker_source_text"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "biomarker_results",
        sa.Column(
            "user_edited",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )


def downgrade() -> None:
    op.drop_column("biomarker_results", "user_edited")
