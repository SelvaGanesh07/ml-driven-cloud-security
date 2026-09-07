'use strict';
require('dotenv').config();

const express  = require('express');
const cors     = require('cors');
const morgan   = require('morgan');
const path     = require('path');
const fs       = require('fs');

const uploadRoute     = require('./routes/upload');
const filesRoute      = require('./routes/files');
const blockchainRoute = require('./routes/blockchain');
const threatRoute     = require('./routes/threats');
const dashboardRoute  = require('./routes/dashboard');
const authRoute       = require('./routes/auth');
const { initDB }      = require('./modules/database');

const app  = express();
const PORT = process.env.PORT || 3000;
const ENV  = process.env.NODE_ENV || 'development';

// ── Ensure uploads dir exists ─────────────────────────────────────────────────
const uploadsDir = path.resolve(__dirname, process.env.UPLOADS_DIR || './uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// ── CORS ──────────────────────────────────────────────────────────────────────
// Allow the React dev server (port 3001), any localhost origin, and any
// HTTPS origin (e.g. Cloudflare Tunnel public URLs).
// Requests with no origin (Postman, curl, mobile apps) are always allowed.
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);                           // no-origin → allow
    if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return cb(null, true); // localhost
    if (/^https:\/\//.test(origin)) return cb(null, true);       // any HTTPS (Cloudflare Tunnel, etc.)
    cb(new Error(`CORS: origin '${origin}' not allowed`));
  },
  methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials:    true,
}));
app.options('*', cors());  // pre-flight for all routes

// ── Body parsers ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── HTTP request logger ───────────────────────────────────────────────────────
app.use(morgan(ENV === 'development' ? 'dev' : 'combined'));

// ── Serve uploaded files statically ──────────────────────────────────────────
app.use('/uploads', express.static(uploadsDir));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', env: ENV, ts: new Date().toISOString() }));

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/auth',       authRoute);
app.use('/',           uploadRoute);     // POST /upload
app.use('/',           filesRoute);      // GET  /test, GET/DELETE /files/:id
app.use('/blockchain', blockchainRoute);
app.use('/threats',    threatRoute);
app.use('/dashboard',  dashboardRoute);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

// ── Global error handler (surfaces real error in dev mode) ────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  const status  = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';

  // Always log full stack on server side
  console.error(`[ERROR] ${status} – ${message}`);
  if (err.stack) console.error(err.stack);

  // In development send full details back so the frontend can display them
  const body = {
    success: false,
    message,
    ...(ENV === 'development' && {
      error: err.name || 'Error',
      stack: err.stack,
      detail: err.detail || null,
    }),
  };

  res.status(status).json(body);
});

// ── Boot ──────────────────────────────────────────────────────────────────────
(async () => {
  try {
    await initDB();
    console.log('[DB] SQLite database initialised');

    app.listen(PORT, () => {
      console.log(`\n🚀  Secure Cloud Storage Backend`);
      console.log(`   ENV  : ${ENV}`);
      console.log(`   PORT : http://localhost:${PORT}`);
      console.log(`   Uploads dir : ${uploadsDir}\n`);
    });
  } catch (err) {
    console.error('[BOOT] Failed to start server:', err);
    process.exit(1);
  }
})();
