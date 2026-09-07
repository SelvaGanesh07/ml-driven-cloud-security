'use strict';
/**
 * AES-256-CBC encryption / decryption module.
 *
 * Every uploaded file is:
 *   1. Read from disk (written there by multer)
 *   2. Encrypted with AES-256-CBC using a random IV per file
 *   3. Written back as a .enc file
 *   4. Original plaintext file is securely deleted
 *
 * The IV is stored in hex in the database so decryption is always possible.
 */
const crypto = require('crypto');
const fs     = require('fs');
const path   = require('path');

const KEY_HEX    = process.env.AES_SECRET_KEY || '';
const IV_LENGTH  = parseInt(process.env.AES_IV_LENGTH || '16', 10);
const ALGORITHM  = 'aes-256-cbc';

function getKey() {
  if (!KEY_HEX || KEY_HEX.length < 64) {
    throw new Error(
      'AES_SECRET_KEY is missing or too short in .env. ' +
      'It must be a 64-character hex string (32 bytes).'
    );
  }
  return Buffer.from(KEY_HEX.slice(0, 64), 'hex');
}

/**
 * Compute SHA-256 hash of a file buffer.
 * @param {Buffer} buffer
 * @returns {string} hex digest
 */
function computeSHA256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Encrypt a file on disk with AES-256-CBC.
 * Returns { encryptedPath, ivHex, hash } and deletes the original.
 *
 * @param {string} filePath  – path written by multer
 * @returns {{ encryptedPath: string, ivHex: string, hash: string }}
 */
function encryptFile(filePath) {
  const key        = getKey();
  const iv         = crypto.randomBytes(IV_LENGTH);
  const plaintext  = fs.readFileSync(filePath);
  const hash       = computeSHA256(plaintext);

  const cipher     = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted  = Buffer.concat([cipher.update(plaintext), cipher.final()]);

  const encPath    = filePath + '.enc';
  fs.writeFileSync(encPath, encrypted);

  // Securely remove the plaintext copy
  fs.unlinkSync(filePath);

  return {
    encryptedPath: encPath,
    ivHex:         iv.toString('hex'),
    hash,
  };
}

/**
 * Decrypt an encrypted file back to a Buffer (for serving downloads).
 *
 * @param {string} encryptedPath
 * @param {string} ivHex
 * @returns {Buffer} plaintext
 */
function decryptFile(encryptedPath, ivHex) {
  const key       = getKey();
  const iv        = Buffer.from(ivHex, 'hex');
  const encrypted = fs.readFileSync(encryptedPath);
  const decipher  = crypto.createDecipheriv(ALGORITHM, key, iv);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

module.exports = { encryptFile, decryptFile, computeSHA256 };
