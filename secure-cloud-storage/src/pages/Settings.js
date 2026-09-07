import React, { useState } from 'react';

export default function Settings() {
  const userName = localStorage.getItem('userName') || 'User';
  const cap = (s) => s.charAt(0).toUpperCase()+s.slice(1);

  const [saved,   setSaved]   = useState(false);
  const [profile, setProfile] = useState({
    displayName: cap(userName),
    email:       `${userName}@securecloud.io`,
    role:        'Administrator',
  });
  const [prefs, setPrefs] = useState({
    emailAlerts:      true,
    threatNotif:      true,
    blockchainAlerts: false,
    autoScan:         true,
    twoFactor:        false,
    sessionTimeout:   '30',
  });

  const toggle = (k) => setPrefs(p=>({...p,[k]:!p[k]}));

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(()=>setSaved(false), 3000);
  };

  const ToggleRow = ({ k, label, desc }) => (
    <div className="d-flex justify-content-between align-items-start mb-3 pb-3" style={{borderBottom:'1px solid #f1f5f9'}}>
      <div>
        <div style={{fontWeight:600,fontSize:'0.875rem'}}>{label}</div>
        <div style={{fontSize:'0.77rem',color:'#64748b'}}>{desc}</div>
      </div>
      <div className="form-check form-switch ms-3 mt-1">
        <input className="form-check-input" type="checkbox" role="switch"
          checked={prefs[k]} onChange={()=>toggle(k)}
          style={{width:'2.2em',height:'1.2em',cursor:'pointer'}}/>
      </div>
    </div>
  );

  return (
    <div className="fade-in">
      <div className="page-header">
        <h3><i className="bi bi-gear-fill me-2 text-primary"/>Settings</h3>
        <p>Manage your account, security preferences and notification settings.</p>
      </div>

      {saved && (
        <div className="alert alert-success d-flex align-items-center gap-2 py-2 mb-3" role="alert">
          <i className="bi bi-check-circle-fill"/><span style={{fontSize:'0.875rem'}}>Settings saved successfully.</span>
        </div>
      )}

      <form onSubmit={handleSave}>
        <div className="row g-4">
          {/* Profile */}
          <div className="col-lg-6">
            <div className="content-card">
              <div className="content-card-header"><h5><i className="bi bi-person-fill me-2"/>Profile</h5></div>
              <div style={{padding:'1.5rem'}}>
                <div className="text-center mb-4">
                  <div style={{width:72,height:72,borderRadius:18,background:'linear-gradient(135deg,#0D6EFD,#06b6d4)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.8rem',fontWeight:800,margin:'0 auto 0.75rem'}}>
                    {profile.displayName.charAt(0)}
                  </div>
                  <button type="button" className="btn btn-sm btn-outline-primary" style={{borderRadius:8,fontSize:'0.8rem'}}>
                    <i className="bi bi-camera me-1"/>Change Avatar
                  </button>
                </div>
                {[
                  {label:'Display Name',key:'displayName',type:'text'},
                  {label:'Email',       key:'email',      type:'email'},
                  {label:'Role',        key:'role',       type:'text', ro:true},
                ].map(({label,key,type,ro})=>(
                  <div key={key} className="mb-3">
                    <label className="form-label fw-semibold" style={{fontSize:'0.82rem',color:'#374151'}}>{label}</label>
                    <input type={type} className="form-control" value={profile[key]} readOnly={ro}
                      onChange={(e)=>setProfile(p=>({...p,[key]:e.target.value}))}
                      style={{borderRadius:10,fontSize:'0.9rem',background:ro?'#f8fafc':undefined}}/>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Security */}
          <div className="col-lg-6">
            <div className="content-card mb-4">
              <div className="content-card-header"><h5><i className="bi bi-shield-lock-fill me-2"/>Security</h5></div>
              <div style={{padding:'1.25rem 1.5rem'}}>
                <ToggleRow k="twoFactor" label="2-Factor Authentication" desc="Add an extra layer of account security."/>
                <ToggleRow k="autoScan"  label="Auto Threat Scan"         desc="Automatically scan all uploads for threats."/>
                <div className="mb-3">
                  <label className="form-label fw-semibold" style={{fontSize:'0.82rem'}}>Session Timeout</label>
                  <select className="form-select" value={prefs.sessionTimeout}
                    onChange={(e)=>setPrefs(p=>({...p,sessionTimeout:e.target.value}))}
                    style={{borderRadius:10,fontSize:'0.9rem'}}>
                    {['15','30','60','120'].map(v=><option key={v} value={v}>{v} minutes</option>)}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold" style={{fontSize:'0.82rem'}}>Change Password</label>
                  <input type="password" className="form-control mb-2" placeholder="Current password" style={{borderRadius:10,fontSize:'0.9rem'}}/>
                  <input type="password" className="form-control" placeholder="New password" style={{borderRadius:10,fontSize:'0.9rem'}}/>
                </div>
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="col-lg-6">
            <div className="content-card">
              <div className="content-card-header"><h5><i className="bi bi-bell-fill me-2"/>Notifications</h5></div>
              <div style={{padding:'1.25rem 1.5rem'}}>
                <ToggleRow k="emailAlerts"      label="Email Alerts"        desc="Receive security alerts via email."/>
                <ToggleRow k="threatNotif"      label="Threat Notifications" desc="Get notified when threats are detected."/>
                <ToggleRow k="blockchainAlerts" label="Blockchain Updates"   desc="Alerts for new blockchain confirmations."/>
              </div>
            </div>
          </div>

          {/* Storage */}
          <div className="col-lg-6">
            <div className="content-card">
              <div className="content-card-header"><h5><i className="bi bi-hdd-fill me-2"/>Storage &amp; Data</h5></div>
              <div style={{padding:'1.25rem 1.5rem'}}>
                <div style={{background:'#f8faff',borderRadius:12,padding:'1rem',border:'1px solid #e2e8f0',marginBottom:'1rem'}}>
                  <div className="d-flex justify-content-between mb-2">
                    <span style={{fontSize:'0.84rem',fontWeight:600}}>Storage Used</span>
                    <span style={{fontSize:'0.84rem',color:'#0D6EFD',fontWeight:700}}>80 GB / 500 GB</span>
                  </div>
                  <div style={{height:8,background:'#e2e8f0',borderRadius:4,overflow:'hidden'}}>
                    <div style={{width:'16%',height:'100%',background:'linear-gradient(90deg,#0D6EFD,#06b6d4)',borderRadius:4}}/>
                  </div>
                  <div style={{fontSize:'0.74rem',color:'#94a3b8',marginTop:'0.4rem'}}>16% of quota used</div>
                </div>
                <button type="button" className="btn btn-outline-danger btn-sm w-100 mb-2" style={{borderRadius:10,fontSize:'0.84rem'}}>
                  <i className="bi bi-trash3 me-1"/>Clear Cache
                </button>
                <button type="button" className="btn btn-outline-secondary btn-sm w-100" style={{borderRadius:10,fontSize:'0.84rem'}}>
                  <i className="bi bi-download me-1"/>Export My Data
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Save */}
        <div className="d-flex justify-content-end gap-2 mt-4">
          <button type="button" className="btn btn-outline-secondary px-4" style={{borderRadius:10,fontWeight:600}}>Cancel</button>
          <button type="submit"  className="btn btn-primary px-4"           style={{borderRadius:10,fontWeight:700}}>
            <i className="bi bi-floppy-fill me-1"/>Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}
