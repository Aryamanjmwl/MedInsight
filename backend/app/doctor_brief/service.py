from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.orm import Session

from ..biomarkers import BiomarkerStatus
from ..biomarkers.vocabulary import BIOMARKERS_BY_NORMALIZED_NAME
from ..db import (
    get_biomarker_history,
    get_report_statistics,
    list_biomarker_overviews,
    list_saved_reports,
)
from ..trends import TrendDirection, calculate_trend
from .models import (
    BriefMeasurement,
    BriefRecentReport,
    BriefTrend,
    BriefUnclassifiedMeasurement,
    DoctorVisitBriefResponse,
)

RECENT_REPORT_LIMIT = 5
NEEDS_ATTENTION_LIMIT = 10
TREND_LIMIT = 10
UNCLASSIFIED_LIMIT = 10
QUESTION_LIMIT = 5
UNCLASSIFIED_REASON = (
    "A usable report-provided reference range was not available for classification."
)
BRIEF_LIMITATIONS = [
    "This brief contains only structured results from saved laboratory reports.",
    "Outside-range labels use the reference information printed in each report.",
    "Trend direction is mathematical and does not indicate whether a change is medically good or bad.",
    "This brief does not provide diagnosis, severity scoring, or treatment recommendations.",
]


def _format_number(value: float) -> str:
    return f"{value:g}"


def _format_reference(measurement: BriefMeasurement) -> str | None:
    if measurement.raw_reference.strip():
        return measurement.raw_reference.strip()
    if measurement.reference_low is not None and measurement.reference_high is not None:
        return (
            f"{_format_number(measurement.reference_low)}–"
            f"{_format_number(measurement.reference_high)}"
        )
    if measurement.reference_operator:
        threshold = (
            measurement.reference_high
            if measurement.reference_operator.startswith("<")
            else measurement.reference_low
        )
        if threshold is not None:
            return f"{measurement.reference_operator}{_format_number(threshold)}"
    return None


def _measurement_sort_key(measurement: BriefMeasurement) -> tuple[object, ...]:
    return (
        -measurement.measurement_date.timestamp(),
        measurement.display_name.casefold(),
        measurement.normalized_name,
    )


def _trend_sort_key(trend: BriefTrend) -> tuple[object, ...]:
    return (
        -trend.latest_date.timestamp(),
        trend.display_name.casefold(),
        trend.normalized_name,
    )


def _build_questions(
    needs_attention: list[BriefMeasurement],
    trends: list[BriefTrend],
    unclassified: list[BriefUnclassifiedMeasurement],
) -> list[str]:
    candidates: list[str] = []
    for item in needs_attention:
        reference = _format_reference(item)
        range_context = (
            f" of {reference}" if reference else " supplied by this report"
        )
        candidates.append(
            f"My {item.display_name} was {_format_number(item.value)} {item.unit}, "
            f"outside this report's reference range{range_context}. Could you help "
            "me understand what might be relevant in my case?"
        )
    for item in trends:
        candidates.append(
            f"My {item.display_name} changed from {_format_number(item.first_value)} "
            f"{item.unit} to {_format_number(item.latest_value)} {item.unit} between "
            f"{item.first_date.date().isoformat()} and {item.latest_date.date().isoformat()}. "
            "Is this change meaningful in the context of my health history?"
        )
    for item in unclassified:
        candidates.append(
            "This report did not provide a usable reference range for "
            f"{item.display_name}. How should this result be interpreted?"
        )

    questions: list[str] = []
    seen: set[str] = set()
    for question in candidates:
        if question in seen:
            continue
        seen.add(question)
        questions.append(question)
        if len(questions) == QUESTION_LIMIT:
            break
    return questions


def build_doctor_visit_brief(
    session: Session, user_id: UUID
) -> DoctorVisitBriefResponse:
    statistics = get_report_statistics(session, user_id)
    saved_reports = list_saved_reports(session, user_id)
    recent_reports = [
        BriefRecentReport(
            report_id=report.id,
            uploaded_at=report.uploaded_at,
            page_count=report.page_count,
            biomarker_count=len(report.biomarkers),
            requires_ocr=report.requires_ocr,
        )
        for report in saved_reports[:RECENT_REPORT_LIMIT]
    ]

    latest_measurements: list[BriefMeasurement] = []
    trends: list[BriefTrend] = []
    for overview in list_biomarker_overviews(session, user_id):
        definition = BIOMARKERS_BY_NORMALIZED_NAME.get(overview.normalized_name)
        if definition is None:
            continue
        history = get_biomarker_history(session, user_id, overview.normalized_name)
        if not history:
            continue
        latest = history[-1]
        latest_measurements.append(
            BriefMeasurement(
                report_id=latest.report_id,
                normalized_name=overview.normalized_name,
                display_name=definition.display_name,
                value=latest.value,
                unit=latest.unit,
                status=latest.status,
                reference_low=latest.reference_low,
                reference_high=latest.reference_high,
                reference_operator=latest.reference_operator,
                raw_reference=latest.raw_reference,
                measurement_date=latest.uploaded_at,
            )
        )

        trend = calculate_trend(overview.normalized_name, history)
        if (
            trend.comparable_units
            and trend.direction in (TrendDirection.INCREASING, TrendDirection.DECREASING)
            and trend.unit is not None
            and trend.first_value is not None
            and trend.latest_value is not None
            and trend.absolute_change is not None
            and trend.first_date is not None
            and trend.latest_date is not None
        ):
            trends.append(
                BriefTrend(
                    normalized_name=overview.normalized_name,
                    display_name=definition.display_name,
                    unit=trend.unit,
                    first_value=trend.first_value,
                    latest_value=trend.latest_value,
                    absolute_change=trend.absolute_change,
                    percent_change=trend.percent_change,
                    direction=trend.direction,
                    first_date=trend.first_date,
                    latest_date=trend.latest_date,
                )
            )

    latest_measurements.sort(key=_measurement_sort_key)
    needs_attention = sorted(
        (
            item
            for item in latest_measurements
            if item.status in (BiomarkerStatus.HIGH, BiomarkerStatus.LOW)
        ),
        key=_measurement_sort_key,
    )[:NEEDS_ATTENTION_LIMIT]
    unclassified = [
        BriefUnclassifiedMeasurement(**item.model_dump(), reason=UNCLASSIFIED_REASON)
        for item in sorted(
            (item for item in latest_measurements if item.status == BiomarkerStatus.UNKNOWN),
            key=_measurement_sort_key,
        )[:UNCLASSIFIED_LIMIT]
    ]
    trend_summary = sorted(trends, key=_trend_sort_key)[:TREND_LIMIT]

    return DoctorVisitBriefResponse(
        generated_at=datetime.now(timezone.utc),
        report_count=statistics.total_reports,
        latest_report_date=statistics.latest_report_date,
        recent_reports=recent_reports,
        latest_measurements=latest_measurements,
        needs_attention=needs_attention,
        trend_summary=trend_summary,
        unclassified_measurements=unclassified,
        questions_to_discuss=_build_questions(
            needs_attention, trend_summary, unclassified
        ),
        limitations=BRIEF_LIMITATIONS,
    )
