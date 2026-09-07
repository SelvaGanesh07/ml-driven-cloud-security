'use strict';
const express = require('express');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { getThreatAlerts, resolveThreatAlert, getLoginEvents, getAuditEvents } = require('../modules/database');
const router = express.Router();

// All threat/security routes are ADMIN ONLY.
// requireAuth verifies the JWT; requireAdmin checks role === 'admin'.
router.use(requireAuth, requireAdmin);

// GET /threats/alerts
router.get('/alerts', (_req, res, next) => {
  try { res.json({ success: true, alerts: getThreatAlerts() }); }
  catch (err) { next(err); }
});

// PATCH /threats/alerts/:id/resolve
router.patch('/alerts/:id/resolve', (req, res, next) => {
  try { resolveThreatAlert(req.params.id); res.json({ success: true, message: 'Alert resolved.' }); }
  catch (err) { next(err); }
});

// GET /threats/login-events
router.get('/login-events', (_req, res, next) => {
  try { res.json({ success: true, events: getLoginEvents({ limit: 200 }) }); }
  catch (err) { next(err); }
});

// GET /threats/audit-events
router.get('/audit-events', (_req, res, next) => {
  try { res.json({ success: true, events: getAuditEvents({ limit: 200 }) }); }
  catch (err) { next(err); }
});

module.exports = router;
