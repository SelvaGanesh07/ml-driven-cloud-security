import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { statsAPI, filesAPI } from '../services/api';

/* ── helpers ─────────────────────────────────────────────────────────────── */
const fmt = (b) => {
  if (!b) return '—';
  const k = 1024, s = ['B', 'KB', 'MB', 'GB'], i = Math.floor(Math.log(b) / Math.log(k));
  return `${(b / Math.pow(k, i)).toFixed(1)} ${s[i]}`;
};

const fmtDate = (iso) => {
  try { return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return iso || '—'; }
};

const FILE_ICONS = {
  pdf:   ['bi-file-earmark-pdf-fill',  'fi-pdf'],
  png:   ['bi-file-earmark-image-fill','fi-img'],
  jpg:   ['bi-file-earmark-image-fill','fi-img'],
  jpeg:  ['bi-file-earmark-image-fill','fi-img'],
  gif:   ['bi-file-earmark-image-fill','fi-img'],
  webp:  ['bi-file-earmark-image-fill','fi-img'],
  doc:   ['bi-file-earmark-text-fill', 'fi-doc'],
  docx:  ['bi-file-earmark-text-fill', 'fi-doc'],
  txt:   ['bi-file-earmark-text-fill', 'fi-doc'],
  zip:   ['bi-file-earmark-zip-fill',  'fi-zip'],
  rar:   ['bi-file-earmark-zip-fill',  'fi-zip'],
  gz:    ['bi-file-earmark-zip-fill',  'fi-zip'],
};
const fileIcon = (name = '') => {
  const ext = name.split('.').pop().toLowerCase();
  return FILE_ICONS[ext] || ['bi-file-earmark-fill', 'fi-other'];
};

function StatusBadge({ s }) {
  if (s === 'Verified') return <span className="badge-ok"><i className="bi bi-check-circle-fill me-1" />Verified</span>;
  if (s === 'Pending')  return <span className="badge-warn"><i className="bi bi-hourglass-split me-1" />Pending</span>;
  return <span className="badge-danger"><i className="bi bi-exclamation-triangle-fill me-1" />Alert</span>;
}

