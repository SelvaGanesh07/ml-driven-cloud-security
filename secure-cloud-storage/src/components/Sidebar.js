import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

// Navigation items split by the minimum role required to see them
const NAV_ALL = [
  { section: 'Main', links: [
    { to: '/dashboard', icon: 'bi-grid-1x2-fill',      label: 'Dashboard'    },
    { to: '/upload',    icon: 'bi-cloud-arrow-up-fill', label: 'Upload File'  },
    { to: '/files',     icon: 'bi-folder2-open',        label: 'My Files'     },
  ]},
  { section: 'Account', links: [
    { to: '/settings',  icon: 'bi-gear-fill',           label: 'Settings'     },
  ]},
];

const NAV_ADMIN = [
  { section: 'Admin', links: [
    { to: '/blockchain', icon: 'bi-link-45deg',        label: 'Blockchain Records' },
    { to: '/threats',    icon: 'bi-shield-exclamation', label: 'Security & Threats' },
  ]},
];

export default function Sidebar() {
  const navigate  = useNavigate();
  const isAdmin   = localStorage.getItem('userRole') === 'admin';
  const userName  = localStorage.getItem('userName')  || 'User';
  const userEmail = localStorage.getItem('userEmail') || '';

  const handleLogout = async () => {
    try { await authAPI.logout(); } catch {}
    localStorage.removeItem('authToken');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userRole');
    navigate('/');
  };

  const groups = isAdmin ? [...NAV_ALL, ...NAV_ADMIN] : NAV_ALL;

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="brand-icon">
          <i className="bi bi-shield-lock-fill" />
        </div>
        <div className="brand-name">
          SecureCloud
          <small>AI · Blockchain · Secure</small>
        </div>
      </div>

      {/* User chip */}
      <div style={{ padding: '0 1rem 0.75rem', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 10, padding: '0.55rem 0.75rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: isAdmin ? '#8b5cf6' : '#0D6EFD', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.77rem', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
            {userName.charAt(0).toUpperCase()}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userName}</div>
            <div style={{ fontSize: '0.68rem', color: isAdmin ? '#c4b5fd' : '#93c5fd', fontWeight: 600 }}>
              {isAdmin ? '⚙ Admin' : '👤 User'}
            </div>
          </div>
        </div>
      </div>

      {/* Nav groups */}
      <nav className="sidebar-nav">
        {groups.map((group) => (
          <div key={group.section}>
            <div className="nav-section-label">{group.section}</div>
            {group.links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) => `nav-link-item${isActive ? ' active' : ''}`}
              >
                <i className={`bi ${link.icon}`} />
                {link.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Logout */}
      <div className="sidebar-footer">
        <button className="nav-link-item w-100" style={{ color: '#f87171' }} onClick={handleLogout}>
          <i className="bi bi-box-arrow-left" style={{ color: '#f87171' }} />
          Logout
        </button>
      </div>
    </aside>
  );
}
