import React, { useState, useEffect, useMemo } from 'react';
import { filesAPI } from '../services/api';

const PER_PAGE = 5;

const fmt = (b) => {
  if (!b) return '—';
  const k = 1024, s = ['B', 'KB', 'MB', 'GB'], i = Math.floor(Math.log(b) / Math.log(k));
  return `${(b / Math.pow(k, i)).toFixed(1)} ${s[i]}`;
};

const fmtDate = (iso) => {
  try { return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return iso || '—'; }
};

function fileIcon(name = '') {
  const ext = name.split('.').pop().toLowerCase();
  if (ext === 'pdf')                                        return ['bi-file-earmark-pdf-fill',  'fi-pdf'];
  if (['png','jpg','jpeg','gif','webp'].includes(ext))      return ['bi-file-earmark-image-fill','fi-img'];
  if (['doc','docx','txt','md'].includes(ext))              return ['bi-file-earmark-text-fill', 'fi-doc'];
  if (['zip','rar','tar','gz'].includes(ext))               return ['bi-file-earmark-zip-fill',  'fi-zip'];
  return ['bi-file-earmark-fill', 'fi-other'];
}

function StatusBadge({ s }) {
  if (s === 'Verified') return <span className="badge-ok"><i className="bi bi-check-circle-fill me-1" />Verified</span>;
  if (s === 'Pending')  return <span className="badge-warn"><i className="bi bi-hourglass-split me-1" />Pending</span>;
  return <span className="badge-danger"><i className="bi bi-exclamation-triangle-fill me-1" />Alert</span>;
}

