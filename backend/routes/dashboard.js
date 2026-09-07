'use strict';
const express = require('express');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { getDB, getLoginEvents, getAuditEvents, getAllUsers } = require('../modules/database');
const router = express.Router();

// ── GET /dashboard/stats ──────────────────────────────────────────────────────
// Admin → system-wide counts.
// Regular user → counts scoped to their own files only.
router.get('/stats', requireAuth, (req, res, next) => {
  try {
    const db      = getDB();
    const isAdmin = req.user.role === 'admin';
    const email   = req.user.email;
    const today   = new Date().toISOString().slice(0, 10);

    let totalFiles, uploadedToday, blockchainCount, threatAlerts;

    if (isAdmin) {
      totalFiles      = db.prepare(`SELECT COUNT(*) AS c FROM files WHERE deletedAt IS NULL`).get().c;
      uploadedToday   = db.prepare(`SELECT COUNT(*) AS c FROM files WHERE uploadTime LIKE ? AND deletedAt IS NULL`).get(`${today}%`).c;
      blockchainCount = db.prepare(`SELECT COUNT(*) AS c FROM blockchain_records`).get().c;
      threatAlerts    = db.prepare(`SELECT COUNT(*) AS c FROM threat_alerts WHERE status = 'Active'`).get().c;
    } else {
      totalFiles      = db.prepare(`SELECT COUNT(*) AS c FROM files WHERE owner = ? AND deletedAt IS NULL`).get(email).c;
      uploadedToday   = db.prepare(`SELECT COUNT(*) AS c FROM files WHERE owner = ? AND uploadTime LIKE ? AND deletedAt IS NULL`).get(email, `${today}%`).c;
      blockchainCount = db.prepare(`SELECT COUNT(*) AS c FROM blockchain_records br JOIN files f ON f.id = br.fileId WHERE f.owner = ?`).get(email).c;
      threatAlerts    = db.prepare(`SELECT COUNT(*) AS c FROM threat_alerts WHERE userId = ? AND status = 'Active'`).get(email).c;
    }

    res.json({ success: true, stats: { totalFiles, uploadedToday, blockchainRecords: blockchainCount, threatAlerts } });
  } catch (err) { next(err); }
});

// ── GET /dashboard/security – ADMIN ONLY ─────────────────────────────────────
// Returns login events, integrity audit events, user list, and summary counts.
// SHA-256 hash values are intentionally excluded from every row.
router.get('/security', requireAuth, requireAdmin, (req, res, next) => {
  try {
    const db          = getDB();
    const loginEvents = getLoginEvents({ limit: 200 });
    const auditEvents = getAuditEvents({ limit: 200 });
    const users       = getAllUsers();   // passwordHash never included

    const totalLogins         = loginEvents.length;
    const failedLogins        = loginEvents.filter(e => e.result === 'FAILED').length;
    const suspiciousLogins    = loginEvents.filter(e => e.suspicious === 1).length;
    const integrityMismatches = auditEvents.filter(e => e.result === 'MISMATCH').length;
    const activeThreatAlerts  = db.prepare(`SELECT COUNT(*) AS c FROM threat_alerts WHERE status = 'Active'`).get().c;

    res.json({
      success: true,
      summary: { totalLogins, failedLogins, suspiciousLogins, integrityMismatches, activeThreatAlerts },
      loginEvents,
      auditEvents,
      users,
    });
  } catch (err) { next(err); }
});

module.exports = router;
