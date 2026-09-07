'use strict';
const express  = require('express');
const crypto   = require('crypto');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { getBlockchainRecords, getBlockchainRecordsByOwner, getDB, getFileById } = require('../modules/database');
const { decryptFile } = require('../middleware/encryption');

const router = express.Router();

// ── GET /blockchain/records ───────────────────────────────────────────────────
// Admin sees all records; regular user sees only records for their own files.
// Hash columns are never included.
router.get('/records', requireAuth, (req, res, next) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const raw     = isAdmin
      ? getBlockchainRecords()
      : getBlockchainRecordsByOwner(req.user.email);

    const safe = raw.map(({ fileHash, hash, fileOwner, ...rest }) => rest); // eslint-disable-line no-unused-vars
    res.json({ success: true, records: safe });
  } catch (err) { next(err); }
});

// ── GET /blockchain/verify/:fileId ────────────────────────────────────────────
// Any authenticated user may verify their own files.
// Admin may verify any file.
// Hash values are NEVER included in the response.
router.get('/verify/:fileId', requireAuth, (req, res, next) => {
  try {
    const bcRecord = getDB()
      .prepare('SELECT * FROM blockchain_records WHERE fileId = ?')
      .get(req.params.fileId);

    if (!bcRecord) {
      return res.status(404).json({ verified: false, status: 'Integrity Mismatch', message: 'No blockchain record found for this file.' });
    }

    const fileRecord = getFileById(req.params.fileId);
    if (!fileRecord) {
      return res.status(404).json({ verified: false, status: 'Integrity Mismatch', message: 'File record not found.' });
    }

    // Ownership check
    if (req.user.role !== 'admin' && fileRecord.owner !== req.user.email) {
      return res.status(403).json({ verified: false, status: 'Forbidden', message: 'Access denied.' });
    }

    const plaintext   = decryptFile(fileRecord.encryptedPath, fileRecord.ivHex);
    const currentHash = crypto.createHash('sha256').update(plaintext).digest('hex');
    const match       = currentHash === fileRecord.hash;

    console.log(`[BLOCKCHAIN VERIFY] fileId=${fileRecord.id} user=${req.user.email} result=${match ? 'MATCH' : 'MISMATCH'}`);

    return res.json({
      verified:      match,
      status:        match ? 'Integrity Verified' : 'Integrity Mismatch',
      message:       match ? 'File integrity verified successfully.' : 'File integrity verification failed.',
      blockNumber:   bcRecord.blockNumber,
      txId:          bcRecord.txId,
      confirmations: bcRecord.confirmations,
      txStatus:      bcRecord.txStatus,
      channel:       bcRecord.channel,
    });
  } catch (err) { next(err); }
});

module.exports = router;
