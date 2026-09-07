'use strict';
const express  = require('express');
const fs       = require('fs');
const crypto   = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { getAllFiles, getFilesByOwner, getFileById, insertAuditEvent } = require('../modules/database');
const { decryptFile } = require('../middleware/encryption');

const router = express.Router();

/** Extract real client IP (Cloudflare Tunnel / reverse-proxy aware). */
function getClientIp(req) {
  return (
    req.headers['cf-connecting-ip'] ||
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

// ── GET /test – file list scoped to the authenticated user ────────────────────
// Admin sees ALL files; a regular user sees only their own.
router.get('/test', requireAuth, (req, res, next) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const rows    = isAdmin ? getAllFiles() : getFilesByOwner(req.user.email);
    const mapped  = rows.map(f => ({
      _id:       f.id,
      fileName:  f.originalName,
      owner:     f.owner,
      // hash intentionally omitted
      timestamp: f.uploadTime,
      size:      f.size,
      mimeType:  f.mimeType,
      status:    f.status,
    }));
    res.json({ success: true, files: mapped });
  } catch (err) { next(err); }
});

// ── POST /files/:id/verify ────────────────────────────────────────────────────
// Any authenticated user may verify their own files.
// Admin may verify any file.
// Hash is NEVER exposed in the response or audit record.
router.post('/files/:id/verify', requireAuth, (req, res, next) => {
  const ip        = getClientIp(req);
  const timestamp = new Date().toISOString();

  try {
    const record = getFileById(req.params.id);
    if (!record) {
      return res.status(404).json({ verified: false, status: 'Not Found', message: 'File not found.', timestamp });
    }

    // Ownership check: regular users can only verify their own files
    if (req.user.role !== 'admin' && record.owner !== req.user.email) {
      return res.status(403).json({ verified: false, status: 'Forbidden', message: 'You do not have permission to verify this file.', timestamp });
    }

    const plaintext   = decryptFile(record.encryptedPath, record.ivHex);
    const currentHash = crypto.createHash('sha256').update(plaintext).digest('hex');
    const match       = currentHash === record.hash;

    console.log(`[VERIFY] fileId=${record.id} file="${record.originalName}" user=${req.user.email} ip=${ip} result=${match ? 'MATCH' : 'MISMATCH'}`);

    // Persist audit event – hash value intentionally excluded
    insertAuditEvent({
      id:          uuidv4(),
      eventType:   match ? 'FILE_INTEGRITY_MATCH' : 'FILE_INTEGRITY_MISMATCH',
      fileId:      record.id,
      fileName:    record.originalName,
      userId:      req.user.email,
      ipAddress:   ip,
      result:      match ? 'MATCH' : 'MISMATCH',
      alertStatus: match ? 'INFO' : 'ALERT',
      detail:      match
        ? `Integrity verified for "${record.originalName}".`
        : `File content differs from the trusted blockchain record for "${record.originalName}". Possible unauthorised modification.`,
      createdAt:   timestamp,
    });

    if (match) {
      return res.json({ verified: true,  status: 'Integrity Verified', message: 'File integrity verified successfully.', fileName: record.originalName, timestamp });
    }
    return res.json({
      verified:       false,
      status:         'Integrity Mismatch',
      message:        'This file has been modified since its original registration.',
      fileName:       record.originalName,
      timestamp,
      recommendation: 'Contact your administrator to investigate this file.',
    });
  } catch (err) { next(err); }
});

// ── GET /files/:id/download ───────────────────────────────────────────────────
router.get('/files/:id/download', requireAuth, (req, res, next) => {
  try {
    const record = getFileById(req.params.id);
    if (!record) { const e = new Error('File not found.'); e.status = 404; return next(e); }
    if (req.user.role !== 'admin' && record.owner !== req.user.email) {
      const e = new Error('Access denied.'); e.status = 403; return next(e);
    }
    const plaintext = decryptFile(record.encryptedPath, record.ivHex);
    res.set({
      'Content-Type':        record.mimeType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${record.originalName}"`,
      'Content-Length':      plaintext.length,
    });
    res.send(plaintext);
  } catch (err) { next(err); }
});

// ── DELETE /files/:id ─────────────────────────────────────────────────────────
router.delete('/files/:id', requireAuth, (req, res, next) => {
  try {
    const record = getFileById(req.params.id);
    if (!record) { const e = new Error('File not found.'); e.status = 404; return next(e); }
    if (req.user.role !== 'admin' && record.owner !== req.user.email) {
      const e = new Error('Access denied.'); e.status = 403; return next(e);
    }
    if (fs.existsSync(record.encryptedPath)) fs.unlinkSync(record.encryptedPath);
    require('../modules/database').getDB()
      .prepare('DELETE FROM files WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'File deleted.' });
  } catch (err) { next(err); }
});

module.exports = router;
