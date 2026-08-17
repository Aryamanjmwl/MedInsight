"""Add report ownership and PostgreSQL row-level security policies.

Revision ID: 0002_add_report_ownership
Revises: 0001_initial_schema
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "0002_add_report_ownership"
down_revision: str | None = "0001_initial_schema"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Existing rows intentionally receive NULL. They are inaccessible until an
    # administrator performs an explicit, audited ownership migration.
    op.add_column("reports", sa.Column("user_id", sa.Uuid(), nullable=True))
    op.create_index(
        "ix_reports_user_uploaded_at",
        "reports",
        ["user_id", "uploaded_at"],
    )
    op.create_index(
        "ix_biomarker_results_normalized_report",
        "biomarker_results",
        ["normalized_name", "report_id"],
    )

    if op.get_bind().dialect.name == "postgresql":
        op.execute("ALTER TABLE reports ENABLE ROW LEVEL SECURITY")
        op.execute("ALTER TABLE biomarker_results ENABLE ROW LEVEL SECURITY")
        op.execute(
            "CREATE POLICY reports_select_own ON reports FOR SELECT TO authenticated "
            "USING ((SELECT auth.uid()) = user_id)"
        )
        op.execute(
            "CREATE POLICY reports_insert_own ON reports FOR INSERT TO authenticated "
            "WITH CHECK ((SELECT auth.uid()) = user_id)"
        )
        op.execute(
            "CREATE POLICY reports_update_own ON reports FOR UPDATE TO authenticated "
            "USING ((SELECT auth.uid()) = user_id) "
            "WITH CHECK ((SELECT auth.uid()) = user_id)"
        )
        op.execute(
            "CREATE POLICY reports_delete_own ON reports FOR DELETE TO authenticated "
            "USING ((SELECT auth.uid()) = user_id)"
        )
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


def downgrade() -> None:
    if op.get_bind().dialect.name == "postgresql":
        for policy in (
            "biomarker_results_delete_own",
            "biomarker_results_update_own",
            "biomarker_results_insert_own",
            "biomarker_results_select_own",
        ):
            op.execute(f"DROP POLICY IF EXISTS {policy} ON biomarker_results")
        for policy in (
            "reports_delete_own",
            "reports_update_own",
            "reports_insert_own",
            "reports_select_own",
        ):
            op.execute(f"DROP POLICY IF EXISTS {policy} ON reports")
        op.execute("ALTER TABLE biomarker_results DISABLE ROW LEVEL SECURITY")
        op.execute("ALTER TABLE reports DISABLE ROW LEVEL SECURITY")

    op.drop_index(
        "ix_biomarker_results_normalized_report",
        table_name="biomarker_results",
    )
    op.drop_index("ix_reports_user_uploaded_at", table_name="reports")
    op.drop_column("reports", "user_id")
