from typing import Literal

from fastapi import APIRouter, HTTPException, UploadFile, status
from pydantic import BaseModel

from ...biomarkers import (
    BiomarkerParseResult,
    BiomarkerTextRequest,
    parse_biomarkers,
)
from ...document_processing import PDFExtractionError, extract_pdf_text

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
    text: str


@router.post(
    "/upload",
    response_model=ReportUploadResponse,
    status_code=status.HTTP_200_OK,
)
async def upload_report(file: UploadFile) -> ReportUploadResponse:
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
async def extract_report(file: UploadFile) -> ReportExtractionResponse:
    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Unsupported file type. PDF files are required for extraction.",
        )

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

    try:
        extraction = extract_pdf_text(bytes(pdf_bytes))
    except PDFExtractionError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=str(exc),
        ) from exc

    return ReportExtractionResponse(
        filename=file.filename or "",
        page_count=extraction.page_count,
        character_count=extraction.character_count,
        text_extracted=extraction.has_meaningful_text,
        requires_ocr=not extraction.has_meaningful_text,
        text=extraction.text,
    )


@router.post("/biomarkers", response_model=BiomarkerParseResult)
def extract_biomarkers(payload: BiomarkerTextRequest) -> BiomarkerParseResult:
    return parse_biomarkers(payload.text)