const AV_COLORS = ['#0D6EFD','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444'];
const avStyle = (name = '') => {
  const c = AV_COLORS[(name.charCodeAt(0) || 0) % AV_COLORS.length];
  return { width: 28, height: 28, borderRadius: 7, background: c, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.74rem', fontWeight: 700, flexShrink: 0 };
};

export default function MyFiles() {
  const [files,   setFiles]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [search,  setSearch]  = useState('');
  const [filter,  setFilter]  = useState('All');
  const [page,    setPage]    = useState(1);
  const [sortF,   setSortF]   = useState('timestamp');
  const [sortD,   setSortD]   = useState('desc');

  useEffect(() => {
    (async () => {
      try {
        const res = await filesAPI.getAllFiles();
        const raw = res.data?.files || res.data || [];
        // Strip any hash fields (defence-in-depth)
        const safe = raw.map(({ hash, sha256, checksum, fileHash, ...rest }) => rest); // eslint-disable-line no-unused-vars
        setFiles(safe);
      } catch {
        setError('Could not load files. Make sure the backend is running.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSort = (f) => {
    if (sortF === f) setSortD(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortF(f); setSortD('asc'); }
    setPage(1);
  };

  const SortIcon = ({ f }) => sortF !== f
    ? <i className="bi bi-arrow-down-up ms-1 text-muted" style={{ fontSize: '0.68rem' }} />
    : <i className={`bi bi-arrow-${sortD === 'asc' ? 'up' : 'down'} ms-1 text-primary`} style={{ fontSize: '0.68rem' }} />;

  const filtered = useMemo(() => {
    let list = [...files];
    if (filter !== 'All') list = list.filter(f => f.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(f =>
        f.fileName?.toLowerCase().includes(q) ||
        f.owner?.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      let va = a[sortF] ?? '', vb = b[sortF] ?? '';
      if (sortF === 'size') { va = Number(va); vb = Number(vb); }
      return va < vb ? (sortD === 'asc' ? -1 : 1) : va > vb ? (sortD === 'asc' ? 1 : -1) : 0;
    });
    return list;
  }, [files, search, filter, sortF, sortD]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const handleDownload = async (f) => {
    try {
      const res = await filesAPI.downloadFile(f._id);
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href = url; a.download = f.fileName; a.click(); URL.revokeObjectURL(url);
    } catch (err) {
      alert('Download failed: ' + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <h3><i className="bi bi-folder2-open me-2 text-primary" />My Files</h3>
        <p>Browse, search and manage all your securely stored files.</p>
      </div>

      <div className="content-card">
        {/* Toolbar */}
        <div className="content-card-header">
          <div className="d-flex align-items-center gap-2">
            <h5 className="mb-0"><i className="bi bi-files me-2" />All Files</h5>
            <span style={{ background: 'rgba(13,110,253,0.1)', color: '#0D6EFD', borderRadius: 20, padding: '2px 10px', fontSize: '0.77rem', fontWeight: 700 }}>
              {filtered.length}
            </span>
          </div>
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <div className="btn-group btn-group-sm">
              {['All','Verified','Pending','Alert'].map((f, i, arr) => (
                <button key={f} type="button"
                  className={`btn ${filter === f ? 'btn-primary' : 'btn-outline-secondary'}`}
                  style={{ fontSize: '0.77rem', borderRadius: i === 0 ? '8px 0 0 8px' : i === arr.length - 1 ? '0 8px 8px 0' : undefined }}
                  onClick={() => { setFilter(f); setPage(1); }}>
                  {f}
                </button>
              ))}
            </div>
            <div className="search-wrap">
              <i className="bi bi-search" />
              <input type="text" className="form-control search-input"
                placeholder="Search files, owners…" value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                style={{ width: 220 }} />
            </div>
          </div>
        </div>

        {/* Body */}
        {loading ? (
          <div className="spinner-wrap">
            <div className="spinner-border text-primary"><span className="visually-hidden">Loading…</span></div>
            <span>Loading files…</span>
          </div>
        ) : error ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: '#ef4444', fontSize: '0.84rem' }}>
            <i className="bi bi-exclamation-triangle-fill me-2" />{error}
          </div>
        ) : paged.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
            <i className="bi bi-folder-x" style={{ fontSize: '3rem', display: 'block', marginBottom: '0.75rem' }} />
            <div style={{ fontWeight: 600 }}>
              {files.length === 0 ? 'No files uploaded yet.' : 'No files match your search or filter.'}
            </div>
            <div style={{ fontSize: '0.84rem', marginTop: '0.3rem' }}>
              {files.length === 0 ? 'Upload a file to get started.' : 'Try adjusting your search or filter.'}
            </div>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table mb-0">
              <thead>
                <tr>
                  <th style={{ cursor: 'pointer' }} onClick={() => handleSort('fileName')}>File Name <SortIcon f="fileName" /></th>
                  <th style={{ cursor: 'pointer' }} onClick={() => handleSort('owner')}>Owner <SortIcon f="owner" /></th>
                  <th style={{ cursor: 'pointer' }} onClick={() => handleSort('timestamp')}>Timestamp <SortIcon f="timestamp" /></th>
                  <th style={{ cursor: 'pointer' }} onClick={() => handleSort('size')}>Size <SortIcon f="size" /></th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((f) => {
                  const [ic, cc] = fileIcon(f.fileName);
                  return (
                    <tr key={f._id}>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <i className={`bi ${ic} fi ${cc}`} />
                          <span className="fw-semibold" style={{ fontSize: '0.84rem', color: '#1e293b' }}>{f.fileName}</span>
                        </div>
                      </td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div style={avStyle(f.owner || '?')}>{(f.owner || '?').charAt(0).toUpperCase()}</div>
                          <span style={{ fontSize: '0.84rem' }}>{f.owner || '—'}</span>
                        </div>
                      </td>
                      <td><span style={{ fontSize: '0.8rem', color: '#64748b' }}><i className="bi bi-calendar3 me-1" />{fmtDate(f.timestamp || f.uploadTime || f.createdAt)}</span></td>
                      <td><span style={{ fontSize: '0.8rem', color: '#64748b' }}>{fmt(f.size)}</span></td>
                      <td><StatusBadge s={f.status || 'Pending'} /></td>
                      <td>
                        <button className="btn btn-sm btn-primary" style={{ borderRadius: 7, fontSize: '0.77rem', padding: '4px 10px' }}
                          onClick={() => handleDownload(f)}>
                          <i className="bi bi-download me-1" />Download
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="d-flex justify-content-between align-items-center px-4 py-3" style={{ borderTop: '1px solid #f1f5f9' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}
            </span>
            <div className="d-flex gap-1">
              <button className="btn btn-sm btn-outline-secondary" style={{ borderRadius: 7 }} disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                <i className="bi bi-chevron-left" />
              </button>
              {[...Array(totalPages)].map((_, i) => (
                <button key={i} className={`btn btn-sm ${page === i + 1 ? 'btn-primary' : 'btn-outline-secondary'}`}
                  style={{ borderRadius: 7, minWidth: 34 }} onClick={() => setPage(i + 1)}>
                  {i + 1}
                </button>
              ))}
              <button className="btn btn-sm btn-outline-secondary" style={{ borderRadius: 7 }} disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                <i className="bi bi-chevron-right" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
