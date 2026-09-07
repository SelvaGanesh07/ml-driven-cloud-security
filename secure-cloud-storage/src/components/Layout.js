import React from 'react';
import Sidebar from './Sidebar';
import Navbar  from './Navbar';

export default function Layout({ children }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Navbar />
        <main className="main-content">{children}</main>
      </div>
    </div>
  );
}
