from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Index, Integer, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Report(Base):
    __tablename__ = "reports"
    __table_args__ = (Index("ix_reports_user_uploaded_at", "user_id", "uploaded_at"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    # Nullable only so pre-authentication rows can remain deliberately unowned.
    # Every application-created report supplies an authenticated owner.
    user_id: Mapped[UUID | None] = mapped_column(Uuid, nullable=True)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )
    page_count: Mapped[int] = mapped_column(Integer, nullable=False)
    character_count: Mapped[int] = mapped_column(Integer, nullable=False)
    requires_ocr: Mapped[bool] = mapped_column(Boolean, nullable=False)

    biomarkers: Mapped[list["BiomarkerResult"]] = relationship(
        back_populates="report",
        cascade="all, delete-orphan",
        order_by="BiomarkerResult.id",
        lazy="selectin",
    )


class BiomarkerResult(Base):
    __tablename__ = "biomarker_results"
    __table_args__ = (
        Index(
            "ix_biomarker_results_normalized_report",
            "normalized_name",
            "report_id",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    report_id: Mapped[int] = mapped_column(
        ForeignKey("reports.id", ondelete="CASCADE"), nullable=False, index=True
    )
    test_name: Mapped[str] = mapped_column(String(255), nullable=False)
    normalized_name: Mapped[str] = mapped_column(String(255), nullable=False)
    value: Mapped[float] = mapped_column(Float, nullable=False)
    unit: Mapped[str] = mapped_column(String(100), nullable=False)
    reference_low: Mapped[float | None] = mapped_column(Float, nullable=True)
    reference_high: Mapped[float | None] = mapped_column(Float, nullable=True)
    reference_operator: Mapped[str | None] = mapped_column(String(2), nullable=True)
    raw_reference: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    source_text: Mapped[str] = mapped_column(Text, nullable=False)

    report: Mapped[Report] = relationship(back_populates="biomarkers")
