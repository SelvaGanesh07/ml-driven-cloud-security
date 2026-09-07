import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

const ORBS = [
  { width:'320px', height:'320px', top:'-80px',   left:'-80px'   },
  { width:'260px', height:'260px', top:'10%',     right:'-90px'  },
  { width:'200px', height:'200px', bottom:'-60px',left:'20%'     },
  { width:'180px', height:'180px', top:'40%',     left:'-100px'  },
  { width:'240px', height:'240px', bottom:'8%',   right:'-70px'  },
];

export default function Login() {
  const navigate = useNavigate();

  // 'login' | 'register'
  const [tab,     setTab]     = useState('login');
  const [showPw,  setShowPw]  = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');

  const [loginForm, setLoginForm] = useState({ email: '', password: '', remember: false });
  const [regForm,   setRegForm]   = useState({ email: '', password: '', confirm: '' });

  const handleLoginChange = (e) => {
    const { name, value, type, checked } = e.target;
    setLoginForm(p => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleRegChange = (e) => {
    setRegForm(p => ({ ...p, [e.target.name]: e.target.value }));
  };

  // ── Login submit ────────────────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!loginForm.email || !loginForm.password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      const res = await authAPI.login({ email: loginForm.email, password: loginForm.password });
      const { token, user } = res.data;

      // Persist session – password is never stored
      localStorage.setItem('authToken', token);
      localStorage.setItem('userName',  user?.email?.split('@')[0] || loginForm.email.split('@')[0]);
      localStorage.setItem('userEmail', user?.email  || loginForm.email);
      localStorage.setItem('userRole',  user?.role   || 'user');
      if (loginForm.remember) localStorage.setItem('rememberEmail', loginForm.email);

      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Register submit ─────────────────────────────────────────────────────────
  const handleRegister = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!regForm.email || !regForm.password || !regForm.confirm) {
      setError('All fields are required.');
      return;
    }
    if (regForm.password !== regForm.confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (regForm.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      await authAPI.register({ email: regForm.email, password: regForm.password });
      setSuccess('Account created successfully. You can now log in.');
      setRegForm({ email: '', password: '', confirm: '' });
      setTab('login');
      setLoginForm(p => ({ ...p, email: regForm.email }));
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const switchTab = (t) => { setTab(t); setError(''); setSuccess(''); };

  return (
    <div className="login-bg">
      {ORBS.map((o, i) => <div key={i} className="login-orb" style={o} />)}

      <div className="login-card">
        {/* Logo */}
        <div className="login-logo"><i className="bi bi-shield-lock-fill" /></div>
        <h1 className="login-title">Secure Cloud Storage</h1>
        <p className="login-subtitle">AES-256 · Blockchain Verified · Threat Protected</p>

        {/* Tab switcher */}
        <div className="d-flex mb-4" style={{ background: '#f1f5f9', borderRadius: 10, padding: 4, gap: 4 }}>
          {[['login', 'Sign In', 'bi-box-arrow-in-right'], ['register', 'Create Account', 'bi-person-plus-fill']].map(([t, label, icon]) => (
            <button key={t} type="button"
              onClick={() => switchTab(t)}
              style={{
                flex: 1, border: 'none', borderRadius: 8, padding: '0.5rem 0.75rem',
                fontWeight: 700, fontSize: '0.84rem', cursor: 'pointer', transition: 'all 0.18s',
                background: tab === t ? '#fff' : 'transparent',
                color:      tab === t ? '#0D6EFD' : '#64748b',
                boxShadow:  tab === t ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
              }}>
              <i className={`bi ${icon} me-1`} />{label}
            </button>
          ))}
        </div>

        {/* Alerts */}
        {error && (
          <div className="alert alert-danger d-flex align-items-center gap-2 py-2 mb-3" role="alert">
            <i className="bi bi-exclamation-triangle-fill" />
            <span style={{ fontSize: '0.855rem' }}>{error}</span>
          </div>
        )}
        {success && (
          <div className="alert alert-success d-flex align-items-center gap-2 py-2 mb-3" role="alert">
            <i className="bi bi-check-circle-fill" />
            <span style={{ fontSize: '0.855rem' }}>{success}</span>
          </div>
        )}

        {/* ── LOGIN FORM ─────────────────────────────────────────────────────── */}
        {tab === 'login' && (
          <form onSubmit={handleLogin} noValidate>
            <div className="mb-3">
              <label className="form-label fw-semibold" style={{ fontSize: '0.84rem', color: '#374151' }}>Email Address</label>
              <div className="input-group">
                <span className="input-group-text input-addon"><i className="bi bi-envelope-fill text-primary" /></span>
                <input type="email" name="email" className="form-control input-field"
                  placeholder="you@example.com"
                  value={loginForm.email} onChange={handleLoginChange}
                  autoComplete="email" required />
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label fw-semibold" style={{ fontSize: '0.84rem', color: '#374151' }}>Password</label>
              <div className="input-group">
                <span className="input-group-text input-addon"><i className="bi bi-lock-fill text-primary" /></span>
                <input type={showPw ? 'text' : 'password'} name="password" className="form-control input-field"
                  placeholder="Enter your password"
                  value={loginForm.password} onChange={handleLoginChange}
                  autoComplete="current-password" required />
                <button type="button" className="input-group-text input-addon"
                  style={{ borderLeft: 'none', cursor: 'pointer' }}
                  onClick={() => setShowPw(v => !v)}
                  aria-label={showPw ? 'Hide password' : 'Show password'}>
                  <i className={`bi ${showPw ? 'bi-eye-slash-fill' : 'bi-eye-fill'} text-secondary`} />
                </button>
              </div>
            </div>

            <div className="d-flex align-items-center justify-content-between mb-4">
              <div className="form-check mb-0">
                <input className="form-check-input" type="checkbox" id="remember"
                  name="remember" checked={loginForm.remember} onChange={handleLoginChange} />
                <label className="form-check-label" htmlFor="remember"
                  style={{ fontSize: '0.84rem', color: '#374151', cursor: 'pointer' }}>Remember Me</label>
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-login w-100" disabled={loading}>
              {loading
                ? <span className="d-flex align-items-center justify-content-center gap-2"><span className="spinner-border spinner-border-sm" />Authenticating…</span>
                : <span className="d-flex align-items-center justify-content-center gap-2"><i className="bi bi-box-arrow-in-right" />Sign In</span>}
            </button>
          </form>
        )}

        {/* ── REGISTER FORM ──────────────────────────────────────────────────── */}
        {tab === 'register' && (
          <form onSubmit={handleRegister} noValidate>
            <div className="mb-3">
              <label className="form-label fw-semibold" style={{ fontSize: '0.84rem', color: '#374151' }}>Email Address</label>
              <div className="input-group">
                <span className="input-group-text input-addon"><i className="bi bi-envelope-fill text-primary" /></span>
                <input type="email" name="email" className="form-control input-field"
                  placeholder="you@example.com"
                  value={regForm.email} onChange={handleRegChange}
                  autoComplete="email" required />
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label fw-semibold" style={{ fontSize: '0.84rem', color: '#374151' }}>Password <span style={{ fontSize: '0.77rem', color: '#94a3b8', fontWeight: 400 }}>(min. 8 characters)</span></label>
              <div className="input-group">
                <span className="input-group-text input-addon"><i className="bi bi-lock-fill text-primary" /></span>
                <input type={showPw ? 'text' : 'password'} name="password" className="form-control input-field"
                  placeholder="Choose a password"
                  value={regForm.password} onChange={handleRegChange}
                  autoComplete="new-password" required />
                <button type="button" className="input-group-text input-addon"
                  style={{ borderLeft: 'none', cursor: 'pointer' }}
                  onClick={() => setShowPw(v => !v)}
                  aria-label={showPw ? 'Hide password' : 'Show password'}>
                  <i className={`bi ${showPw ? 'bi-eye-slash-fill' : 'bi-eye-fill'} text-secondary`} />
                </button>
              </div>
            </div>

            <div className="mb-4">
              <label className="form-label fw-semibold" style={{ fontSize: '0.84rem', color: '#374151' }}>Confirm Password</label>
              <div className="input-group">
                <span className="input-group-text input-addon"><i className="bi bi-lock-fill text-primary" /></span>
                <input type={showPw ? 'text' : 'password'} name="confirm" className="form-control input-field"
                  placeholder="Repeat your password"
                  value={regForm.confirm} onChange={handleRegChange}
                  autoComplete="new-password" required />
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-login w-100" disabled={loading}>
              {loading
                ? <span className="d-flex align-items-center justify-content-center gap-2"><span className="spinner-border spinner-border-sm" />Creating Account…</span>
                : <span className="d-flex align-items-center justify-content-center gap-2"><i className="bi bi-person-plus-fill" />Create Account</span>}
            </button>

            <p style={{ fontSize: '0.78rem', color: '#94a3b8', textAlign: 'center', marginTop: '0.75rem', marginBottom: 0 }}>
              New accounts are created with <strong>User</strong> role.<br />
              Admins are created separately by the system administrator.
            </p>
          </form>
        )}

        {/* Security badges */}
        <div className="d-flex justify-content-center gap-3 mt-4">
          {[
            { icon: 'bi-shield-check', label: 'SSL Secured' },
            { icon: 'bi-lock',         label: 'AES-256'     },
            { icon: 'bi-link-45deg',   label: 'Blockchain'  },
          ].map((b) => (
            <div key={b.label} className="sec-badge">
              <i className={`bi ${b.icon} text-primary`} style={{ fontSize: '0.9rem' }} />
              {b.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
