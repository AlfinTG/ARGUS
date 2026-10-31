import React, { useState, useRef } from 'react';
import { Upload, FileText, AlertTriangle, X, ShieldCheck } from 'lucide-react';

interface FileUploadDropzoneProps {
  onFileSelected: (file: File | null, sha256Hex?: string) => void;
  selectedFile: File | null;
  maxSizeBytes?: number;
  allowedExtensions?: string[];
}

export const FileUploadDropzone: React.FC<FileUploadDropzoneProps> = ({
  onFileSelected,
  selectedFile,
  maxSizeBytes = 10 * 1024 * 1024, // 10 MB
  allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png'],
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [computingHash, setComputingHash] = useState(false);
  const [localHash, setLocalHash] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const calculateClientSha256 = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  };

  const validateAndProcessFile = async (file: File) => {
    setErrorMessage(null);

    // 1. Extension check
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      setErrorMessage(`Invalid file format '${ext}'. Only PDF, JPEG, and PNG files are accepted.`);
      onFileSelected(null);
      return;
    }

    // 2. Size check (10MB limit)
    if (file.size > maxSizeBytes) {
      setErrorMessage(`File size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds strict 10MB limit.`);
      onFileSelected(null);
      return;
    }

    // 3. Compute client-side SHA-256 hash for immediate feedback
    setComputingHash(true);
    try {
      const hash = await calculateClientSha256(file);
      setLocalHash(hash);
      onFileSelected(file, hash);
    } catch {
      onFileSelected(file);
    } finally {
      setComputingHash(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndProcessFile(e.target.files[0]);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLocalHash(null);
    setErrorMessage(null);
    onFileSelected(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <input
        ref={fileInputRef}
        type="file"
        accept={allowedExtensions.join(',')}
        onChange={handleInputChange}
        style={{ display: 'none' }}
      />

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${
            isDragging
              ? 'var(--accent-lime)'
              : errorMessage
              ? '#ef4444'
              : selectedFile
              ? 'rgba(212, 244, 88, 0.4)'
              : 'rgba(255, 255, 255, 0.15)'
          }`,
          borderRadius: 'var(--radius-md)',
          padding: '20px 16px',
          background: isDragging
            ? 'rgba(212, 244, 88, 0.08)'
            : selectedFile
            ? 'rgba(212, 244, 88, 0.03)'
            : 'rgba(0, 0, 0, 0.25)',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          textAlign: 'center',
        }}
      >
        {selectedFile ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, width: '100%' }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: 'rgba(212, 244, 88, 0.15)',
                display: 'grid',
                placeItems: 'center',
                color: 'var(--accent-lime)',
              }}
            >
              <FileText size={22} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-white)' }}>
                {selectedFile.name}
              </span>
              <button
                type="button"
                onClick={handleRemove}
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: 'none',
                  color: '#ef4444',
                  borderRadius: '50%',
                  width: 20,
                  height: 20,
                  display: 'grid',
                  placeItems: 'center',
                  cursor: 'pointer',
                }}
                title="Remove file"
              >
                <X size={12} />
              </button>
            </div>

            <div style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>
              {formatSize(selectedFile.size)} • {selectedFile.type || 'Document binary'}
            </div>

            {computingHash && (
              <div style={{ fontSize: 11, color: 'var(--accent-lime)' }}>
                Computing cryptographic checksum…
              </div>
            )}

            {localHash && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '3px 8px',
                  borderRadius: 4,
                  background: 'rgba(212, 244, 88, 0.08)',
                  border: '1px solid rgba(212, 244, 88, 0.2)',
                  fontSize: 10.5,
                  color: 'var(--accent-lime)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                <ShieldCheck size={12} />
                <span>SHA-256: {localHash.slice(0, 12)}…{localHash.slice(-8)}</span>
              </div>
            )}
          </div>
        ) : (
          <>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.06)',
                display: 'grid',
                placeItems: 'center',
                color: 'var(--accent-lime)',
              }}
            >
              <Upload size={20} />
            </div>

            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-white)' }}>
                Drag &amp; drop document binary, or <span style={{ color: 'var(--accent-lime)', textDecoration: 'underline' }}>browse</span>
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text-faint)', marginTop: 4 }}>
                Supports PDF, JPEG, PNG (max 10MB). SHA-256 cryptographic integrity checked on upload.
              </div>
            </div>
          </>
        )}
      </div>

      {errorMessage && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            color: '#ef4444',
            fontSize: 12,
            background: 'rgba(239, 68, 68, 0.1)',
            padding: '6px 10px',
            borderRadius: 6,
          }}
        >
          <AlertTriangle size={14} style={{ flexShrink: 0 }} />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
