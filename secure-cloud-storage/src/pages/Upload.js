import React, { useState, useRef, useCallback } from 'react';
import { filesAPI } from '../services/api';

const MAX_MB = 500;
const fmt = (b) => {
  if (!b) return '0 B';
  const k = 1024, s = ['B','KB','MB','GB'], i = Math.floor(Math.log(b) / Math.log(k));
  return `${(b / Math.pow(k, i)).toFixed(1)} ${s[i]}`;
};

function fileIcon(name = '') {
  const ext = name.split('.').pop().toLowerCase();
  if (ext === 'pdf')                                         return ['bi-file-earmark-pdf-fill',   '#ef4444'];
  if (['png','jpg','jpeg','gif','webp','svg'].includes(ext)) return ['bi-file-earmark-image-fill', '#8b5cf6'];
  if (['doc','docx','txt','md'].includes(ext))               return ['bi-file-earmark-text-fill',  '#3b82f6'];
  if (['zip','rar','tar','gz'].includes(ext))                return ['bi-file-earmark-zip-fill',   '#f59e0b'];
  if (['mp4','avi','mov'].includes(ext))                     return ['bi-file-earmark-play-fill',  '#06b6d4'];
  return ['bi-file-earmark-fill', '#64748b'];
}

export default function Upload() {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [file,     setFile]     = useState(null);
  const [desc,     setDesc]     = useState('');
  const [loading,  setLoading]  = useState(false);
  const [progress, setProgress] = useState(0);
  const [result,   setResult]   = useState(null);
  const [error,    setError]    = useState('');

  const pick = useCallback((f) => {
    setError(''); setResult(null);
    if (f.size > MAX_MB * 1024 * 1024) { setError(`File exceeds ${MAX_MB} MB limit.`); return; }
    setFile(f);
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault(); setDragOver(false);
    if (e.dataTransfer.files[0]) pick(e.dataTransfer.files[0]);
  }, [pick]);

  const reset = () => {
    setFile(null); setDesc('');
    setProgress(0); setResult(null); setError('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setResult(null);
    if (!file) { setError('Please select a file.'); return; }
    setLoading(true); setProgress(0);

    try {
      // Owner is determined on the backend from the JWT — not passed here
      const res = await filesAPI.uploadFile(
        file,
        desc.trim(),
        (evt) => evt.total && setProgress(Math.round(evt.loaded * 100 / evt.total))
      );
      setProgress(100);
      setResult({
        fileName:    res.data?.fileName    || file.name,
        fileSize:    fmt(file.size),
        uploadTime:  res.data?.uploadTime  || new Date().toLocaleString(),
        txId:        res.data?.txId        || null,
        txStatus:    res.data?.txStatus    || 'Confirmed',
        blockNumber: res.data?.blockNumber || null,
        owner:       res.data?.owner       || localStorage.getItem('userEmail') || '—',
      });
    } catch (err) {
      const data   = err.response?.data;
      const status = err.response?.status;
      setError(`[${status || 'Network Error'}] ${data?.message || err.message || 'Upload failed.'}`);
    } finally {
      setLoading(false);
    }
  };

  const [ic, icolor] = file ? fileIcon(file.name) : [];

  return (
    <div className="fade-in">
      <div className="page-header">
        <h3><i className="bi bi-cloud-arrow-up-fill me-2 text-primary" />Upload File</h3>
        <p>Securely upload files with AES-256 encryption, blockchain integrity verification and threat scanning.</p>
      </div>

      <div className="row g-4">
        {/* Form */}
        <div className="col-lg-7">
          <div className="content-card">
            <div className="content-card-header">
              <h5><i className="bi bi-upload me-2" />New Upload</h5>
              {file && <span style={{ fontSize: '0.77rem', color: '#64748b' }}>{fmt(file.size)}</span>}
            </div>
            <div style={{ padding: '1.5rem' }}>
              <form onSubmit={handleSubmit}>

                {/* Drop zone */}
                <div className={`dropzone${dragOver ? ' drag-active' : ''}`}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={onDrop}
                  onClick={() => !file && inputRef.current?.click()}
                  role="button" tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
                  aria-label="File drop zone">
                  <input ref={inputRef} type="file" style={{ display: 'none' }}
                    onChange={(e) => e.target.files[0] && pick(e.target.files[0])} />
                  {!file ? (
                    <>
                      <i className="bi bi-cloud-arrow-up dropzone-icon" />
                      <h5 className="mb-1">Drag &amp; Drop your file here</h5>
                      <p className="mb-1 text-muted" style={{ fontSize: '0.875rem' }}>
                        or <span style={{ color: '#0D6EFD', fontWeight: 600 }}>browse</span> to choose a file
                      </p>
                      <small className="text-muted">All formats · Max {MAX_MB} MB</small>
                    </>
                  ) : (
                    <div className="d-flex align-items-center gap-3 justify-content-center"
                      onClick={(e) => e.stopPropagation()}>
                      <i className={`bi ${ic}`} style={{ fontSize: '2.5rem', color: icolor }} />
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.93rem' }}>{file.name}</div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{fmt(file.size)}</div>
                      </div>
                      <button type="button" className="btn btn-sm btn-outline-danger ms-2"
                        style={{ borderRadius: 8 }} onClick={reset}>
                        <i className="bi bi-x-lg" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Description */}
                <div className="mb-4 mt-4">
                  <label className="form-label fw-semibold" style={{ fontSize: '0.84rem' }}>
                    <i className="bi bi-card-text me-1 text-primary" />Description <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional)</span>
                  </label>
                  <textarea className="form-control" rows={3} placeholder="Brief description of the file…"
                    value={desc} onChange={(e) => setDesc(e.target.value)}
                    style={{ borderRadius: 10, fontSize: '0.9rem', resize: 'none' }} />
                </div>

                {/* Progress */}
                {loading && (
                  <div className="mb-3">
                    <div className="d-flex justify-content-between mb-1">
                      <small className="fw-semibold text-primary">Uploading…</small>
                      <small className="fw-semibold text-primary">{progress}%</small>
                    </div>
                    <div className="progress" style={{ height: 8, borderRadius: 4 }}>
                      <div className="progress-bar progress-bar-striped progress-bar-animated"
                        style={{ width: `${progress}%`, background: 'linear-gradient(90deg,#0D6EFD,#06b6d4)' }}
                        role="progressbar" aria-valuenow={progress} aria-valuemin="0" aria-valuemax="100" />
                    </div>
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div className="alert alert-danger d-flex align-items-center gap-2 py-2 mb-3" role="alert">
                    <i className="bi bi-exclamation-triangle-fill" />
                    <span style={{ fontSize: '0.855rem' }}>{error}</span>
                  </div>
                )}

                {/* Buttons */}
                <div className="d-flex gap-2">
                  <button type="submit" className="btn btn-primary flex-grow-1"
                    disabled={loading} style={{ borderRadius: 10, fontWeight: 700, padding: '0.68rem' }}>
                    {loading
                      ? <span className="d-flex align-items-center justify-content-center gap-2"><span className="spinner-border spinner-border-sm" />Uploading…</span>
                      : <span className="d-flex align-items-center justify-content-center gap-2"><i className="bi bi-cloud-arrow-up-fill" />Upload File</span>}
                  </button>
                  <button type="button" className="btn btn-outline-secondary"
                    style={{ borderRadius: 10 }} onClick={reset} title="Reset">
                    <i className="bi bi-arrow-counterclockwise" />
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="col-lg-5">
          {result ? (
            <div className="success-card mb-3">
              <div className="d-flex align-items-center gap-2 mb-3">
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="bi bi-check-lg text-white" style={{ fontSize: '1.1rem' }} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, color: '#065f46' }}>Upload Successful!</div>
                  <div style={{ fontSize: '0.74rem', color: '#6ee7b7' }}>File secured &amp; anchored to blockchain</div>
                </div>
              </div>

              {[
                { label: 'File Name',   value: result.fileName,    icon: 'bi-file-earmark' },
                { label: 'File Size',   value: result.fileSize,    icon: 'bi-hdd'           },
                { label: 'Owner',       value: result.owner,       icon: 'bi-person-fill'   },
                { label: 'Upload Time', value: result.uploadTime,  icon: 'bi-clock'         },
                { label: 'TX Status',   value: result.txStatus,    icon: 'bi-check-circle'  },
                ...(result.blockNumber ? [{ label: 'Block #', value: `#${result.blockNumber}`, icon: 'bi-box' }] : []),
              ].map((row) => (
                <div key={row.label} className="d-flex justify-content-between align-items-start mb-2 pb-2"
                  style={{ borderBottom: '1px solid rgba(134,239,172,0.4)' }}>
                  <span style={{ fontSize: '0.79rem', color: '#047857', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <i className={`bi ${row.icon}`} />{row.label}
                  </span>
                  <span style={{ fontSize: '0.79rem', color: '#065f46', fontWeight: 700, maxWidth: '60%', textAlign: 'right', wordBreak: 'break-all' }}>
                    {row.value}
                  </span>
                </div>
              ))}

              {result.txId && (
                <div className="mt-3">
                  <div style={{ fontSize: '0.77rem', color: '#047857', fontWeight: 700, marginBottom: '0.35rem' }}>
                    <i className="bi bi-link-45deg me-1" />Blockchain Transaction ID
                  </div>
                  <div className="hash-box">{result.txId}</div>
                </div>
              )}

              <div className="mt-3 d-flex align-items-center gap-2"
                style={{ background: 'rgba(16,185,129,0.08)', borderRadius: 8, padding: '0.55rem 0.75rem' }}>
                <i className="bi bi-shield-lock-fill" style={{ color: '#059669', fontSize: '1rem' }} />
                <span style={{ fontSize: '0.78rem', color: '#047857', fontWeight: 600 }}>
                  SHA-256 integrity value stored securely on the backend — not exposed to the client.
                </span>
              </div>
            </div>
          ) : (
            <div className="content-card">
              <div className="content-card-header">
                <h5><i className="bi bi-info-circle me-2" />Upload Guidelines</h5>
              </div>
              <div style={{ padding: '1rem 1.25rem 1.25rem' }}>
                {[
                  { icon: 'bi-shield-lock-fill', color: '#0D6EFD', text: 'Files are encrypted with AES-256-CBC before storage.' },
                  { icon: 'bi-link-45deg',        color: '#8b5cf6', text: 'SHA-256 integrity value is anchored to blockchain — never visible in the UI.' },
                  { icon: 'bi-cpu-fill',           color: '#06b6d4', text: 'Every upload is scanned for threats automatically.' },
                  { icon: 'bi-hdd-stack-fill',     color: '#10b981', text: `Maximum file size: ${MAX_MB} MB per upload.` },
                  { icon: 'bi-person-lock-fill',   color: '#f59e0b', text: 'Files are linked to your account. Only you and admins can access them.' },
                ].map((g, i) => (
                  <div key={i} className="d-flex gap-3 mb-3">
                    <div style={{ width: 30, height: 30, background: `${g.color}16`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <i className={`bi ${g.icon}`} style={{ color: g.color, fontSize: '0.84rem' }} />
                    </div>
                    <span style={{ fontSize: '0.83rem', color: '#475569', lineHeight: 1.5 }}>{g.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
