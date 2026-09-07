import axios from 'axios';

// ── Base instance ─────────────────────────────────────────────────────────────
// Relative baseURL: CRA proxy handles dev; Cloudflare Tunnel handles production.
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor – attach JWT ─────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor – handle 401 ────────────────────────────────────────
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userName');
      localStorage.removeItem('userEmail');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authAPI = {
  login:    (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  logout:   ()     => api.post('/auth/logout'),
};

// ── Admin ─────────────────────────────────────────────────────────────────────
// These endpoints return 403 for non-admin tokens – enforced on the backend.
export const adminAPI = {
  getSecurityReport: () => api.get('/dashboard/security'),
};

// ── Files ─────────────────────────────────────────────────────────────────────
export const filesAPI = {
  /**
   * POST /upload  (multipart/form-data)
   * Owner is determined server-side from the JWT – not sent in the body.
   */
  uploadFile: (file, description, onUploadProgress) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('description', description || '');
    return api.post('/upload', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    });
  },

  /** GET /test – returns files scoped to the authenticated user (admin sees all) */
  getAllFiles: () => api.get('/test'),

  /** GET /files/:id/download */
  downloadFile: (id) => api.get(`/files/${id}/download`, { responseType: 'blob' }),

  /** DELETE /files/:id */
  deleteFile: (id) => api.delete(`/files/${id}`),

  /**
   * POST /files/:id/verify
   * Returns { verified, status, message, fileName, timestamp } – hash never sent.
   */
  verifyIntegrity: (id) => api.post(`/files/${id}/verify`),
};

// ── Blockchain ────────────────────────────────────────────────────────────────
export const blockchainAPI = {
  /** GET /blockchain/records – scoped to owner unless admin */
  getRecords: () => api.get('/blockchain/records'),

  /** GET /blockchain/verify/:fileId */
  verifyRecord: (fileId) => api.get(`/blockchain/verify/${fileId}`),
};

// ── Threats (admin only) ──────────────────────────────────────────────────────
export const threatAPI = {
  getAlerts:      ()   => api.get('/threats/alerts'),
  resolveAlert:   (id) => api.patch(`/threats/alerts/${id}/resolve`),
  getLoginEvents: ()   => api.get('/threats/login-events'),
  getAuditEvents: ()   => api.get('/threats/audit-events'),
};

// ── Dashboard stats ───────────────────────────────────────────────────────────
export const statsAPI = {
  getSummary: () => api.get('/dashboard/stats'),
};

export default api;
