"""Add owned manual measurements to the longitudinal biomarker record.

Revision ID: 0003_add_manual_measurements
Revises: 0002_add_report_ownership
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "0003_add_manual_measurements"
down_revision: str | None = "0002_add_report_ownership"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _drop_biomarker_policies() -> None:
    for policy in (
        "biomarker_results_delete_own",
        "biomarker_results_update_own",
        "biomarker_results_insert_own",
        "biomarker_results_select_own",
    ):
        op.execute(f"DROP POLICY IF EXISTS {policy} ON biomarker_results")


def _create_direct_ownership_policies() -> None:
    op.execute(
        "CREATE POLICY biomarker_results_select_own ON biomarker_results "
        "FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id)"
    )
    op.execute(
        "CREATE POLICY biomarker_results_insert_own ON biomarker_results "
        "FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id)"
    )
    op.execute(
        "CREATE POLICY biomarker_results_update_own ON biomarker_results "
        "FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) "
        "WITH CHECK ((SELECT auth.uid()) = user_id)"
    )
    op.execute(
        "CREATE POLICY biomarker_results_delete_own ON biomarker_results "
        "FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id)"
    )


def _create_report_ownership_policies() -> None:
    ownership = (
        "EXISTS (SELECT 1 FROM reports WHERE reports.id = "
        "biomarker_results.report_id AND reports.user_id = (SELECT auth.uid()))"
    )
    op.execute(
        "CREATE POLICY biomarker_results_select_own ON biomarker_results "
        f"FOR SELECT TO authenticated USING ({ownership})"
    )
    op.execute(
        "CREATE POLICY biomarker_results_insert_own ON biomarker_results "
        f"FOR INSERT TO authenticated WITH CHECK ({ownership})"
    )
    op.execute(
        "CREATE POLICY biomarker_results_update_own ON biomarker_results "
        f"FOR UPDATE TO authenticated USING ({ownership}) WITH CHECK ({ownership})"
    )
    op.execute(
        "CREATE POLICY biomarker_results_delete_own ON biomarker_results "
        f"FOR DELETE TO authenticated USING ({ownership})"
    )


def upgrade() -> None:
    op.add_column(
        "biomarker_results",
        sa.Column("user_id", sa.Uuid(), nullable=True),
    )
    op.add_column(
        "biomarker_results",
        sa.Column(
            "source",
            sa.String(length=20),
            nullable=False,
            server_default="report",
        ),
    )
    op.add_column(
        "biomarker_results",
        sa.Column("measured_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.execute(
        "UPDATE biomarker_results SET "
        "user_id = (SELECT reports.user_id FROM reports "
        "WHERE reports.id = biomarker_results.report_id), "
        "measured_at = (SELECT reports.uploaded_at FROM reports "
        "WHERE reports.id = biomarker_results.report_id)"
    )

    with op.batch_alter_table("biomarker_results") as batch_op:
        batch_op.alter_column(
            "report_id",
            existing_type=sa.Integer(),
            nullable=True,
        )
        batch_op.alter_column(
            "measured_at",
            existing_type=sa.DateTime(timezone=True),
            nullable=False,
        )
        batch_op.create_check_constraint(
            "ck_biomarker_results_source_report",
            "(source = 'report' AND report_id IS NOT NULL) OR "
            "(source = 'manual' AND report_id IS NULL AND user_id IS NOT NULL)",
        )

    op.create_index(
        "ix_biomarker_results_user_name_measured",
        "biomarker_results",
        ["user_id", "normalized_name", "measured_at"],
    )

    if op.get_bind().dialect.name == "postgresql":
        _drop_biomarker_policies()
        _create_direct_ownership_policies()


def downgrade() -> None:
    if op.get_bind().dialect.name == "postgresql":
        _drop_biomarker_policies()

    op.drop_index(
        "ix_biomarker_results_user_name_measured",
        table_name="biomarker_results",
    )
    op.execute("DELETE FROM biomarker_results WHERE report_id IS NULL")
    with op.batch_alter_table("biomarker_results") as batch_op:
        batch_op.drop_constraint(
            "ck_biomarker_results_source_report",
            type_="check",
        )
        batch_op.alter_column(
            "report_id",
            existing_type=sa.Integer(),
            nullable=False,
        )
        batch_op.drop_column("measured_at")
        batch_op.drop_column("source")
        batch_op.drop_column("user_id")

    if op.get_bind().dialect.name == "postgresql":
        _create_report_ownership_policies()
