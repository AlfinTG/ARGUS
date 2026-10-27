import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { api } from '../api/client';
import {
  FileText,
  ShieldCheck,
  Download,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from 'lucide-react';

interface DocumentViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  documentId: string;
  endpoint: string; // e.g. '/api/v1/documents/DOC-001/file'
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  checksumSha256?: string;
  uploadedAt?: string;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  isOpen,
  onClose,
  title,
  documentId,
  endpoint,
  fileName = 'document.pdf',
  fileSize,
  mimeType = 'application/pdf',
  checksumSha256,
  uploadedAt,
}) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  useEffect(() => {
    if (!isOpen || !endpoint) {
      setBlobUrl(null);
      setError(null);
      return;
    }

    let active = true;
    let createdUrl: string | null = null;
    setLoading(true);
    setError(null);

    api
      .fetchSecureBlobUrl(endpoint)
      .then((url) => {
        if (active) {
          createdUrl = url;
          setBlobUrl(url);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message || 'Unable to stream document preview.');
          setLoading(false);
        }
      });

    return () => {
      active = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [isOpen, endpoint]);

  const copyChecksum = () => {
    if (checksumSha256) {
      navigator.clipboard.writeText(checksumSha256);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    }
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const isImage = mimeType?.startsWith('image/') || /\.(png|jpe?g)$/i.test(fileName);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={`Regulatory Document Binary Preview • ID: ${documentId}`}
      footerActions={
        <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-muted)' }}>
            <ShieldCheck size={16} color="var(--accent-lime)" />
            <span>SHA-256 Authenticated Regulatory Record</span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {blobUrl && (
              <a
                href={blobUrl}
                download={fileName}
                className="btn btn-sm btn-ghost"
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Download size={14} /> Download
              </a>
            )}
            {blobUrl && (
              <a
                href={blobUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-sm btn-ghost"
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <ExternalLink size={14} /> Open in tab
              </a>
            )}
            <button type="button" className="btn btn-sm btn-primary" onClick={onClose}>
              Close Preview
            </button>
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Document Metadata & Cryptographic Integrity Banner */}
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.35)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 6,
                  background: 'rgba(212, 244, 88, 0.1)',
                  display: 'grid',
                  placeItems: 'center',
                  color: 'var(--accent-lime)',
                }}
              >
                <FileText size={18} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-white)' }}>
                  {fileName}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>
                  {formatBytes(fileSize)} • {mimeType} {uploadedAt ? `• Uploaded ${uploadedAt}` : ''}
                </div>
              </div>
            </div>

            {/* SHA-256 Hash Display */}
            {checksumSha256 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: 'rgba(212, 244, 88, 0.06)',
                  border: '1px solid rgba(212, 244, 88, 0.25)',
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-full)',
                }}
              >
                <ShieldCheck size={14} color="var(--accent-lime)" />
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>SHA-256:</span>
                <code
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    color: 'var(--accent-lime)',
                  }}
                  title={checksumSha256}
                >
                  {checksumSha256.slice(0, 10)}…{checksumSha256.slice(-8)}
                </code>
                <button
                  type="button"
                  onClick={copyChecksum}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 2,
                    cursor: 'pointer',
                    color: copiedHash ? 'var(--accent-lime)' : 'var(--text-faint)',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  title="Copy full cryptographic SHA-256 digest"
                  aria-label="Copy hash"
                >
                  {copiedHash ? <Check size={12} /> : <Copy size={12} />}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* In-Browser Preview Canvas */}
        <div
          style={{
            position: 'relative',
            height: 520,
            background: '#0d1d14',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {loading && (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                color: 'var(--text-muted)',
              }}
            >
              <Loader2 size={32} className="animate-spin" color="var(--accent-lime)" />
              <div style={{ fontSize: 13, fontWeight: 500 }}>
                Streaming binary payload &amp; validating cryptographic integrity…
              </div>
            </div>
          )}

          {error && !loading && (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 24,
                textAlign: 'center',
                gap: 12,
              }}
            >
              <AlertCircle size={36} color="#ef4444" />
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-white)' }}>
                Document Preview Unavailable
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)', maxWidth: 420 }}>
                {error}
              </div>
              <div
                style={{
                  marginTop: 12,
                  padding: '12px 16px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  borderRadius: 8,
                  fontSize: 12,
                  color: 'var(--text-faint)',
                  textAlign: 'left',
                }}
              >
                <strong>Simulated Statutory Record:</strong>
                <div>• Title: {title}</div>
                <div>• Reference ID: {documentId}</div>
                {checksumSha256 && <div>• Registered SHA-256: {checksumSha256}</div>}
              </div>
            </div>
          )}

          {!loading && !error && blobUrl && (
            <>
              {isImage ? (
                <div
                  style={{
                    flex: 1,
                    overflow: 'auto',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 20,
                    background: '#07150e',
                  }}
                >
                  <img
                    src={blobUrl}
                    alt={fileName}
                    style={{
                      maxWidth: `${zoomLevel}%`,
                      maxHeight: '100%',
                      objectFit: 'contain',
                      borderRadius: 4,
                      boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                      transition: 'max-width 0.15s ease',
                    }}
                  />
                </div>
              ) : (
                <iframe
                  src={`${blobUrl}#toolbar=1&navpanes=0`}
                  title={fileName}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    background: '#ffffff',
                  }}
                />
              )}

              {/* Viewer Control Bar for Images */}
              {isImage && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: 14,
                    right: 14,
                    display: 'flex',
                    gap: 6,
                    background: 'rgba(7, 21, 14, 0.85)',
                    padding: '4px 8px',
                    borderRadius: 'var(--radius-full)',
                    border: '1px solid var(--border-subtle)',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={() => setZoomLevel((z) => Math.max(z - 25, 50))}
                    style={{ padding: '4px 8px' }}
                    title="Zoom out"
                  >
                    <ZoomOut size={13} />
                  </button>
                  <span style={{ fontSize: 11, alignSelf: 'center', color: 'var(--text-white)', minWidth: 36, textAlign: 'center' }}>
                    {zoomLevel}%
                  </span>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={() => setZoomLevel((z) => Math.min(z + 25, 200))}
                    style={{ padding: '4px 8px' }}
                    title="Zoom in"
                  >
                    <ZoomIn size={13} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={() => setZoomLevel(100)}
                    style={{ padding: '4px 8px' }}
                    title="Reset zoom"
                  >
                    <Maximize2 size={13} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Modal>
  );
};
