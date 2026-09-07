'use strict';
const path     = require('path');
const fs       = require('fs');
const Database = require('better-sqlite3');

const DB_PATH = path.resolve(__dirname, '..', process.env.DB_PATH || './data/storage.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

let _db = null;

function getDB() {
  if (!_db) throw new Error('Database not initialised. Call initDB() first.');
  return _db;
}

async function initDB() {
  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');

  // ── users ─────────────────────────────────────────────────────────────────
  // Passwords are NEVER stored in plain text – only bcrypt hashes.
  _db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id           TEXT PRIMARY KEY,
      email        TEXT NOT NULL UNIQUE,
      passwordHash TEXT NOT NULL,
      role         TEXT NOT NULL DEFAULT 'user',
      createdAt    TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // ── files ─────────────────────────────────────────────────────────────────
  _db.exec(`
    CREATE TABLE IF NOT EXISTS files (
      id            TEXT    PRIMARY KEY,
      fileName      TEXT    NOT NULL,
      originalName  TEXT    NOT NULL,
      owner         TEXT    NOT NULL,
      description   TEXT    DEFAULT '',
      mimeType      TEXT    NOT NULL,
      size          INTEGER NOT NULL,
      hash          TEXT    NOT NULL,
      encryptedPath TEXT    NOT NULL,
      ivHex         TEXT    NOT NULL,
      status        TEXT    DEFAULT 'Pending',
      uploadTime    TEXT    NOT NULL,
      createdAt     TEXT    NOT NULL DEFAULT (datetime('now')),
      deletedAt     TEXT    DEFAULT NULL
    );
  `);
  try { _db.exec(`ALTER TABLE files ADD COLUMN deletedAt TEXT DEFAULT NULL`); } catch (_) {}

  // ── blockchain_records ────────────────────────────────────────────────────
  _db.exec(`
    CREATE TABLE IF NOT EXISTS blockchain_records (
      id            TEXT    PRIMARY KEY,
      fileId        TEXT    NOT NULL REFERENCES files(id),
      txId          TEXT    NOT NULL,
      blockNumber   INTEGER NOT NULL,
      confirmations INTEGER DEFAULT 0,
      txStatus      TEXT    DEFAULT 'Pending',
      channel       TEXT    NOT NULL,
      createdAt     TEXT    NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // ── threat_alerts ─────────────────────────────────────────────────────────
  _db.exec(`
    CREATE TABLE IF NOT EXISTS threat_alerts (
      id         TEXT    PRIMARY KEY,
      fileId     TEXT    REFERENCES files(id),
      type       TEXT    NOT NULL,
      severity   TEXT    NOT NULL,
      status     TEXT    DEFAULT 'Active',
      detail     TEXT    DEFAULT '',
      sourceIp   TEXT    DEFAULT '',
      userId     TEXT    DEFAULT '',
      createdAt  TEXT    NOT NULL DEFAULT (datetime('now'))
    );
  `);
  for (const col of [
    `ALTER TABLE threat_alerts ADD COLUMN sourceIp TEXT DEFAULT ''`,
    `ALTER TABLE threat_alerts ADD COLUMN userId   TEXT DEFAULT ''`,
  ]) { try { _db.exec(col); } catch (_) {} }

  // ── login_events ──────────────────────────────────────────────────────────
  _db.exec(`
    CREATE TABLE IF NOT EXISTS login_events (
      id         TEXT    PRIMARY KEY,
      userId     TEXT    NOT NULL,
      ipAddress  TEXT    NOT NULL,
      timestamp  TEXT    NOT NULL,
      result     TEXT    NOT NULL,
      failCount  INTEGER DEFAULT 0,
      suspicious INTEGER DEFAULT 0,
      createdAt  TEXT    NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // ── audit_events ──────────────────────────────────────────────────────────
  _db.exec(`
    CREATE TABLE IF NOT EXISTS audit_events (
      id          TEXT PRIMARY KEY,
      eventType   TEXT NOT NULL,
      fileId      TEXT,
      fileName    TEXT DEFAULT '',
      userId      TEXT DEFAULT '',
      ipAddress   TEXT DEFAULT '',
      result      TEXT NOT NULL,
      alertStatus TEXT DEFAULT 'INFO',
      detail      TEXT DEFAULT '',
      createdAt   TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  return _db;
}

// ── User helpers ──────────────────────────────────────────────────────────────
function createUser({ id, email, passwordHash, role }) {
  getDB().prepare(`
    INSERT INTO users (id, email, passwordHash, role)
    VALUES (@id, @email, @passwordHash, @role)
  `).run({ id, email, passwordHash, role });
}

function findUserByEmail(email) {
  return getDB().prepare(`SELECT * FROM users WHERE email = ?`).get(email);
}

function getAllUsers() {
  // Never return the passwordHash to callers
  return getDB().prepare(
    `SELECT id, email, role, createdAt FROM users ORDER BY createdAt DESC`
  ).all();
}

// ── File helpers ──────────────────────────────────────────────────────────────
function insertFile(record) {
  getDB().prepare(`
    INSERT INTO files
      (id, fileName, originalName, owner, description, mimeType, size,
       hash, encryptedPath, ivHex, status, uploadTime, createdAt)
    VALUES
      (@id, @fileName, @originalName, @owner, @description, @mimeType, @size,
       @hash, @encryptedPath, @ivHex, @status, @uploadTime, @createdAt)
  `).run(record);
}

function getAllFiles() {
  return getDB().prepare(
    `SELECT * FROM files WHERE deletedAt IS NULL ORDER BY createdAt DESC`
  ).all();
}

function getFilesByOwner(email) {
  return getDB().prepare(
    `SELECT * FROM files WHERE owner = ? AND deletedAt IS NULL ORDER BY createdAt DESC`
  ).all(email);
}

function getFileById(id) {
  return getDB().prepare(`SELECT * FROM files WHERE id = ?`).get(id);
}

function updateFileStatus(id, status) {
  getDB().prepare(`UPDATE files SET status = ? WHERE id = ?`).run(status, id);
}

function softDeleteFile(id) {
  getDB()
    .prepare(`UPDATE files SET deletedAt = datetime('now'), status = 'Deleted' WHERE id = ?`)
    .run(id);
}

// ── Blockchain helpers ────────────────────────────────────────────────────────
function insertBlockchainRecord(record) {
  getDB().prepare(`
    INSERT INTO blockchain_records
      (id, fileId, txId, blockNumber, confirmations, txStatus, channel, createdAt)
    VALUES
      (@id, @fileId, @txId, @blockNumber, @confirmations, @txStatus, @channel, @createdAt)
  `).run(record);
}

function getBlockchainRecords() {
  return getDB().prepare(`
    SELECT br.*, f.originalName AS fileName, f.owner AS fileOwner
    FROM   blockchain_records br
    JOIN   files f ON f.id = br.fileId
    ORDER  BY br.createdAt DESC
  `).all();
}

function getBlockchainRecordsByOwner(email) {
  return getDB().prepare(`
    SELECT br.*, f.originalName AS fileName, f.owner AS fileOwner
    FROM   blockchain_records br
    JOIN   files f ON f.id = br.fileId
    WHERE  f.owner = ?
    ORDER  BY br.createdAt DESC
  `).all(email);
}

// ── Threat helpers ────────────────────────────────────────────────────────────
function insertThreatAlert(record) {
  getDB().prepare(`
    INSERT INTO threat_alerts (id, fileId, type, severity, status, detail, sourceIp, userId, createdAt)
    VALUES (@id, @fileId, @type, @severity, @status, @detail, @sourceIp, @userId, @createdAt)
  `).run({ sourceIp: '', userId: '', ...record });
}

function getThreatAlerts() {
  return getDB().prepare(`
    SELECT ta.*, f.originalName AS fileName
    FROM   threat_alerts ta
    LEFT JOIN files f ON f.id = ta.fileId
    ORDER  BY ta.createdAt DESC
  `).all();
}

function resolveThreatAlert(id) {
  getDB().prepare(`UPDATE threat_alerts SET status = 'Resolved' WHERE id = ?`).run(id);
}

// ── Login-event helpers ───────────────────────────────────────────────────────
function insertLoginEvent(record) {
  getDB().prepare(`
    INSERT INTO login_events (id, userId, ipAddress, timestamp, result, failCount, suspicious, createdAt)
    VALUES (@id, @userId, @ipAddress, @timestamp, @result, @failCount, @suspicious, @createdAt)
  `).run(record);
}

function countRecentFailures(userId, windowMs = 5 * 60 * 1000) {
  const since = new Date(Date.now() - windowMs).toISOString();
  return getDB().prepare(`
    SELECT COUNT(*) AS c FROM login_events
    WHERE userId = ? AND result = 'FAILED' AND timestamp >= ?
  `).get(userId, since).c;
}

function getLoginEvents({ limit = 200 } = {}) {
  return getDB().prepare(
    `SELECT * FROM login_events ORDER BY createdAt DESC LIMIT ?`
  ).all(limit);
}

// ── Audit-event helpers ───────────────────────────────────────────────────────
function insertAuditEvent(record) {
  getDB().prepare(`
    INSERT INTO audit_events
      (id, eventType, fileId, fileName, userId, ipAddress, result, alertStatus, detail, createdAt)
    VALUES
      (@id, @eventType, @fileId, @fileName, @userId, @ipAddress, @result, @alertStatus, @detail, @createdAt)
  `).run(record);
}

function getAuditEvents({ limit = 200 } = {}) {
  return getDB().prepare(
    `SELECT * FROM audit_events ORDER BY createdAt DESC LIMIT ?`
  ).all(limit);
}

module.exports = {
  initDB, getDB,
  // users
  createUser, findUserByEmail, getAllUsers,
  // files
  insertFile, getAllFiles, getFilesByOwner, getFileById, updateFileStatus, softDeleteFile,
  // blockchain
  insertBlockchainRecord, getBlockchainRecords, getBlockchainRecordsByOwner,
  // threats
  insertThreatAlert, getThreatAlerts, resolveThreatAlert,
  // login events
  insertLoginEvent, countRecentFailures, getLoginEvents,
  // audit events
  insertAuditEvent, getAuditEvents,
};
