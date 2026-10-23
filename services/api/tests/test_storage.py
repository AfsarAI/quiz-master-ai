import pytest
import os
import tempfile
from app.services.storage_service import StorageService

@pytest.fixture
def storage():
    # Use temporary directory for isolated tests
    with tempfile.TemporaryDirectory() as temp_dir:
        svc = StorageService()
        svc.local_dir = temp_dir
        svc.s3_client = None  # Ensure pure local mode
        yield svc

@pytest.mark.asyncio
async def test_storage_save_and_read_local_file(storage):
    """Verify local saving, reading, and file existence checking."""
    content = b"%PDF-1.4\nSample test educational document content"
    file_key, mime, size = await storage.save_file(content, "test_doc.pdf", user_id="user123")

    assert "user123" in file_key
    assert file_key.endswith(".pdf")
    assert mime == "application/pdf"
    assert size == len(content)

    # Check existence
    assert storage.file_exists(file_key) is True

    # Read back and verify exact content
    read_bytes = await storage.read_file(file_key)
    assert read_bytes == content

    # Test deletion
    deleted = storage.delete_file(file_key)
    assert deleted is True
    assert storage.file_exists(file_key) is False

@pytest.mark.asyncio
async def test_storage_path_traversal_defense(storage):
    """Verify that path traversal attempts are detected and strictly blocked."""
    # Attempting to read or save outside local_dir should raise ValueError
    with pytest.raises(ValueError, match="Path traversal"):
        storage._resolve_safe_local_path("../../etc/passwd")

    with pytest.raises(ValueError, match="Path traversal"):
        await storage.read_file("../../../secret_file.txt")

@pytest.mark.asyncio
async def test_storage_file_size_limit(storage):
    """Verify that files exceeding 25MB are rejected."""
    oversized = b"A" * (26 * 1024 * 1024)
    with pytest.raises(ValueError, match="File exceeds maximum allowed size"):
        await storage.save_file(oversized, "huge.txt", user_id="user123")

@pytest.mark.asyncio
async def test_storage_invalid_file_format_rejected(storage):
    """Verify that unsupported file extensions or corrupted magic bytes are rejected."""
    bad_bytes = b"\x7fELF\x02\x01\x01\x00"  # ELF binary
    with pytest.raises(ValueError, match="Unsupported or invalid file format"):
        await storage.save_file(bad_bytes, "malicious.exe", user_id="user123")

@pytest.mark.asyncio
async def test_storage_missing_file_raises_not_found(storage):
    """Verify FileNotFoundError is raised when accessing non-existent file."""
    with pytest.raises(FileNotFoundError):
        await storage.read_file("user123/non_existent.pdf")
