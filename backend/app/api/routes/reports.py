from typing import Literal

from fastapi import APIRouter, HTTPException, UploadFile, status
from pydantic import BaseModel

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
