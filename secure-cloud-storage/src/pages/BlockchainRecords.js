import React, { useState, useEffect } from 'react';
import { blockchainAPI, filesAPI } from '../services/api';

export default function BlockchainRecords() {
  const [records,     setRecords]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [search,      setSearch]      = useState('');
  const [verifyState, setVerifyState] = useState({});
  const [verifyMsg,   setVerifyMsg]   = useState({});

  useEffect(() => {
    (async () => {
      try {
        const res = await blockchainAPI.getRecords();
        const safe = (res.data?.records || []).map(
          ({ hash, sha256, checksum, fileHash, ...rest }) => rest // eslint-disable-line no-unused-vars
        );
        setRecords(safe);
      } catch {
        setError('Could not load blockchain records. Make sure the backend is running.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Compute stats from real data only
  const total     = records.length;
  const confirmed = records.filter(r => (r.txStatus || r.status) === 'Confirmed').length;
  const pending   = records.filter(r => (r.txStatus || r.status) !== 'Confirmed').length;
  const latestBlock = records.reduce((max, r) => Math.max(max, r.blockNumber || 0), 0);

  const STAT_META = [
    { label: 'Total Records', value: total,                                   icon: 'bi-database-fill',     color: '#0D6EFD', bg: 'rgba(13,110,253,0.10)'  },
    { label: 'Confirmed',     value: confirmed,                               icon: 'bi-check-circle-fill', color: '#10b981', bg: 'rgba(16,185,129,0.10)'  },
    { label: 'Pending',       value: pending,                                 icon: 'bi-hourglass-split',   color: '#f59e0b', bg: 'rgba(245,158,11,0.10)'  },
    { label: 'Latest Block',  value: latestBlock ? latestBlock.toLocaleString() : '—', icon: 'bi-box-fill', color: '#8b5cf6', bg: 'rgba(139,92,246,0.10)' },
  ];

  const handleVerify = async (record) => {
    const id = record.id;
    setVerifyState(p => ({ ...p, [id]: 'loading' }));
    setVerifyMsg(p => ({ ...p, [id]: '' }));
    try {
      const res = await filesAPI.verifyIntegrity(record.fileId);
      const { verified, status, message } = res.data;
      setVerifyState(p => ({ ...p, [id]: verified ? 'verified' : 'mismatch' }));
      setVerifyMsg(p => ({ ...p, [id]: status || message }));
    } catch {
      try {
        const res2 = await blockchainAPI.verifyRecord(record.fileId);
        const { verified, status, message } = res2.data;
        setVerifyState(p => ({ ...p, [id]: verified ? 'verified' : 'mismatch' }));
        setVerifyMsg(p => ({ ...p, [id]: status || message }));
      } catch {
        setVerifyState(p => ({ ...p, [id]: 'error' }));
        setVerifyMsg(p => ({ ...p, [id]: 'Verification unavailable' }));
      }
    }
  };

  const filtered = records.filter(r =>
    r.fileName?.toLowerCase().includes(search.toLowerCase()) ||
    r.txId?.toLowerCase().includes(search.toLowerCase())
  );

  const VerifyButton = ({ record }) => {
    const state = verifyState[record.id] || 'idle';
    const msg   = verifyMsg[record.id]   || '';
    if (state === 'loading')  return <button className="btn btn-sm btn-outline-primary" style={{ borderRadius: 7, fontSize: '0.77rem' }} disabled><span className="spinner-border spinner-border-sm me-1" />Verifying…</button>;
    if (state === 'verified') return <span className="badge-ok d-inline-flex align-items-center gap-1" style={{ fontSize: '0.77rem', padding: '5px 10px' }}><i className="bi bi-patch-check-fill" />{msg || 'Integrity Verified'}</span>;
    if (state === 'mismatch') return <span className="badge-danger d-inline-flex align-items-center gap-1" style={{ fontSize: '0.77rem', padding: '5px 10px' }}><i className="bi bi-x-octagon-fill" />{msg || 'Integrity Mismatch'}</span>;
    if (state === 'error')    return <span className="badge-warn d-inline-flex align-items-center gap-1" style={{ fontSize: '0.77rem', padding: '5px 10px' }}><i className="bi bi-exclamation-triangle-fill" />{msg}</span>;
    return <button className="btn btn-sm btn-outline-primary" style={{ borderRadius: 7, fontSize: '0.77rem' }} onClick={() => handleVerify(record)}><i className="bi bi-shield-check me-1" />Verify</button>;
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <h3><i className="bi bi-link-45deg me-2 text-primary" />Blockchain Records</h3>
        <p>Immutable file integrity records stored on the distributed ledger.</p>
      </div>

      {/* Stats – computed from real data */}
      <div className="row g-3 mb-4">
        {STAT_META.map((s) => (
          <div key={s.label} className="col-6 col-md-3">
            <div className="stat-card">
              <div className="stat-icon" style={{ background: s.bg, color: s.color }}>
                <i className={`bi ${s.icon}`} />
              </div>
              <div className="stat-value" style={{ fontSize: '1.6rem' }}>
                {loading ? <span className="spinner-border spinner-border-sm text-secondary" /> : s.value}
              </div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="content-card">
        <div className="content-card-header">
          <h5><i className="bi bi-table me-2" />Transaction Ledger</h5>
          <div className="search-wrap">
            <i className="bi bi-search" />
            <input type="text" className="form-control search-input"
              placeholder="Search file name or TX ID…"
              value={search} onChange={(e) => setSearch(e.target.value)}
              style={{ width: 260 }} />
          </div>
        </div>

        {loading ? (
          <div className="spinner-wrap">
            <div className="spinner-border text-primary"><span className="visually-hidden">Loading…</span></div>
            <span>Loading records…</span>
          </div>
        ) : error ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444', fontSize: '0.84rem' }}>
            <i className="bi bi-exclamation-triangle-fill me-2" />{error}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
            <i className="bi bi-link-45deg" style={{ fontSize: '3rem', display: 'block', marginBottom: '0.75rem' }} />
            <div style={{ fontWeight: 600 }}>{search ? 'No records match your search.' : 'No blockchain records yet.'}</div>
            {!search && <div style={{ fontSize: '0.84rem', marginTop: '0.3rem' }}>Records appear here after a file is uploaded.</div>}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table mb-0">
              <thead>
                <tr>
                  <th>File Name</th>
                  <th>Block #</th>
                  <th>Confirmations</th>
                  <th>Timestamp</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div className="fw-semibold" style={{ fontSize: '0.84rem' }}>{r.fileName}</div>
                      {r.txId && (
                        <div style={{ fontSize: '0.71rem', color: '#94a3b8', fontFamily: 'monospace', marginTop: 2 }}>
                          TX: {r.txId.slice(0, 10)}…{r.txId.slice(-6)}
                        </div>
                      )}
                    </td>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: '#8b5cf6', fontWeight: 700 }}>
                        #{(r.blockNumber || 0).toLocaleString()}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.81rem', color: (r.confirmations || 0) > 100 ? '#10b981' : '#f59e0b', fontWeight: 700 }}>
                        <i className={`bi bi-${(r.confirmations || 0) > 100 ? 'check-all' : 'hourglass-split'} me-1`} />
                        {r.confirmations ?? '—'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        <i className="bi bi-calendar3 me-1" />{r.createdAt || '—'}
                      </span>
                    </td>
                    <td>
                      {(r.txStatus || r.status) === 'Confirmed'
                        ? <span className="badge-ok"><i className="bi bi-check-circle-fill me-1" />Confirmed</span>
                        : <span className="badge-warn"><i className="bi bi-hourglass-split me-1" />Pending</span>}
                    </td>
                    <td><VerifyButton record={r} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
