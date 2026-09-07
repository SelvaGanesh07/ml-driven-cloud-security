import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Navbar() {
  const navigate = useNavigate();
  const userName  = localStorage.getItem('userName') || 'User';
  const initials  = userName.slice(0, 2).toUpperCase();
  const [open, setOpen] = useState(false);

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userName');
    navigate('/');
  };

  return (
    <header className="top-navbar">
      {/* Left – project title */}
      <div className="nav-project-title">
        <strong>AI-Driven Secure Cloud Storage System</strong>
        Blockchain Integrity Verification · Intelligent Threat Detection
      </div>

      {/* Right – icons */}
      <div className="d-flex align-items-center gap-2">
        <button className="icon-btn" title="Search" aria-label="Search">
          <i className="bi bi-search" />
        </button>

        <button className="icon-btn" title="Notifications" aria-label="Notifications">
          <i className="bi bi-bell-fill" />
          <span className="notif-dot" />
        </button>

        {/* Avatar + dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            className="avatar-btn"
            onClick={() => setOpen((v) => !v)}
            aria-label="User menu"
            title={`Signed in as ${userName}`}
          >
            {initials}
          </button>

          {open && (
            <>
              {/* click-away */}
              <div
                style={{ position:'fixed', inset:0, zIndex:1999 }}
                onClick={() => setOpen(false)}
              />
              <div className="dropdown-menu-custom">
                <div style={{ padding:'0.25rem 0.5rem 0.5rem' }}>
                  <div style={{ fontWeight:700, fontSize:'0.855rem' }}>{userName}</div>
                  <div style={{ fontSize:'0.74rem', color:'#94a3b8' }}>Administrator</div>
                </div>
                <hr style={{ margin:'0.4rem 0', borderColor:'#f1f5f9' }} />
                {[
                  { icon:'bi-person-fill',    label:'My Profile'    },
                  { icon:'bi-gear-fill',       label:'Settings'      },
                  { icon:'bi-question-circle', label:'Help & Support' },
                ].map((item) => (
                  <button
                    key={item.label}
                    className="dropdown-item-custom"
                    onClick={() => setOpen(false)}
                  >
                    <i className={`bi ${item.icon} text-primary`} style={{ width:'18px' }} />
                    {item.label}
                  </button>
                ))}
                <hr style={{ margin:'0.4rem 0', borderColor:'#f1f5f9' }} />
                <button
                  className="dropdown-item-custom"
                  style={{ color:'#ef4444' }}
                  onClick={logout}
                >
                  <i className="bi bi-box-arrow-right" style={{ color:'#ef4444', width:'18px' }} />
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
