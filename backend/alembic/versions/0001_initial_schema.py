"""Create the pre-authentication report schema.

Revision ID: 0001_initial_schema
Revises:
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "0001_initial_schema"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "reports",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("filename", sa.String(length=255), nullable=False),
        sa.Column("uploaded_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("page_count", sa.Integer(), nullable=False),
        sa.Column("character_count", sa.Integer(), nullable=False),
        sa.Column("requires_ocr", sa.Boolean(), nullable=False),
    )
    op.create_table(
        "biomarker_results",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "report_id",
            sa.Integer(),
            sa.ForeignKey("reports.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("test_name", sa.String(length=255), nullable=False),
        sa.Column("normalized_name", sa.String(length=255), nullable=False),
        sa.Column("value", sa.Float(), nullable=False),
        sa.Column("unit", sa.String(length=100), nullable=False),
        sa.Column("reference_low", sa.Float(), nullable=True),
        sa.Column("reference_high", sa.Float(), nullable=True),
        sa.Column("reference_operator", sa.String(length=2), nullable=True),
        sa.Column("raw_reference", sa.String(length=255), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("source_text", sa.Text(), nullable=False),
    )
    op.create_index(
        "ix_biomarker_results_report_id", "biomarker_results", ["report_id"]
    )


def downgrade() -> None:
    op.drop_index("ix_biomarker_results_report_id", table_name="biomarker_results")
    op.drop_table("biomarker_results")
    op.drop_table("reports")
