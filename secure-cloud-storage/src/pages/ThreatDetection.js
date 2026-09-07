import React, { useState, useEffect, useCallback } from 'react';
import { threatAPI, adminAPI } from '../services/api';

/* ── helpers ─────────────────────────────────────────────────────────────── */
const SEV = {
  High:   { cls: 'badge-danger', icon: 'bi-exclamation-triangle-fill' },
  Medium: { cls: 'badge-warn',   icon: 'bi-dash-circle-fill'          },
  Low:    { cls: 'badge-ok',     icon: 'bi-info-circle-fill'          },
};

const fmtTs = (ts) => {
  if (!ts) return '—';
  try { return new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }); }
  catch { return ts; }
};

/* ── component ───────────────────────────────────────────────────────────── */
export default function ThreatDetection() {
  // active tab: 'threats' | 'login' | 'integrity'
  const [tab,         setTab]         = useState('threats');

  // threat alerts
  const [alerts,      setAlerts]      = useState([]);
  const [alertsLoad,  setAlertsLoad]  = useState(true);
  const [alertsErr,   setAlertsErr]   = useState('');
  const [filter,      setFilter]      = useState('All');
  const [resolving,   setResolving]   = useState(null);

  // security report (login events + audit events + summary)
  const [security,    setSecurity]    = useState(null);
  const [secLoad,     setSecLoad]     = useState(true);
  const [secErr,      setSecErr]      = useState('');
  const [loginFilter, setLoginFilter] = useState('All');   // All | SUCCESS | FAILED | Suspicious
  const [intFilter,   setIntFilter]   = useState('All');   // All | MATCH | MISMATCH

  /* ── load threat alerts ─────────────────────────────────────────────────── */
  const loadAlerts = useCallback(async () => {
    setAlertsLoad(true); setAlertsErr('');
    try {
      const res = await threatAPI.getAlerts();
      setAlerts(res.data?.alerts || []);
    } catch {
      setAlertsErr('Could not load threat alerts. Make sure the backend is running.');
    } finally { setAlertsLoad(false); }
  }, []);

  /* ── load security report ───────────────────────────────────────────────── */
  const loadSecurity = useCallback(async () => {
    setSecLoad(true); setSecErr('');
    try {
      const res = await adminAPI.getSecurityReport();
      setSecurity(res.data);
    } catch {
      setSecErr('Could not load security report. Make sure the backend is running.');
    } finally { setSecLoad(false); }
  }, []);

  useEffect(() => { loadAlerts(); loadSecurity(); }, [loadAlerts, loadSecurity]);

  /* ── threat alert metrics ────────────────────────────────────────────────── */
  const total    = alerts.length;
  const active   = alerts.filter(a => a.status === 'Active').length;
  const resolved = alerts.filter(a => a.status === 'Resolved').length;
  const highSev  = alerts.filter(a => a.severity === 'High' && a.status === 'Active').length;

  const METRICS = [
    { label: 'Total Alerts',  value: total,    icon: 'bi-bell-fill',         color: '#0D6EFD' },
    { label: 'Active',        value: active,   icon: 'bi-shield-fill-x',     color: '#ef4444' },
    { label: 'Resolved',      value: resolved, icon: 'bi-shield-fill-check', color: '#10b981' },
    { label: 'High Severity', value: highSev,  icon: 'bi-exclamation-circle',color: '#f59e0b' },
  ];

  /* ── resolve threat alert ────────────────────────────────────────────────── */
  const handleResolve = async (id) => {
    setResolving(id);
    try {
      await threatAPI.resolveAlert(id);
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'Resolved' } : a));
    } catch { alert('Failed to resolve alert.'); }
    finally { setResolving(null); }
  };

  /* ── filtered lists ──────────────────────────────────────────────────────── */
  const alertList = filter === 'All' ? alerts : alerts.filter(a => a.status === filter);

  const rawLogin = security?.loginEvents || [];
  const loginList = loginFilter === 'All'        ? rawLogin
    : loginFilter === 'Suspicious'               ? rawLogin.filter(e => e.suspicious === 1)
    : rawLogin.filter(e => e.result === loginFilter);

  const rawAudit = security?.auditEvents || [];
  const auditList = intFilter === 'All' ? rawAudit : rawAudit.filter(e => e.result === intFilter);

  /* ── tab button helper ───────────────────────────────────────────────────── */
  const Tab = ({ id, label, icon, badge }) => (
    <button
      className={`btn btn-sm ${tab === id ? 'btn-primary' : 'btn-outline-secondary'}`}
      style={{ borderRadius: 8, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 5 }}
      onClick={() => setTab(id)}>
      <i className={`bi ${icon}`} />{label}
      {badge > 0 && (
        <span style={{ background: tab === id ? 'rgba(255,255,255,0.3)' : '#ef4444', color: '#fff', borderRadius: 20, padding: '1px 7px', fontSize: '0.7rem', fontWeight: 700 }}>
          {badge}
        </span>
      )}
    </button>
  );

  /* ── empty state ─────────────────────────────────────────────────────────── */
  const EmptyState = ({ icon, msg, sub }) => (
    <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
      <i className={`bi ${icon}`} style={{ fontSize: '3rem', display: 'block', marginBottom: '0.75rem', color: '#10b981' }} />
      <div style={{ fontWeight: 600 }}>{msg}</div>
      {sub && <div style={{ fontSize: '0.84rem', marginTop: '0.3rem', color: '#10b981' }}>{sub}</div>}
    </div>
  );

  /* ── render ──────────────────────────────────────────────────────────────── */
  return (
    <div className="fade-in">
      <div className="page-header">
        <h3><i className="bi bi-shield-exclamation me-2 text-primary" />Threat Detection &amp; Security Audit</h3>
        <p>Real-time threat analysis, login activity monitoring, and file-integrity audit trail.</p>
      </div>

      {/* Stat cards */}
      <div className="row g-3 mb-4">
        {METRICS.map((m) => (
          <div key={m.label} className="col-6 col-md-3">
            <div className="stat-card">
              <div className="stat-icon" style={{ background: `${m.color}18`, color: m.color }}>
                <i className={`bi ${m.icon}`} />
              </div>
              <div className="stat-value" style={{ fontSize: '1.6rem' }}>
                {alertsLoad ? <span className="spinner-border spinner-border-sm text-secondary" /> : m.value}
              </div>
              <div className="stat-label">{m.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div className="d-flex gap-2 mb-3 flex-wrap">
        <Tab id="threats"   label="Security Alerts"    icon="bi-bell-fill"           badge={active} />
        <Tab id="login"     label="Login Activity"     icon="bi-person-badge-fill"   badge={security?.summary?.suspiciousLogins || 0} />
        <Tab id="integrity" label="Integrity Audit"    icon="bi-file-earmark-check"  badge={security?.summary?.integrityMismatches || 0} />
      </div>

      {/* ── TAB: Security Alerts ─────────────────────────────────────────────── */}
      {tab === 'threats' && (
        <div className="row g-3">
          <div className="col-lg-8">
            <div className="content-card">
              <div className="content-card-header">
                <h5><i className="bi bi-bell-fill me-2 text-danger" />Security Alerts</h5>
                <div className="btn-group btn-group-sm">
                  {['All', 'Active', 'Resolved'].map(f => (
                    <button key={f} className={`btn ${filter === f ? 'btn-primary' : 'btn-outline-secondary'}`}
                      style={{ fontSize: '0.77rem' }} onClick={() => setFilter(f)}>{f}</button>
                  ))}
                </div>
              </div>

              {alertsLoad ? (
                <div className="spinner-wrap">
                  <div className="spinner-border text-primary"><span className="visually-hidden">Loading…</span></div>
                  <span>Loading alerts…</span>
                </div>
              ) : alertsErr ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444', fontSize: '0.84rem' }}>
                  <i className="bi bi-exclamation-triangle-fill me-2" />{alertsErr}
                </div>
              ) : alertList.length === 0 ? (
                <EmptyState icon="bi-shield-check"
                  msg={alerts.length === 0 ? 'No threat alerts.' : `No ${filter.toLowerCase()} alerts.`}
                  sub="All systems clear." />
              ) : (
                <div className="table-responsive">
                  <table className="table mb-0">
                    <thead>
                      <tr><th>Type</th><th>Severity</th><th>Detail</th><th>Source IP</th><th>Time</th><th>Status</th><th>Action</th></tr>
                    </thead>
                    <tbody>
                      {alertList.map(a => {
                        const { cls, icon } = SEV[a.severity] || SEV.Low;
                        return (
                          <tr key={a.id}>
                            <td>
                              <div className="fw-semibold" style={{ fontSize: '0.83rem' }}>{a.type}</div>
                              {a.fileName && <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{a.fileName}</div>}
                              {a.userId   && <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>User: {a.userId}</div>}
                            </td>
                            <td><span className={cls}><i className={`bi ${icon} me-1`} />{a.severity}</span></td>
                            <td style={{ maxWidth: 240 }}><span style={{ fontSize: '0.78rem', color: '#475569' }}>{a.detail}</span></td>
                            <td><code style={{ fontSize: '0.77rem' }}>{a.sourceIp || '—'}</code></td>
                            <td><span style={{ fontSize: '0.78rem', color: '#64748b' }}>{fmtTs(a.createdAt)}</span></td>
                            <td>
                              {a.status === 'Active'
                                ? <span className="badge-danger"><i className="bi bi-circle-fill me-1" style={{ fontSize: '0.45rem' }} />Active</span>
                                : <span className="badge-ok"><i className="bi bi-check-circle-fill me-1" />Resolved</span>}
                            </td>
                            <td>
                              {a.status === 'Active'
                                ? <button className="btn btn-sm btn-outline-success" style={{ borderRadius: 7, fontSize: '0.77rem' }}
                                    disabled={resolving === a.id} onClick={() => handleResolve(a.id)}>
                                    {resolving === a.id
                                      ? <span className="spinner-border spinner-border-sm" />
                                      : <><i className="bi bi-check-lg me-1" />Resolve</>}
                                  </button>
                                : <span style={{ fontSize: '0.77rem', color: '#94a3b8' }}>—</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar: scanner status + severity breakdown */}
          <div className="col-lg-4">
            <div className="content-card mb-3">
              <div className="content-card-header">
                <h5><i className="bi bi-cpu-fill me-2 text-primary" />Scanner Status</h5>
                <span style={{ background: 'rgba(16,185,129,0.12)', color: '#059669', borderRadius: 20, padding: '3px 10px', fontSize: '0.72rem', fontWeight: 700 }}>
                  <i className="bi bi-circle-fill me-1" style={{ fontSize: '0.44rem' }} />Online
                </span>
              </div>
              <div style={{ padding: '1rem 1.25rem 1.25rem' }}>
                {[
                  { label: 'Encryption',    value: 'AES-256',   color: '#0D6EFD' },
                  { label: 'Integrity',     value: 'SHA-256',   color: '#0D6EFD' },
                  { label: 'Scanning Mode', value: 'Real-time', color: '#10b981' },
                  { label: 'Blockchain',    value: 'Fabric',    color: '#8b5cf6' },
                ].map(item => (
                  <div key={item.label} className="d-flex justify-content-between mb-3 pb-2" style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: '0.82rem', color: '#64748b' }}>{item.label}</span>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: item.color }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="content-card">
              <div className="content-card-header">
                <h5><i className="bi bi-bar-chart-fill me-2 text-primary" />Severity Breakdown</h5>
              </div>
              <div style={{ padding: '1rem 1.25rem 1.25rem' }}>
                {alertsLoad
                  ? <div className="text-center py-3"><span className="spinner-border spinner-border-sm text-secondary" /></div>
                  : alerts.length === 0
                    ? <div style={{ fontSize: '0.84rem', color: '#94a3b8', textAlign: 'center', padding: '1rem 0' }}>No alerts to display.</div>
                    : [{ label: 'High', color: '#ef4444' }, { label: 'Medium', color: '#f59e0b' }, { label: 'Low', color: '#10b981' }].map(t => {
                        const cnt = alerts.filter(a => a.severity === t.label).length;
                        const pct = total > 0 ? Math.round((cnt / total) * 100) : 0;
                        return (
                          <div key={t.label} className="mb-3">
                            <div className="d-flex justify-content-between mb-1">
                              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>{t.label}</span>
                              <span style={{ fontSize: '0.77rem', color: '#94a3b8' }}>{cnt} ({pct}%)</span>
                            </div>
                            <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ width: `${pct}%`, height: '100%', background: t.color, borderRadius: 3 }} />
                            </div>
                          </div>
                        );
                      })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: Login Activity ───────────────────────────────────────────────── */}
      {tab === 'login' && (
        <div className="content-card">
          <div className="content-card-header">
            <h5><i className="bi bi-person-badge-fill me-2 text-primary" />Login Activity Log</h5>
            <div className="btn-group btn-group-sm">
              {['All', 'SUCCESS', 'FAILED', 'Suspicious'].map(f => (
                <button key={f} className={`btn ${loginFilter === f ? 'btn-primary' : 'btn-outline-secondary'}`}
                  style={{ fontSize: '0.77rem' }} onClick={() => setLoginFilter(f)}>{f}</button>
              ))}
            </div>
          </div>

          {secLoad ? (
            <div className="spinner-wrap">
              <div className="spinner-border text-primary"><span className="visually-hidden">Loading…</span></div>
              <span>Loading login events…</span>
            </div>
          ) : secErr ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444', fontSize: '0.84rem' }}>
              <i className="bi bi-exclamation-triangle-fill me-2" />{secErr}
            </div>
          ) : loginList.length === 0 ? (
            <EmptyState icon="bi-person-check" msg="No login events recorded yet." sub="Events appear here after the first login attempt." />
          ) : (
            <>
              {/* Summary row */}
              <div className="d-flex gap-3 flex-wrap px-4 pt-3 pb-2">
                {[
                  { label: 'Total',       value: security?.summary?.totalLogins       ?? 0, color: '#0D6EFD' },
                  { label: 'Failed',      value: security?.summary?.failedLogins      ?? 0, color: '#ef4444' },
                  { label: 'Suspicious',  value: security?.summary?.suspiciousLogins  ?? 0, color: '#f59e0b' },
                ].map(s => (
                  <div key={s.label} style={{ background: '#f8faff', borderRadius: 10, padding: '0.5rem 1rem', border: '1px solid #e2e8f0', minWidth: 100 }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{s.label}</div>
                  </div>
                ))}
              </div>

              <div className="table-responsive">
                <table className="table mb-0">
                  <thead>
                    <tr>
                      <th>Account</th>
                      <th>IP Address</th>
                      <th>Result</th>
                      <th>Failed Attempts (window)</th>
                      <th>Suspicious</th>
                      <th>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loginList.map(e => (
                      <tr key={e.id} style={e.suspicious ? { background: 'rgba(245,158,11,0.05)' } : {}}>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: '0.84rem' }}>{e.userId}</div>
                        </td>
                        <td><code style={{ fontSize: '0.8rem', color: '#334155' }}>{e.ipAddress}</code></td>
                        <td>
                          {e.result === 'SUCCESS'
                            ? <span className="badge-ok"><i className="bi bi-check-circle-fill me-1" />Success</span>
                            : <span className="badge-danger"><i className="bi bi-x-circle-fill me-1" />Failed</span>}
                        </td>
                        <td>
                          <span style={{ fontSize: '0.82rem', color: e.failCount >= 10 ? '#ef4444' : e.failCount >= 5 ? '#f59e0b' : '#64748b', fontWeight: e.failCount >= 5 ? 700 : 400 }}>
                            {e.failCount}
                          </span>
                        </td>
                        <td>
                          {e.suspicious
                            ? <span className="badge-warn"><i className="bi bi-exclamation-triangle-fill me-1" />Suspicious</span>
                            : <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>—</span>}
                        </td>
                        <td><span style={{ fontSize: '0.78rem', color: '#64748b' }}>{fmtTs(e.timestamp)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── TAB: Integrity Audit ─────────────────────────────────────────────── */}
      {tab === 'integrity' && (
        <div className="content-card">
          <div className="content-card-header">
            <h5><i className="bi bi-file-earmark-check me-2 text-primary" />File Integrity Audit Trail</h5>
            <div className="btn-group btn-group-sm">
              {['All', 'MATCH', 'MISMATCH'].map(f => (
                <button key={f} className={`btn ${intFilter === f ? 'btn-primary' : 'btn-outline-secondary'}`}
                  style={{ fontSize: '0.77rem' }} onClick={() => setIntFilter(f)}>{f}</button>
              ))}
            </div>
          </div>

          {secLoad ? (
            <div className="spinner-wrap">
              <div className="spinner-border text-primary"><span className="visually-hidden">Loading…</span></div>
              <span>Loading audit trail…</span>
            </div>
          ) : secErr ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444', fontSize: '0.84rem' }}>
              <i className="bi bi-exclamation-triangle-fill me-2" />{secErr}
            </div>
          ) : auditList.length === 0 ? (
            <EmptyState icon="bi-shield-check"
              msg={rawAudit.length === 0 ? 'No integrity verifications recorded yet.' : `No ${intFilter} results.`}
              sub={rawAudit.length === 0 ? 'Events appear here after a file is verified.' : undefined} />
          ) : (
            <>
              {/* Summary */}
              <div className="d-flex gap-3 flex-wrap px-4 pt-3 pb-2">
                {[
                  { label: 'Total Verifications', value: rawAudit.length,                                      color: '#0D6EFD' },
                  { label: 'Match',               value: rawAudit.filter(e => e.result === 'MATCH').length,    color: '#10b981' },
                  { label: 'Mismatch',            value: security?.summary?.integrityMismatches ?? 0,          color: '#ef4444' },
                ].map(s => (
                  <div key={s.label} style={{ background: '#f8faff', borderRadius: 10, padding: '0.5rem 1rem', border: '1px solid #e2e8f0', minWidth: 120 }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{s.label}</div>
                  </div>
                ))}
              </div>

              <div className="table-responsive">
                <table className="table mb-0">
                  <thead>
                    <tr>
                      {/* SHA-256 column intentionally absent */}
                      <th>File</th>
                      <th>Owner / User</th>
                      <th>Result</th>
                      <th>Status</th>
                      <th>Source IP</th>
                      <th>Detail</th>
                      <th>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditList.map(e => (
                      <tr key={e.id} style={e.result === 'MISMATCH' ? { background: 'rgba(239,68,68,0.04)' } : {}}>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: '0.84rem' }}>{e.fileName || e.fileId}</div>
                          <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontFamily: 'monospace' }}>{e.fileId}</div>
                        </td>
                        <td><span style={{ fontSize: '0.83rem' }}>{e.userId || '—'}</span></td>
                        <td>
                          {e.result === 'MATCH'
                            ? <span className="badge-ok"><i className="bi bi-patch-check-fill me-1" />Match</span>
                            : <span className="badge-danger"><i className="bi bi-x-octagon-fill me-1" />Mismatch</span>}
                        </td>
                        <td>
                          {e.alertStatus === 'ALERT'
                            ? <span className="badge-danger"><i className="bi bi-shield-fill-exclamation me-1" />Alert</span>
                            : <span className="badge-ok"><i className="bi bi-info-circle-fill me-1" />Info</span>}
                        </td>
                        <td><code style={{ fontSize: '0.77rem' }}>{e.ipAddress || '—'}</code></td>
                        <td style={{ maxWidth: 220 }}><span style={{ fontSize: '0.77rem', color: '#475569' }}>{e.detail}</span></td>
                        <td><span style={{ fontSize: '0.77rem', color: '#64748b' }}>{fmtTs(e.createdAt)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