const AV_COLORS = ['#0D6EFD', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b'];
const avStyle = (name = '') => {
  const c = AV_COLORS[(name.charCodeAt(0) || 0) % AV_COLORS.length];
  return { width: 28, height: 28, borderRadius: 7, background: c, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.74rem', fontWeight: 700, flexShrink: 0 };
};

/* ── stat card definitions (values filled at runtime) ─────────────────────── */
const STAT_META = [
  { key: 'totalFiles',        label: 'Total Files',        icon: 'bi-folder2-open',        color: '#0D6EFD', bg: 'rgba(13,110,253,0.10)'  },
  { key: 'uploadedToday',     label: 'Uploaded Today',     icon: 'bi-cloud-arrow-up-fill', color: '#06b6d4', bg: 'rgba(6,182,212,0.10)'   },
  { key: 'blockchainRecords', label: 'Blockchain Records', icon: 'bi-link-45deg',          color: '#8b5cf6', bg: 'rgba(139,92,246,0.10)'  },
  { key: 'threatAlerts',      label: 'Threat Alerts',      icon: 'bi-shield-exclamation',  color: '#ef4444', bg: 'rgba(239,68,68,0.10)'   },
];

/* ── component ───────────────────────────────────────────────────────────── */
export default function Dashboard() {
  const userName = localStorage.getItem('userName') || 'User';

  const [now,        setNow]        = useState(new Date());
  const [stats,      setStats]      = useState(null);
  const [uploads,    setUploads]    = useState([]);
  const [statsErr,   setStatsErr]   = useState('');
  const [uploadsErr, setUploadsErr] = useState('');
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const greeting = () => {
    const h = now.getHours();
    return h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening';
  };
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  const load = useCallback(async () => {
    setLoading(true);
    setStatsErr(''); setUploadsErr('');

    // Fetch stats and recent uploads in parallel
    const [statsRes, filesRes] = await Promise.allSettled([
      statsAPI.getSummary(),
      filesAPI.getAllFiles(),
    ]);

    if (statsRes.status === 'fulfilled') {
      setStats(statsRes.value.data?.stats || null);
    } else {
      setStatsErr('Could not load statistics.');
    }

    if (filesRes.status === 'fulfilled') {
      // Strip any hash fields (defence-in-depth), take the 5 most recent
      const raw = filesRes.value.data?.files || filesRes.value.data || [];
      const safe = raw
        .map(({ hash, sha256, checksum, fileHash, ...rest }) => rest) // eslint-disable-line no-unused-vars
        .slice(0, 5);
      setUploads(safe);
    } else {
      setUploadsErr('Could not load recent uploads.');
    }

    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="fade-in">

      {/* Welcome */}
      <div className="welcome-card">
        <div className="row align-items-center">
          <div className="col-md-8">
            <h2>{greeting()}, {cap(userName)} 👋</h2>
            <p>Your secure storage is running smoothly. All systems operational.</p>
            <div className="d-flex gap-2 flex-wrap mt-3">
              <Link to="/upload" className="btn btn-light btn-sm fw-semibold px-3" style={{ borderRadius: 8, color: '#0D6EFD' }}>
                <i className="bi bi-cloud-arrow-up me-1" />Upload File
              </Link>
              <Link to="/blockchain" className="btn btn-outline-light btn-sm fw-semibold px-3" style={{ borderRadius: 8 }}>
                <i className="bi bi-link-45deg me-1" />View Blockchain
              </Link>
            </div>
          </div>
          <div className="col-md-4 text-end d-none d-md-block">
            <i className="bi bi-shield-fill-check" style={{ fontSize: '5.5rem', opacity: 0.13 }} />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="row g-3 mb-4">
        {STAT_META.map((m) => (
          <div key={m.key} className="col-6 col-xl-3">
            <div className="stat-card">
              <div className="stat-icon" style={{ background: m.bg, color: m.color }}>
                <i className={`bi ${m.icon}`} />
              </div>
              <div className="stat-value">
                {loading
                  ? <span className="spinner-border spinner-border-sm text-secondary" />
                  : statsErr
                    ? '—'
                    : (stats?.[m.key] ?? 0).toLocaleString()}
              </div>
              <div className="stat-label">{m.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="row g-3">

        {/* Recent Uploads */}
        <div className="col-lg-8">
          <div className="content-card">
            <div className="content-card-header">
              <h5><i className="bi bi-clock-history me-2 text-primary" />Recent Uploads</h5>
              <Link to="/files" className="btn btn-sm btn-outline-primary" style={{ borderRadius: 8, fontSize: '0.8rem' }}>
                View All <i className="bi bi-arrow-right ms-1" />
              </Link>
            </div>

            {loading ? (
              <div className="spinner-wrap">
                <div className="spinner-border text-primary"><span className="visually-hidden">Loading…</span></div>
                <span>Loading uploads…</span>
              </div>
            ) : uploadsErr ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444', fontSize: '0.84rem' }}>
                <i className="bi bi-exclamation-triangle-fill me-2" />{uploadsErr}
              </div>
            ) : uploads.length === 0 ? (
              <div style={{ padding: '2.5rem', textAlign: 'center', color: '#94a3b8' }}>
                <i className="bi bi-cloud-arrow-up" style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.6rem' }} />
                <div style={{ fontWeight: 600 }}>No files uploaded yet.</div>
                <div style={{ fontSize: '0.83rem', marginTop: '0.3rem' }}>
                  <Link to="/upload" style={{ color: '#0D6EFD' }}>Upload your first file</Link>
                </div>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table mb-0">
                  <thead>
                    <tr>
                      <th>File Name</th>
                      <th>Owner</th>
                      <th>Upload Time</th>
                      <th>Blockchain Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uploads.map((f) => {
                      const [iconCls, colorCls] = fileIcon(f.fileName);
                      return (
                        <tr key={f._id}>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <i className={`bi ${iconCls} fi ${colorCls}`} />
                              <div>
                                <div className="fw-semibold" style={{ fontSize: '0.84rem', color: '#1e293b' }}>{f.fileName}</div>
                                <div style={{ fontSize: '0.73rem', color: '#94a3b8' }}>{fmt(f.size)}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <div style={avStyle(f.owner || '?')}>{(f.owner || '?').charAt(0).toUpperCase()}</div>
                              <span style={{ fontSize: '0.84rem' }}>{f.owner || '—'}</span>
                            </div>
                          </td>
                          <td>
                            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                              <i className="bi bi-calendar3 me-1" />{fmtDate(f.timestamp || f.uploadTime || f.createdAt)}
                            </span>
                          </td>
                          <td><StatusBadge s={f.status || 'Pending'} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Security Status */}
        <div className="col-lg-4">
          <div className="content-card">
            <div className="content-card-header">
              <h5><i className="bi bi-shield-fill-check me-2 text-primary" />Security Status</h5>
            </div>
            <div style={{ padding: '1rem 1.25rem 1.25rem' }}>
              {[
                { label: 'Blockchain Sync',  value: 'Operational', icon: 'bi-check-circle-fill', color: '#10b981' },
                { label: 'Encryption Layer', value: 'AES-256',     icon: 'bi-lock-fill',          color: '#0D6EFD' },
                { label: 'Threat Scanning',  value: 'Active',       icon: 'bi-check-circle-fill', color: '#10b981' },
                {
                  label: 'Active Alerts',
                  value: loading ? '…' : statsErr ? '—' : String(stats?.threatAlerts ?? 0),
                  icon:  'bi-exclamation-circle-fill',
                  color: (!loading && !statsErr && (stats?.threatAlerts ?? 0) > 0) ? '#ef4444' : '#10b981',
                },
              ].map((item) => (
                <div key={item.label} className="d-flex justify-content-between align-items-center mb-3 pb-2"
                  style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: '0.82rem', color: '#475569' }}>{item.label}</span>
                  <span style={{ fontSize: '0.81rem', fontWeight: 700, color: item.color, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <i className={`bi ${item.icon}`} />{item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="col-lg-4">
          <div className="content-card">
            <div className="content-card-header">
              <h5><i className="bi bi-lightning-fill me-2 text-primary" />Quick Actions</h5>
            </div>
            <div style={{ padding: '1rem 1.25rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {[
                { to: '/upload',     icon: 'bi-cloud-arrow-up-fill', label: 'Upload New File',        color: '#0D6EFD' },
                { to: '/files',      icon: 'bi-folder2-open',        label: 'Browse My Files',        color: '#8b5cf6' },
                { to: '/blockchain', icon: 'bi-link-45deg',          label: 'View Blockchain Ledger', color: '#06b6d4' },
                { to: '/threats',    icon: 'bi-shield-exclamation',  label: 'Check Threat Alerts',    color: '#ef4444' },
              ].map((a) => (
                <Link key={a.to} to={a.to}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0.85rem', borderRadius: 10, background: '#f8faff', border: '1px solid #e2e8f0', textDecoration: 'none', color: '#334155', transition: 'var(--transition)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.borderColor = '#bfdbfe'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#f8faff'; e.currentTarget.style.borderColor = '#e2e8f0'; }}>
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: `${a.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i className={`bi ${a.icon}`} style={{ color: a.color, fontSize: '1rem' }} />
                  </div>
                  <span style={{ fontSize: '0.855rem', fontWeight: 600 }}>{a.label}</span>
                  <i className="bi bi-chevron-right ms-auto" style={{ fontSize: '0.75rem', color: '#94a3b8' }} />
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Storage Usage */}
        <div className="col-lg-4">
          <div className="content-card">
            <div className="content-card-header">
              <h5><i className="bi bi-hdd-stack-fill me-2 text-primary" />Storage Usage</h5>
            </div>
            <div style={{ padding: '1rem 1.25rem 1.25rem' }}>
              {[
                { label: 'Documents', used: 65, color: '#0D6EFD' },
                { label: 'Images',    used: 32, color: '#8b5cf6' },
                { label: 'Archives',  used: 48, color: '#06b6d4' },
                { label: 'Other',     used: 15, color: '#f59e0b' },
              ].map((item) => (
                <div key={item.label} className="mb-3">
                  <div className="d-flex justify-content-between mb-1">
                    <span style={{ fontSize: '0.81rem', fontWeight: 600, color: '#334155' }}>{item.label}</span>
                    <span style={{ fontSize: '0.77rem', color: '#94a3b8' }}>{item.used}%</span>
                  </div>
                  <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${item.used}%`, height: '100%', background: item.color, borderRadius: 3 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
