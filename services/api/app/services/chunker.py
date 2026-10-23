import re
from typing import List, Dict, Any, Optional

class RecursiveCharacterChunker:
    def __init__(
        self,
        chunk_size_tokens: int = 500,
        chunk_overlap_tokens: int = 100,
        characters_per_token: float = 4.0,
    ):
        self.chunk_size_chars = int(chunk_size_tokens * characters_per_token)
        self.overlap_chars = int(chunk_overlap_tokens * characters_per_token)
        self.separators = ["\n\n", "\n", ". ", "; ", ", ", " ", ""]

    def chunk_pages(
        self,
        pages: List[Dict[str, Any]],
        document_id: str,
        source_title: str
    ) -> List[Dict[str, Any]]:
        """
        Splits pages into overlapping semantic chunks with preserved metadata.
        Returns:
            List of {
                "document_id": str,
                "chunk_index": int,
                "content": str,
                "page_number": int,
                "section_heading": Optional[str],
                "token_count": int,
                "source_title": str
            }
        """
        chunks = []
        global_index = 0

        for page in pages:
            page_text = page["text"]
            page_num = page.get("page_number")
            heading = page.get("heading")

            if not page_text.strip():
                continue

            page_chunks = self._split_text(page_text, self.chunk_size_chars, self.overlap_chars)
            for chunk_text in page_chunks:
                clean_chunk = chunk_text.strip()
                if len(clean_chunk) < 25:
                    continue

                est_tokens = max(1, int(len(clean_chunk) / 4))
                chunks.append({
                    "document_id": document_id,
                    "chunk_index": global_index,
                    "content": clean_chunk,
                    "page_number": page_num,
                    "section_heading": heading,
                    "token_count": est_tokens,
                    "source_title": source_title,
                })
                global_index += 1

        return chunks

    def _split_text(self, text: str, max_chars: int, overlap_chars: int) -> List[str]:
        if len(text) <= max_chars:
            return [text]

        splits = []
        start = 0

        while start < len(text):
            end = start + max_chars
            if end >= len(text):
                splits.append(text[start:].strip())
                break

            # Find best split point using separators
            best_split = -1
            sub = text[start:end]

            for sep in self.separators:
                if not sep:
                    best_split = end
                    break
                pos = sub.rfind(sep)
                if pos != -1 and pos > (max_chars // 2):
                    best_split = start + pos + len(sep)
                    break

            if best_split == -1 or best_split <= start:
                best_split = end

            chunk_slice = text[start:best_split].strip()
            if chunk_slice:
                splits.append(chunk_slice)

            start = max(start + 1, best_split - overlap_chars)

        return splits

chunker = RecursiveCharacterChunker()
