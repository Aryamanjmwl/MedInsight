from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ...auth import AuthenticatedUser, get_current_user
from ...biomarkers import (
    Biomarker,
    BiomarkerParseResult,
    BiomarkerTextRequest,
    parse_biomarkers,
)
from ...document_processing import (
    OCRExtractionError,
    OCRUnavailableError,
    PDFExtractionError,
    ReportTextExtractionResult,
    extract_report_text,
)
from ...db import (
    BiomarkerResult,
    Report,
    get_db_session,
    get_saved_report,
    list_saved_reports,
    save_processed_report,
)
from ...security import (
    REPORT_PROCESS_RULE,
    REPORT_UPLOAD_RULE,
    enforce_user_rate_limit,
)

router = APIRouter(prefix="/reports", tags=["reports"])

ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/png",
}
MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024
READ_CHUNK_SIZE_BYTES = 1024 * 1024


class ReportUploadResponse(BaseModel):
    filename: str
    content_type: str
    size_bytes: int
    status: Literal["accepted"]


class ReportExtractionResponse(BaseModel):
    filename: str
    page_count: int
    character_count: int
    text_extracted: bool
    requires_ocr: bool
    ocr_used: bool
    text: str


class ReportProcessingResponse(BaseModel):
    filename: str
    page_count: int
    character_count: int
    requires_ocr: bool
    ocr_used: bool
    biomarker_count: int
    unparsed_line_count: int
    biomarkers: list[Biomarker]


class ProcessAndSaveResponse(BaseModel):
    report_id: int
    result: ReportProcessingResponse


class SavedReportSummary(BaseModel):
    id: int
    filename: str
    uploaded_at: datetime
    page_count: int
    character_count: int
    requires_ocr: bool
    biomarker_count: int


class SavedReportDetail(SavedReportSummary):
    biomarkers: list[Biomarker]


async def _read_pdf_upload(file: UploadFile) -> tuple[str, bytes]:
    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Unsupported file type. PDF files are required for extraction.",
        )

    filename = file.filename or ""
    pdf_bytes = bytearray()

    try:
        while chunk := await file.read(READ_CHUNK_SIZE_BYTES):
            pdf_bytes.extend(chunk)
            if len(pdf_bytes) > MAX_UPLOAD_SIZE_BYTES:
                raise HTTPException(
                    status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                    detail="File exceeds the maximum upload size of 10 MB.",
                )
    finally:
        await file.close()

    return filename, bytes(pdf_bytes)


def _extract_pdf_or_http_error(pdf_bytes: bytes) -> ReportTextExtractionResult:
    try:
        return extract_report_text(pdf_bytes)
    except OCRUnavailableError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except OCRExtractionError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=str(exc),
        ) from exc
    except PDFExtractionError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=str(exc),
        ) from exc


@router.post(
    "/upload",
    response_model=ReportUploadResponse,
    status_code=status.HTTP_200_OK,
)
async def upload_report(
    file: UploadFile,
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> ReportUploadResponse:
    enforce_user_rate_limit(
        user_id=current_user.id,
        scope="report_upload",
        rule=REPORT_UPLOAD_RULE,
    )
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=(
                "Unsupported file type. Allowed types: application/pdf, "
                "image/png, image/jpeg."
            ),
        )

    size_bytes = 0

    try:
        while chunk := await file.read(READ_CHUNK_SIZE_BYTES):
            size_bytes += len(chunk)
            if size_bytes > MAX_UPLOAD_SIZE_BYTES:
                raise HTTPException(
                    status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                    detail="File exceeds the maximum upload size of 10 MB.",
                )
    finally:
        await file.close()

    return ReportUploadResponse(
        filename=file.filename or "",
        content_type=file.content_type,
        size_bytes=size_bytes,
        status="accepted",
    )


@router.post("/extract", response_model=ReportExtractionResponse)
async def extract_report(
    file: UploadFile,
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> ReportExtractionResponse:
    enforce_user_rate_limit(
        user_id=current_user.id,
        scope="report_process",
        rule=REPORT_PROCESS_RULE,
    )
    filename, pdf_bytes = await _read_pdf_upload(file)
    extraction = _extract_pdf_or_http_error(pdf_bytes)

    return ReportExtractionResponse(
        filename=filename,
        page_count=extraction.page_count,
        character_count=extraction.character_count,
        text_extracted=extraction.has_meaningful_text,
        requires_ocr=extraction.requires_ocr,
        ocr_used=extraction.ocr_used,
        text=extraction.text,
    )


@router.post("/biomarkers", response_model=BiomarkerParseResult)
def extract_biomarkers(
    payload: BiomarkerTextRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> BiomarkerParseResult:
    return parse_biomarkers(payload.text)


@router.post("/process", response_model=ReportProcessingResponse)
async def process_report(
    file: UploadFile,
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> ReportProcessingResponse:
    enforce_user_rate_limit(
        user_id=current_user.id,
        scope="report_process",
        rule=REPORT_PROCESS_RULE,
    )
    filename, pdf_bytes = await _read_pdf_upload(file)
    extraction = _extract_pdf_or_http_error(pdf_bytes)

    if not extraction.has_meaningful_text:
        return ReportProcessingResponse(
            filename=filename,
            page_count=extraction.page_count,
            character_count=extraction.character_count,
            requires_ocr=extraction.requires_ocr,
            ocr_used=extraction.ocr_used,
            biomarker_count=0,
            unparsed_line_count=0,
            biomarkers=[],
        )

    parsed = parse_biomarkers(extraction.text)
    return ReportProcessingResponse(
        filename=filename,
        page_count=extraction.page_count,
        character_count=extraction.character_count,
        requires_ocr=extraction.requires_ocr,
        ocr_used=extraction.ocr_used,
        biomarker_count=parsed.count,
        unparsed_line_count=parsed.unparsed_line_count,
        biomarkers=parsed.biomarkers,
    )


def _stored_biomarker(record: BiomarkerResult) -> Biomarker:
    return Biomarker.model_validate(record)


def _report_summary(report: Report) -> SavedReportSummary:
    return SavedReportSummary(
        id=report.id,
        filename=report.filename,
        uploaded_at=report.uploaded_at,
        page_count=report.page_count,
        character_count=report.character_count,
        requires_ocr=report.requires_ocr,
        biomarker_count=len(report.biomarkers),
    )


@router.post("/process-and-save", response_model=ProcessAndSaveResponse)
async def process_and_save_report(
    file: UploadFile,
    session: Session = Depends(get_db_session),
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> ProcessAndSaveResponse:
    result = await process_report(file, current_user)
    report = save_processed_report(
        session,
        user_id=current_user.id,
        filename=result.filename,
        page_count=result.page_count,
        character_count=result.character_count,
        requires_ocr=result.requires_ocr,
        biomarkers=result.biomarkers,
    )
    return ProcessAndSaveResponse(report_id=report.id, result=result)


@router.get("", response_model=list[SavedReportSummary])
def get_reports(
    session: Session = Depends(get_db_session),
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> list[SavedReportSummary]:
    return [
        _report_summary(report)
        for report in list_saved_reports(session, current_user.id)
    ]


@router.get("/{report_id}", response_model=SavedReportDetail)
def get_report(
    report_id: int,
    session: Session = Depends(get_db_session),
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> SavedReportDetail:
    report = get_saved_report(session, current_user.id, report_id)
    if report is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report not found.",
        )

    return SavedReportDetail(
        **_report_summary(report).model_dump(),
        biomarkers=[_stored_biomarker(item) for item in report.biomarkers],
    )
