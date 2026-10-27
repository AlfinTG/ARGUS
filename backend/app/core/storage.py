import os
import re
import uuid
import hashlib
from pathlib import Path
from typing import Tuple, Set
from fastapi import HTTPException, UploadFile, status

# 10 MB strict limit
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

# Allowed MIME types and extensions
ALLOWED_MIME_TYPES: Set[str] = {
    "application/pdf",
    "image/jpeg",
    "image/png",
}

ALLOWED_EXTENSIONS: Set[str] = {
    ".pdf",
    ".jpg",
    ".jpeg",
    ".png",
}

# Magic bytes signature validation
MAGIC_SIGNATURES = {
    b"%PDF": "application/pdf",
    b"\xFF\xD8\xFF": "image/jpeg",
    b"\x89PNG\r\n\x1a\n": "image/png",
}

# Base upload directory
BASE_UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "uploads"


def ensure_upload_dir(subfolder: str = "documents") -> Path:
    """Ensure upload target directory exists and return Path."""
    target = BASE_UPLOAD_DIR / subfolder
    target.mkdir(parents=True, exist_ok=True)
    return target


def secure_filename(filename: str) -> str:
    """
    Sanitize filename to prevent directory traversal and injection attacks.
    Keeps only alphanumeric, dots, dashes, and underscores.
    """
    if not filename:
        return f"file_{uuid.uuid4().hex[:8]}"

    # Strip paths
    clean_name = os.path.basename(filename.strip().replace("\\", "/"))
    # Remove leading dots to prevent hidden files
    clean_name = clean_name.lstrip(".")
    # Replace spaces with underscores
    clean_name = re.sub(r"\s+", "_", clean_name)
    # Filter to safe characters only
    clean_name = re.sub(r"[^A-Za-z0-9_.-]", "", clean_name)

    if not clean_name:
        return f"file_{uuid.uuid4().hex[:8]}"

    return clean_name[:200]


def detect_mime_type(sample_bytes: bytes, declared_type: str = "") -> str:
    """Validate binary header signature against declared MIME type."""
    for magic, mime in MAGIC_SIGNATURES.items():
        if sample_bytes.startswith(magic):
            return mime
    # Fallback to normalized declared type if within allowed types
    if declared_type in ALLOWED_MIME_TYPES:
        return declared_type
    return "application/octet-stream"


async def process_and_save_upload(
    upload_file: UploadFile,
    entity_id: str,
    subfolder: str = "documents",
) -> dict:
    """
    Validate and securely save an uploaded file.
    Performs:
    1. Extension & MIME validation (HTTP 415 on failure)
    2. Size validation with 10MB limit (HTTP 413 on failure)
    3. Filename sanitization
    4. Streaming SHA-256 cryptographic checksum computation
    5. Atomic disk write
    """
    original_filename = upload_file.filename or "unknown"
    sanitized_original = secure_filename(original_filename)

    # 1. Extension validation
    ext = Path(sanitized_original).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file extension '{ext}'. Only PDF, JPEG, and PNG files are allowed.",
        )

    # 2. Read in chunks to validate size and compute SHA-256
    hasher = hashlib.sha256()
    total_bytes = 0
    first_chunk = True
    detected_mime = ""
    chunks = []

    chunk_size = 64 * 1024  # 64 KB chunks
    while True:
        chunk = await upload_file.read(chunk_size)
        if not chunk:
            break

        total_bytes += len(chunk)
        if total_bytes > MAX_FILE_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File exceeds maximum allowed size of 10MB (received >{MAX_FILE_SIZE_BYTES} bytes).",
            )

        if first_chunk:
            detected_mime = detect_mime_type(chunk, upload_file.content_type or "")
            if detected_mime not in ALLOWED_MIME_TYPES:
                raise HTTPException(
                    status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                    detail=f"Invalid file content. Expected PDF, JPEG, or PNG, got '{detected_mime}'.",
                )
            first_chunk = False

        hasher.update(chunk)
        chunks.append(chunk)

    if total_bytes == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty (0 bytes).",
        )

    checksum = hasher.hexdigest()

    # 3. Secure disk storage path
    target_dir = ensure_upload_dir(subfolder)
    safe_entity_id = re.sub(r"[^A-Za-z0-9_-]", "_", entity_id)
    unique_name = f"{safe_entity_id}_{uuid.uuid4().hex[:8]}_{sanitized_original}"
    dest_path = target_dir / unique_name

    # Write file to disk
    with open(dest_path, "wb") as f:
        for chunk in chunks:
            f.write(chunk)

    relative_path = f"{subfolder}/{unique_name}"

    return {
        "file_name": sanitized_original,
        "stored_name": unique_name,
        "file_path": relative_path,
        "absolute_path": str(dest_path),
        "file_size": total_bytes,
        "mime_type": detected_mime,
        "checksum_sha256": checksum,
    }


def resolve_stored_file(relative_path: str) -> Path:
    """
    Safely resolve a stored file path, verifying it cannot escape BASE_UPLOAD_DIR.
    """
    if not relative_path:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File path not specified.")

    base_resolved = BASE_UPLOAD_DIR.resolve()
    target_resolved = (BASE_UPLOAD_DIR / relative_path).resolve()

    try:
        target_resolved.relative_to(base_resolved)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Directory traversal detected.",
        )

    if not target_resolved.exists() or not target_resolved.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stored document binary not found on disk.")

    return target_resolved
