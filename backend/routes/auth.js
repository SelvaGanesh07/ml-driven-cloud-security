'use strict';
const express  = require('express');
const bcrypt   = require('bcrypt');
const jwt      = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const {
  createUser, findUserByEmail,
  insertLoginEvent, countRecentFailures, insertThreatAlert,
} = require('../modules/database');

const router = express.Router();

// ── Config ────────────────────────────────────────────────────────────────────
const JWT_SECRET      = process.env.JWT_SECRET      || 'change-this-secret-in-production';
const JWT_EXPIRES_IN  = process.env.JWT_EXPIRES_IN  || '8h';
const BCRYPT_ROUNDS   = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
const FAIL_WINDOW_MS  = parseInt(process.env.LOGIN_FAIL_WINDOW_MS || String(5 * 60 * 1000), 10);
const FAIL_THRESHOLD  = parseInt(process.env.LOGIN_FAIL_THRESHOLD || '5', 10);

/** Extract real client IP (Cloudflare Tunnel / reverse-proxy aware). */
function getClientIp(req) {
  return (
    req.headers['cf-connecting-ip'] ||
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

// ── POST /auth/register ───────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, message: 'Invalid email address.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
  }

  const normalised = email.trim().toLowerCase();

  // Check for existing account
  const existing = findUserByEmail(normalised);
  if (existing) {
    return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
  }

  // Hash the password – never store plain text
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  // Only allow 'admin' role if explicitly set AND the request comes from the
  // first registered user (no other users exist yet) or via env-seeded admin.
  // This prevents a normal user from self-assigning admin.
  const assignedRole = 'user'; // always 'user' via self-registration

  createUser({ id: uuidv4(), email: normalised, passwordHash, role: assignedRole });

  console.log(`[AUTH] Registered new user: "${normalised}" role=${assignedRole}`);

  return res.status(201).json({
    success: true,
    message: 'Account created successfully. You can now log in.',
  });
});

// ── POST /auth/login ──────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const ip        = getClientIp(req);
  const timestamp = new Date().toISOString();

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  const userId = (email || '').trim().toLowerCase();

  // Look up the account
  const user = findUserByEmail(userId);

  if (!user) {
    // Record the failed attempt (unknown email)
    const failCount  = countRecentFailures(userId, FAIL_WINDOW_MS) + 1;
    const suspicious = failCount >= FAIL_THRESHOLD ? 1 : 0;
    insertLoginEvent({ id: uuidv4(), userId, ipAddress: ip, timestamp, result: 'FAILED', failCount, suspicious, createdAt: timestamp });
    console.log(`[AUTH] FAILED login (unknown account) – user="${userId}" ip=${ip}`);
    // Return the same message as a wrong password to prevent account enumeration
    return res.status(401).json({ success: false, message: 'Invalid email or password.' });
  }

  // Verify password with bcrypt
  const match = await bcrypt.compare(password, user.passwordHash);

  if (!match) {
    const failCount  = countRecentFailures(userId, FAIL_WINDOW_MS) + 1;
    const suspicious = failCount >= FAIL_THRESHOLD ? 1 : 0;

    insertLoginEvent({ id: uuidv4(), userId, ipAddress: ip, timestamp, result: 'FAILED', failCount, suspicious, createdAt: timestamp });
    console.log(`[AUTH] FAILED login – user="${userId}" ip=${ip} failCount=${failCount}${suspicious ? ' ⚠ SUSPICIOUS' : ''}`);

    // Create threat alert at first threshold crossing
    if (suspicious && failCount === FAIL_THRESHOLD) {
      try {
        insertThreatAlert({
          id:        uuidv4(),
          fileId:    null,
          type:      'Suspicious Login Activity',
          severity:  'High',
          status:    'Active',
          detail:    `${failCount} failed login attempts within ${FAIL_WINDOW_MS / 60000} minutes for account "${userId}" from IP ${ip}.`,
          sourceIp:  ip,
          userId,
          createdAt: timestamp,
        });
        console.log(`[AUTH] ⚠  Suspicious login alert created for "${userId}" from ${ip}`);
      } catch (err) {
        console.error('[AUTH] Could not insert threat alert:', err.message);
      }
    }

    return res.status(401).json({ success: false, message: 'Invalid email or password.' });
  }

  // ── SUCCESS ───────────────────────────────────────────────────────────────
  const failCount = countRecentFailures(userId, FAIL_WINDOW_MS);
  insertLoginEvent({ id: uuidv4(), userId, ipAddress: ip, timestamp, result: 'SUCCESS', failCount, suspicious: 0, createdAt: timestamp });
  console.log(`[AUTH] SUCCESS login – user="${userId}" role=${user.role} ip=${ip}`);

  // Sign a JWT – role is embedded in the token so it cannot be forged by the client
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  return res.json({
    success: true,
    token,
    user: { email: user.email, role: user.role },
  });
});

// ── POST /auth/logout ─────────────────────────────────────────────────────────
// Stateless JWT – client just discards the token.
router.post('/logout', (_req, res) => {
  res.json({ success: true, message: 'Logged out.' });
});

module.exports = router;
