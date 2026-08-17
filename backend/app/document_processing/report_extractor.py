from dataclasses import dataclass

from .ocr import OCRExtractionError, extract_pdf_ocr
from .pdf_extractor import extract_pdf_text


@dataclass(frozen=True)
class ReportTextExtractionResult:
    page_texts: tuple[str, ...]
    page_count: int
    text: str
    character_count: int
    has_meaningful_text: bool
    requires_ocr: bool
    ocr_used: bool


def extract_report_text(pdf_bytes: bytes) -> ReportTextExtractionResult:
    """Extract text directly first, falling back to OCR only when necessary."""
    direct = extract_pdf_text(pdf_bytes)
    if direct.has_meaningful_text:
        return ReportTextExtractionResult(
            page_texts=direct.page_texts,
            page_count=direct.page_count,
            text=direct.text,
            character_count=direct.character_count,
            has_meaningful_text=True,
            requires_ocr=False,
            ocr_used=False,
        )

    ocr = extract_pdf_ocr(pdf_bytes)
    if ocr.page_count != direct.page_count:
        raise OCRExtractionError(
            "OCR page rendering did not match the PDF page count."
        )

    return ReportTextExtractionResult(
        page_texts=ocr.page_texts,
        page_count=ocr.page_count,
        text=ocr.text,
        character_count=ocr.character_count,
        has_meaningful_text=ocr.has_meaningful_text,
        requires_ocr=True,
        ocr_used=True,
    )
