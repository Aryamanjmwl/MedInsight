import os
import re
from dataclasses import dataclass

import pypdfium2 as pdfium
import pytesseract

from .pdf_extractor import has_meaningful_text

TESSERACT_COMMAND_ENV_VAR = "MEDINSIGHT_TESSERACT_CMD"
OCR_DPI = 250
MAX_OCR_PAGE_COUNT = 25
OCR_TIMEOUT_SECONDS_PER_PAGE = 30
OCR_LANGUAGE = "eng"


class OCRExtractionError(RuntimeError):
    """Raised when OCR cannot process a valid PDF safely."""


class OCRUnavailableError(OCRExtractionError):
    """Raised when OCR is required but Tesseract is unavailable."""


class OCRPageLimitError(OCRExtractionError):
    """Raised when a scan exceeds the synchronous OCR page limit."""


@dataclass(frozen=True)
class OCRExtractionResult:
    page_texts: tuple[str, ...]
    page_count: int
    text: str
    character_count: int
    has_meaningful_text: bool


def normalize_ocr_text(text: str) -> str:
    """Conservatively normalize OCR spacing while preserving line boundaries."""
    normalized = text.replace("\r\n", "\n").replace("\r", "\n")
    normalized = normalized.translate(
        str.maketrans(
            {
                "\u00a0": " ",
                "\u2007": " ",
                "\u202f": " ",
                "\u2013": "-",
                "\u2014": "-",
                "\u2212": "-",
            }
        )
    )
    lines = [
        re.sub(r"[^\S\n]+", " ", line).strip()
        for line in normalized.split("\n")
    ]
    return "\n".join(lines).strip()


def _configure_and_check_tesseract() -> None:
    configured_command = os.getenv(TESSERACT_COMMAND_ENV_VAR, "tesseract").strip()
    if not configured_command:
        configured_command = "tesseract"
    pytesseract.pytesseract.tesseract_cmd = configured_command

    try:
        pytesseract.get_tesseract_version()
    except (
        pytesseract.TesseractNotFoundError,
        pytesseract.TesseractError,
        OSError,
        PermissionError,
    ) as exc:
        raise OCRUnavailableError(
            "OCR is required for this report but is not available on the server."
        ) from exc


def is_ocr_available() -> bool:
    """Return whether the configured Tesseract executable can be invoked."""
    try:
        _configure_and_check_tesseract()
    except OCRUnavailableError:
        return False
    return True


def extract_pdf_ocr(pdf_bytes: bytes) -> OCRExtractionResult:
    """Render and OCR an in-memory PDF one page at a time."""
    try:
        document = pdfium.PdfDocument(pdf_bytes)
    except (pdfium.PdfiumError, TypeError, ValueError) as exc:
        raise OCRExtractionError("The report could not be rendered for OCR.") from exc

    try:
        page_count = len(document)
        if page_count > MAX_OCR_PAGE_COUNT:
            raise OCRPageLimitError(
                f"OCR supports reports with at most {MAX_OCR_PAGE_COUNT} pages."
            )

        _configure_and_check_tesseract()
        page_texts: list[str] = []
        scale = OCR_DPI / 72

        for page_index in range(page_count):
            page = document[page_index]
            bitmap = None
            image = None
            try:
                bitmap = page.render(scale=scale, grayscale=True)
                image = bitmap.to_pil()
                extracted_text = pytesseract.image_to_string(
                    image,
                    lang=OCR_LANGUAGE,
                    config="--psm 6",
                    timeout=OCR_TIMEOUT_SECONDS_PER_PAGE,
                )
                page_texts.append(normalize_ocr_text(extracted_text))
            except pytesseract.TesseractNotFoundError as exc:
                raise OCRUnavailableError(
                    "OCR is required for this report but is not available on the server."
                ) from exc
            except Exception as exc:
                raise OCRExtractionError(
                    "The report could not be read clearly enough to extract text."
                ) from exc
            finally:
                if image is not None:
                    image.close()
                if bitmap is not None:
                    bitmap.close()
                page.close()

        combined_text = "\n\n".join(page_texts)
        return OCRExtractionResult(
            page_texts=tuple(page_texts),
            page_count=page_count,
            text=combined_text,
            character_count=len(combined_text),
            has_meaningful_text=has_meaningful_text(combined_text),
        )
    finally:
        document.close()
