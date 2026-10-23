import os
import uuid
import logging
from typing import Tuple, Optional
import aiofiles
from app.core.config import settings

logger = logging.getLogger("quizmaster.storage")

# Magic byte signatures for secure MIME validation
MAGIC_BYTES = {
    b"%PDF-": "application/pdf",
    b"PK\x03\x04": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}

class StorageService:
    def __init__(self):
        self.local_dir = os.path.abspath(settings.LOCAL_STORAGE_PATH)
        os.makedirs(self.local_dir, exist_ok=True)
        self.s3_client = None

        backend = getattr(settings, "STORAGE_BACKEND", "local").lower()
        is_test = os.environ.get("ENVIRONMENT") == "test" or settings.ENVIRONMENT == "test"

        if backend == "s3" and not is_test and settings.S3_ACCESS_KEY and settings.S3_SECRET_KEY and settings.S3_ENDPOINT:
            try:
                import boto3
                from botocore.client import Config
                self.s3_client = boto3.client(
                    "s3",
                    endpoint_url=settings.S3_ENDPOINT,
                    aws_access_key_id=settings.S3_ACCESS_KEY,
                    aws_secret_access_key=settings.S3_SECRET_KEY,
                    region_name=settings.S3_REGION,
                    config=Config(
                        signature_version="s3v4",
                        connect_timeout=1,
                        read_timeout=1,
                        retries={"max_attempts": 1}
                    ),
                )
                # Ensure bucket exists
                try:
                    self.s3_client.head_bucket(Bucket=settings.S3_BUCKET_NAME)
                except Exception:
                    try:
                        self.s3_client.create_bucket(Bucket=settings.S3_BUCKET_NAME)
                    except Exception as e:
                        logger.warning(f"Could not auto-create S3 bucket: {e}")
                logger.info(f"Storage backend initialized: S3/MinIO ({settings.S3_ENDPOINT})")
            except Exception as e:
                logger.warning(f"S3 client init failed, falling back to local filesystem storage: {e}")
                self.s3_client = None
        else:
            logger.info(f"Storage backend initialized: Local filesystem storage ({self.local_dir})")

    def _resolve_safe_local_path(self, file_key: str) -> str:
        """
        Resolves file_key inside self.local_dir and strictly verifies that the resulting
        path cannot escape the storage root (path traversal defense).
        """
        clean_key = os.path.normpath(file_key).lstrip("/\\")
        full_path = os.path.abspath(os.path.join(self.local_dir, clean_key))
        if not full_path.startswith(self.local_dir + os.sep) and full_path != self.local_dir:
            raise ValueError(f"Security: Path traversal attempt detected: {file_key}")
        return full_path

    def validate_file_content(self, header_bytes: bytes, filename: str) -> str:
        """Validate file header bytes to prevent malicious file uploads."""
        for magic, mime in MAGIC_BYTES.items():
            if header_bytes.startswith(magic):
                return mime
        
        # Check text file
        if filename.lower().endswith(".txt"):
            try:
                header_bytes.decode("utf-8")
                return "text/plain"
            except UnicodeDecodeError:
                pass
        
        # If filename ends with docx but magic matches PK
        if filename.lower().endswith(".docx") and header_bytes.startswith(b"PK"):
            return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

        if filename.lower().endswith(".pdf") and b"%PDF" in header_bytes[:1024]:
            return "application/pdf"

        raise ValueError("Unsupported or invalid file format. Only PDF, DOCX, and TXT are supported.")

    async def save_file(self, file_content: bytes, filename: str, user_id: str) -> Tuple[str, str, int]:
        """
        Saves file to S3 or local directory.
        Returns: (file_key, detected_mime_type, file_size_bytes)
        """
        file_size = len(file_content)
        if file_size > 25 * 1024 * 1024:
            raise ValueError("File exceeds maximum allowed size of 25MB.")

        header = file_content[:2048]
        mime_type = self.validate_file_content(header, filename)

        ext = os.path.splitext(filename)[1].lower()
        unique_id = str(uuid.uuid4())
        file_key = f"{user_id}/{unique_id}{ext}"

        # Try saving to S3 if configured
        if self.s3_client:
            try:
                self.s3_client.put_object(
                    Bucket=settings.S3_BUCKET_NAME,
                    Key=file_key,
                    Body=file_content,
                    ContentType=mime_type,
                )
                logger.info(f"File uploaded to S3: {file_key}")
                return file_key, mime_type, file_size
            except Exception as e:
                logger.warning(f"S3 upload failed, falling back to local filesystem: {e}")

        await self._save_local(file_content, file_key)
        return file_key, mime_type, file_size

    async def _save_local(self, file_content: bytes, file_key: str):
        full_path = self._resolve_safe_local_path(file_key)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        async with aiofiles.open(full_path, "wb") as f:
            await f.write(file_content)
        logger.info(f"File saved locally: {full_path}")

    async def read_file(self, file_key: str) -> bytes:
        """Reads file bytes from S3 or local storage."""
        if self.s3_client:
            try:
                resp = self.s3_client.get_object(Bucket=settings.S3_BUCKET_NAME, Key=file_key)
                return resp["Body"].read()
            except Exception as e:
                logger.warning(f"S3 read failed for {file_key}, checking local fallback: {e}")

        full_path = self._resolve_safe_local_path(file_key)
        if os.path.exists(full_path):
            async with aiofiles.open(full_path, "rb") as f:
                return await f.read()

        raise FileNotFoundError(f"File {file_key} not found in storage.")

    def file_exists(self, file_key: str) -> bool:
        """Checks if file exists in storage."""
        if self.s3_client:
            try:
                self.s3_client.head_object(Bucket=settings.S3_BUCKET_NAME, Key=file_key)
                return True
            except Exception:
                pass

        try:
            full_path = self._resolve_safe_local_path(file_key)
            return os.path.exists(full_path)
        except Exception:
            return False

    def delete_file(self, file_key: str) -> bool:
        """Deletes file from storage."""
        deleted = False
        if self.s3_client:
            try:
                self.s3_client.delete_object(Bucket=settings.S3_BUCKET_NAME, Key=file_key)
                deleted = True
            except Exception as e:
                logger.warning(f"S3 delete failed for {file_key}: {e}")

        try:
            full_path = self._resolve_safe_local_path(file_key)
            if os.path.exists(full_path):
                os.remove(full_path)
                deleted = True
        except Exception as e:
            logger.warning(f"Local file delete failed for {file_key}: {e}")

        return deleted

storage_service = StorageService()
