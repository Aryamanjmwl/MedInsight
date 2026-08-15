from dataclasses import dataclass
from io import BytesIO

from pypdf import PdfReader
from pypdf.errors import PdfReadError

MIN_MEANINGFUL_CHARACTER_COUNT = 20


class PDFExtractionError(ValueError):
    """Raised when PDF bytes cannot be opened or processed."""


@dataclass(frozen=True)
class PDFExtractionResult:
    page_texts: tuple[str, ...]
    page_count: int
    text: str
    character_count: int
    has_meaningful_text: bool


def extract_pdf_text(pdf_bytes: bytes) -> PDFExtractionResult:
    """Extract machine-readable text from an in-memory PDF, page by page."""
    if not pdf_bytes:
        raise PDFExtractionError("The uploaded PDF is empty or invalid.")

    try:
        reader = PdfReader(BytesIO(pdf_bytes), strict=True)
        if reader.is_encrypted and reader.decrypt("") == 0:
            raise PdfReadError("The PDF is encrypted and requires a password.")
        page_texts = tuple(page.extract_text() or "" for page in reader.pages)
    except (PdfReadError, EOFError, TypeError, ValueError) as exc:
        raise PDFExtractionError(
            "The uploaded file is not a valid or readable PDF."
        ) from exc

    combined_text = "\n\n".join(page_texts)
    meaningful_character_count = sum(
        not character.isspace() for character in combined_text
    )

    return PDFExtractionResult(
        page_texts=page_texts,
        page_count=len(page_texts),
        text=combined_text,
        character_count=len(combined_text),
        has_meaningful_text=(
            meaningful_character_count >= MIN_MEANINGFUL_CHARACTER_COUNT
        ),
    )
