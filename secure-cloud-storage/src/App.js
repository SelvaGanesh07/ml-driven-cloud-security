import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import Layout            from './components/Layout';
import Login             from './pages/Login';
import Dashboard         from './pages/Dashboard';
import Upload            from './pages/Upload';
import MyFiles           from './pages/MyFiles';
import BlockchainRecords from './pages/BlockchainRecords';
import ThreatDetection   from './pages/ThreatDetection';
import Settings          from './pages/Settings';

// ── Auth helpers ──────────────────────────────────────────────────────────────
const isLoggedIn  = () => !!localStorage.getItem('authToken');
const isAdmin     = () => localStorage.getItem('userRole') === 'admin';

/**
 * Protected route – redirects to login if no token exists.
 * Role check is a frontend convenience only; the backend always enforces roles.
 */
function Private({ children }) {
  return isLoggedIn() ? children : <Navigate to="/" replace />;
}

/**
 * Admin-only route.
 * Redirects unauthenticated users to / and non-admins to /dashboard.
 * Note: even if someone edits localStorage, the backend will return 403.
 */
function AdminOnly({ children }) {
  if (!isLoggedIn())   return <Navigate to="/"          replace />;
  if (!isAdmin())      return <Navigate to="/dashboard" replace />;
  return children;
}

function Page({ children }) {
  return <Private><Layout>{children}</Layout></Private>;
}

function AdminPage({ children }) {
  return <AdminOnly><Layout>{children}</Layout></AdminOnly>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Login />} />

        {/* Protected – all authenticated users */}
        <Route path="/dashboard"  element={<Page><Dashboard  /></Page>} />
        <Route path="/upload"     element={<Page><Upload     /></Page>} />
        <Route path="/files"      element={<Page><MyFiles    /></Page>} />
        <Route path="/settings"   element={<Page><Settings   /></Page>} />

        {/* Admin only */}
        <Route path="/blockchain" element={<AdminPage><BlockchainRecords /></AdminPage>} />
        <Route path="/threats"    element={<AdminPage><ThreatDetection   /></AdminPage>} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
