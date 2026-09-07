'use strict';
/**
 * Authentication / Authorization middleware.
 *
 * requireAuth  – verifies the JWT in the Authorization header.
 *                Attaches req.user = { id, email, role } on success.
 *                Returns 401 if missing / invalid / expired.
 *
 * requireAdmin – must be used AFTER requireAuth.
 *                Returns 403 if the authenticated user is not an admin.
 *                Role is checked from the signed JWT – not from a client header.
 */
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-production';

function requireAuth(req, res, next) {
  const header = req.headers['authorization'] || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { id: payload.id, email: payload.email, role: payload.role };
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token. Please log in again.' });
  }
}

function requireAdmin(req, res, next) {
  // requireAuth must have run first so req.user is populated
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required.' });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
