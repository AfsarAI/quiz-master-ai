import io
import re
import logging
from typing import List, Dict, Any, Tuple
from pypdf import PdfReader
import docx

logger = logging.getLogger(__name__)

class TextExtractor:
    @staticmethod
    def extract(file_bytes: bytes, file_type: str, filename: str) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """
        Extracts structured text page-by-page or section-by-section.
        Returns:
            pages: List of {"page_number": int, "text": str, "heading": Optional[str]}
            metadata: Dict of {"title": str, "author": str, "page_count": int, "extracted_topics": List[str]}
        """
        if "pdf" in file_type.lower() or filename.lower().endswith(".pdf"):
            return TextExtractor._extract_pdf(file_bytes, filename)
        elif "docx" in file_type.lower() or filename.lower().endswith(".docx"):
            return TextExtractor._extract_docx(file_bytes, filename)
        elif "text" in file_type.lower() or filename.lower().endswith(".txt"):
            return TextExtractor._extract_txt(file_bytes, filename)
        else:
            # Fallback text decoding
            try:
                text = file_bytes.decode("utf-8")
                return [{"page_number": 1, "text": text, "heading": None}], {
                    "title": filename,
                    "author": "Unknown",
                    "page_count": 1,
                    "extracted_topics": TextExtractor._extract_topics(text)
                }
            except Exception as e:
                raise ValueError(f"Could not extract text from file: {e}")

    @staticmethod
    def _extract_pdf(file_bytes: bytes, filename: str) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        stream = io.BytesIO(file_bytes)
        reader = PdfReader(stream)
        pages = []
        full_text = []

        for idx, page in enumerate(reader.pages):
            text = page.extract_text() or ""
            clean_text = TextExtractor._clean_text(text)
            if clean_text:
                # Attempt to extract top heading from first line
                lines = [l.strip() for l in clean_text.split("\n") if l.strip()]
                heading = lines[0] if lines and len(lines[0]) < 80 else None
                pages.append({
                    "page_number": idx + 1,
                    "text": clean_text,
                    "heading": heading
                })
                full_text.append(clean_text)

        pdf_meta = reader.metadata or {}
        title = pdf_meta.title or filename
        author = pdf_meta.author or "Unknown"

        combined = "\n".join(full_text)
        topics = TextExtractor._extract_topics(combined)

        return pages, {
            "title": str(title),
            "author": str(author),
            "page_count": len(reader.pages),
            "extracted_topics": topics
        }

    @staticmethod
    def _extract_docx(file_bytes: bytes, filename: str) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        stream = io.BytesIO(file_bytes)
        doc = docx.Document(stream)
        pages = []
        current_heading = None
        current_paras = []
        full_text = []
        page_num = 1

        for para in doc.paragraphs:
            text = para.text.strip()
            if not text:
                continue

            if para.style.name.startswith("Heading"):
                if current_paras:
                    section_text = "\n".join(current_paras)
                    pages.append({
                        "page_number": page_num,
                        "text": section_text,
                        "heading": current_heading
                    })
                    full_text.append(section_text)
                    page_num += 1
                    current_paras = []
                current_heading = text
            else:
                current_paras.append(text)

        if current_paras:
            section_text = "\n".join(current_paras)
            pages.append({
                "page_number": page_num,
                "text": section_text,
                "heading": current_heading
            })
            full_text.append(section_text)

        combined = "\n".join(full_text)
        topics = TextExtractor._extract_topics(combined)

        return pages, {
            "title": filename,
            "author": "Unknown",
            "page_count": len(pages) or 1,
            "extracted_topics": topics
        }

    @staticmethod
    def _extract_txt(file_bytes: bytes, filename: str) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        try:
            raw_text = file_bytes.decode("utf-8")
        except UnicodeDecodeError:
            raw_text = file_bytes.decode("latin-1", errors="replace")

        clean = TextExtractor._clean_text(raw_text)
        # Split text into ~2000-character pseudo pages for indexing
        chunk_size = 2000
        pages = []
        for i in range(0, len(clean), chunk_size):
            page_text = clean[i:i + chunk_size]
            lines = [l.strip() for l in page_text.split("\n") if l.strip()]
            heading = lines[0] if lines and len(lines[0]) < 80 else None
            pages.append({
                "page_number": (i // chunk_size) + 1,
                "text": page_text,
                "heading": heading
            })

        topics = TextExtractor._extract_topics(clean)

        return pages, {
            "title": filename,
            "author": "Unknown",
            "page_count": len(pages),
            "extracted_topics": topics
        }

    @staticmethod
    def _clean_text(text: str) -> str:
        # Normalize whitespace, remove form feeds and excessive newlines
        text = text.replace("\r\n", "\n").replace("\r", "\n")
        text = re.sub(r"\n{3,}", "\n\n", text)
        text = re.sub(r"[ \t]{2,}", " ", text)
        return text.strip()

    @staticmethod
    def _extract_topics(text: str) -> List[str]:
        """Heuristic topic and keyword extraction from document text."""
        candidates = set()
        # Look for Title Case multi-word phrases or Section names
        matches = re.findall(r"(?:Chapter|Section|Unit|\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}\b)", text)
        for m in matches:
            if len(m) > 4 and len(m) < 40 and not m.startswith("The ") and not m.startswith("This "):
                candidates.add(m.strip())
            if len(candidates) >= 8:
                break
        if not candidates:
            candidates = {"Core Concepts", "Foundational Principles", "Key Terminology"}
        return list(candidates)[:8]

text_extractor = TextExtractor()
