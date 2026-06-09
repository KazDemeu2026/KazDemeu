const STORAGE_PREFIX = 'kd_';
const SESSION_KEY = `${STORAGE_PREFIX}session`;
const DEFAULT_API_BASE = window.APP_CONFIG?.apiBase || 'https://your-worker.example.workers.dev';

function safeJson(value) {
  try { return JSON.parse(value); } catch { return null; }
}

function storageGet(key, defaultValue = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? safeJson(raw) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function storageSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function storageRemove(key) {
  try { localStorage.removeItem(key); } catch {}
}

function esc(value) {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escOr(value, fallback = '—') {
  return value ? esc(value) : fallback;
}

function fmtN(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return '—';
  return Math.round(num).toLocaleString('ru-RU') + '₸';
}

function fmtDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('ru-RU');
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}

function setStatusMessage(text) {
  const status = document.getElementById('sbStatus');
  if (!status) return;
  status.textContent = text;
}

function setLoading(message = 'Загрузка...') {
  setStatusMessage(message);
}
function clearLoading() {
  setStatusMessage('');
}

function getSession() {
  const session = storageGet(SESSION_KEY, null);
  if (!session || !session.token) return null;
  if (session.exp && Date.now() > session.exp) {
    clearSession();
    return null;
  }
  return session;
}

function setSession(session) {
  if (!session || !session.token) return;
  storageSet(SESSION_KEY, session);
}

function clearSession() {
  storageRemove(SESSION_KEY);
}

function normalizeString(value = '') {
  return String(value).trim().toLowerCase();
}

function allowIfAdmin() {
  return window.currentRole === 'admin';
}

window.esc = esc;
window.escOr = escOr;
window.fmtN = fmtN;
window.fmtDate = fmtDate;
window.showToast = showToast;
window.setLoading = setLoading;
window.clearLoading = clearLoading;
window.getSession = getSession;
window.setSession = setSession;
window.clearSession = clearSession;
window.normalizeString = normalizeString;
