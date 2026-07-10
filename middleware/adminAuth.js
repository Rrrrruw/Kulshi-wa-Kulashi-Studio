const crypto = require('crypto');

const ADMIN_CODE = process.env.ADMIN_CODE || 'rrrrafd19';
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'please-change-this-secret';
const ADMIN_COOKIE = 'admin_auth';
const ADMIN_COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 أيام بالثواني

function signAdminToken() {
  return crypto.createHmac('sha256', ADMIN_SECRET).update('admin-ok').digest('hex');
}

function parseCookies(req) {
  const header = req.headers.cookie;
  const cookies = {};
  if (!header) return cookies;
  header.split(';').forEach((part) => {
    const idx = part.indexOf('=');
    if (idx === -1) return;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    cookies[key] = decodeURIComponent(value);
  });
  return cookies;
}

function isAdminAuthed(req) {
  const cookies = parseCookies(req);
  return cookies[ADMIN_COOKIE] === signAdminToken();
}

// ميدل وير: يمنع الوصول لأي مسار API لو ما فيه جلسة أدمن صالحة
function requireAdmin(req, res, next) {
  if (isAdminAuthed(req)) return next();
  return res.status(401).json({ message: 'هذا الإجراء يحتاج تسجيل دخول كأدمن' });
}

module.exports = {
  ADMIN_CODE,
  ADMIN_COOKIE,
  ADMIN_COOKIE_MAX_AGE,
  signAdminToken,
  isAdminAuthed,
  requireAdmin,
};
