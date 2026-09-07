'use strict';
const express  = require('express');
const path     = require('path');
const { v4: uuidv4 } = require('uuid');
const { requireAuth }        = require('../middleware/auth');
const { uploadSingle }       = require('../middleware/multerConfig');
const { encryptFile }        = require('../middleware/encryption');
const { scanFile }           = require('../modules/threatScanner');
const { anchorToBlockchain } = require('../modules/blockchain');
const { insertFile, insertThreatAlert, updateFileStatus } = require('../modules/database');

const router = express.Router();

/**
 * POST /upload
 * Requires: valid JWT (any role).
 *
 * The authenticated user's email is used as the owner.
 * The body may optionally include a description.
 * hash is NEVER included in the response.
 */
router.post('/upload', requireAuth, uploadSingle, async (req, res, next) => {
  if (!req.file) {
    const err = new Error('No file received. Use field name "file" in your multipart request.');
    err.status = 400;
    return next(err);
  }

  // Owner is taken from the verified JWT – never from the request body
  const owner       = req.user.email;
  const description = (req.body.description || '').trim();

  const { path: filePath, originalname, mimetype, size } = req.file;

  try {
    // ── Threat Scan ────────────────────────────────────────────────────────
    console.log(`[SCAN] Scanning "${originalname}" (${size} bytes)…`);
    const scan = scanFile(filePath, originalname);
    console.log(`[SCAN] Result: ${scan.severity} – safe=${scan.safe} entropy=${scan.entropy} time=${scan.scanTimeMs}ms`);
    if (scan.threats.length) console.log(`[SCAN] Threats:`, scan.threats);

    // ── AES-256-CBC Encryption ─────────────────────────────────────────────
    console.log(`[ENC]  Encrypting "${originalname}"…`);
    const { encryptedPath, ivHex, hash } = encryptFile(filePath);
    const encFileName = path.basename(encryptedPath);
    console.log(`[ENC]  Done. Integrity value stored internally.`);

    // ── Persist to SQLite ──────────────────────────────────────────────────
    const fileId     = uuidv4();
    const uploadTime = new Date().toISOString();

    insertFile({
      id:           fileId,
      fileName:     encFileName,
      originalName: originalname,
      owner,
      description,
      mimeType:     mimetype,
      size,
      hash,           // stored server-side only – never sent to client
      encryptedPath,
      ivHex,
      status:       scan.safe ? 'Verified' : 'Alert',
      uploadTime,
      createdAt:    uploadTime,
    });

    if (!scan.safe) {
      insertThreatAlert({
        id:        uuidv4(),
        fileId,
        type:      scan.threats[0] || 'Unknown',
        severity:  scan.severity,
        status:    'Active',
        detail:    scan.threats.join('; '),
        userId:    owner,
        createdAt: uploadTime,
      });
    }

    // ── Anchor on Blockchain ───────────────────────────────────────────────
    console.log(`[CHAIN] Anchoring "${originalname}"…`);
    const bc = await anchorToBlockchain({
      recordId:  uuidv4(),
      fileId,
      hash,       // used internally – never leaves the backend
      owner,
      fileName:  originalname,
      uploadTime,
    });

    updateFileStatus(fileId, scan.safe ? 'Verified' : 'Alert');
    console.log(`[UPLOAD] ✓ "${originalname}" uploaded (fileId: ${fileId})`);

    // ── Response – hash intentionally omitted ──────────────────────────────
    return res.status(201).json({
      success:     true,
      message:     'File uploaded, encrypted and anchored to blockchain.',
      fileId,
      fileName:    originalname,
      encFileName,
      uploadTime:  new Date(uploadTime).toLocaleString(),
      size,
      owner,
      description,
      mimeType:    mimetype,
      txId:        bc.txId,
      txStatus:    bc.txStatus,
      blockNumber: bc.blockNumber,
      channel:     bc.channel,
      threatScan: {
        safe:       scan.safe,
        severity:   scan.severity,
        entropy:    scan.entropy,
        threats:    scan.threats,
        scanTimeMs: scan.scanTimeMs,
      },
    });
  } catch (err) {
    try {
      const fs = require('fs');
      if (fs.existsSync(filePath))          fs.unlinkSync(filePath);
      if (fs.existsSync(filePath + '.enc')) fs.unlinkSync(filePath + '.enc');
    } catch {}
    if (!err.status) err.status = 500;
    next(err);
  }
});

module.exports = router;
