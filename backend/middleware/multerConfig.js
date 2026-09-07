'use strict';
/**
 * Multer configuration – multipart/form-data file upload.
 * Validates:
 *   - file presence
 *   - MIME type (all common types allowed; obviously malicious types blocked)
 *   - file size (MAX_FILE_SIZE_MB from .env, default 500 MB)
 */
const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

const MAX_MB       = parseInt(process.env.MAX_FILE_SIZE_MB || '500', 10);
const UPLOADS_DIR  = path.resolve(__dirname, '..', process.env.UPLOADS_DIR || './uploads');

// Ensure dir exists
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Store files with a timestamp prefix to avoid collisions
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename:    (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}_${safe}`);
  },
});

// Block only known-dangerous execution types; allow all media/doc/archive types
const BLOCKED_MIME = new Set([
  'application/x-msdownload',
  'application/x-msdos-program',
  'application/x-sh',
  'application/x-bash',
  'text/x-shellscript',
]);
const BLOCKED_EXT = new Set(['.exe', '.bat', '.cmd', '.sh', '.ps1', '.vbs', '.com', '.msi']);

const fileFilter = (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (BLOCKED_MIME.has(file.mimetype) || BLOCKED_EXT.has(ext)) {
    const err = new Error(
      `File type not allowed: "${file.originalname}" (${file.mimetype}). ` +
      `Executable files are blocked for security reasons.`
    );
    err.status = 400;
    return cb(err, false);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_MB * 1024 * 1024 },
});

// Wraps multer.single('file') and converts multer errors into proper HTTP errors
function uploadSingle(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (!err) return next();

    if (err.code === 'LIMIT_FILE_SIZE') {
      err.status  = 413;
      err.message = `File too large. Maximum allowed size is ${MAX_MB} MB.`;
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      err.status  = 400;
      err.message = `Unexpected field. Use field name "file" for the upload.`;
    } else if (!err.status) {
      err.status = 400;
    }
    next(err);
  });
}

module.exports = { uploadSingle, UPLOADS_DIR };
