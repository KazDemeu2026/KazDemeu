// === supabase.js ===
// ===== SUPABASE CLIENT =====
const SUPABASE_URL = 'https://cbdvpzryztoyowprjtro.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNiZHZwenJ5enRveW93cHJqdHJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMjUxNTIsImV4cCI6MjA5NTkwMTE1Mn0.hd8CMF_sPxsy35KeRPGfjtHFcJWp4kTrvw_gbHtmFn0';

const supabase = {
  url: SUPABASE_URL,
  key: SUPABASE_KEY,

  async query(table, options = {}) {
    let url = `${this.url}/rest/v1/${table}`;
    const params = [];
    if (options.select) params.push(`select=${options.select}`);
    if (options.filter) { Object.entries(options.filter).forEach(([k, v]) => params.push(`${k}=eq.${v}`)); }
    if (options.order) params.push(`order=${options.order}`);
    if (options.limit) params.push(`limit=${options.limit}`);
    if (params.length) url += '?' + params.join('&');
    const res = await fetch(url, { headers: { 'apikey': this.key, 'Authorization': `Bearer ${this.key}`, 'Content-Type': 'application/json', 'Accept': 'application/json', 'Prefer': 'return=representation' } });
    if (!res.ok) throw new Error(`Supabase error: ${res.status}`);
    return res.json();
  },

  async insert(table, data) {
    const res = await fetch(`${this.url}/rest/v1/${table}`, { method: 'POST', headers: { 'apikey': this.key, 'Authorization': `Bearer ${this.key}`, 'Content-Type': 'application/json', 'Accept': 'application/json', 'Prefer': 'return=representation' }, body: JSON.stringify(data) });
    if (!res.ok) { const e = await res.json(); throw new Error(e.message || 'Insert failed'); }
    return res.json();
  },

  async update(table, id, data) {
    const res = await fetch(`${this.url}/rest/v1/${table}?id=eq.${id}`, { method: 'PATCH', headers: { 'apikey': this.key, 'Authorization': `Bearer ${this.key}`, 'Content-Type': 'application/json', 'Accept': 'application/json', 'Prefer': 'return=representation' }, body: JSON.stringify(data) });
    if (!res.ok) throw new Error('Update failed');
    return res.json();
  },

  async delete(table, id) {
    const res = await fetch(`${this.url}/rest/v1/${table}?id=eq.${id}`, { method: 'DELETE', headers: { 'apikey': this.key, 'Authorization': `Bearer ${this.key}` } });
    if (!res.ok) throw new Error('Delete failed');
    return true;
  },

  async upsert(table, data, onConflict = 'id') {
    const res = await fetch(`${this.url}/rest/v1/${table}?on_conflict=${onConflict}`, { method: 'POST', headers: { 'apikey': this.key, 'Authorization': `Bearer ${this.key}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation,resolution=merge-duplicates' }, body: JSON.stringify(data) });
    if (!res.ok) throw new Error('Upsert failed');
    return res.json();
  },

  subscribe(table, callback, interval = 5000) {
    let lastCheck = new Date().toISOString();
    return setInterval(async () => {
      try { const data = await this.query(table, { filter: { 'updated_at': `gte.${lastCheck}` } }); if (data.length > 0) { lastCheck = new Date().toISOString(); callback(data); } } catch(e) {}
    }, interval);
  }
};

// ===== LOCAL STORAGE HELPERS =====
const ls = (k, d = null) => { try { const v = localStorage.getItem(k); return v !== null ? JSON.parse(v) : d; } catch { return d; } };
const lsw = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

// ===== SHA-256 =====
async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

async function migratePasswords() {
  const stored = ls('kd_passwords', {}); const hashed = ls('kd_pw_hashed', false);
  if (hashed) return;
  const out = {};
  for (const [k, v] of Object.entries(stored)) { out[k] = (v && /^[0-9a-f]{64}$/.test(v)) ? v : await sha256(v); }
  for (const [k, v] of Object.entries(DEFAULT_PASSWORDS)) { if (!out[k]) out[k] = await sha256(v); }
  lsw('kd_passwords', out); lsw('kd_pw_hashed', true); ROLE_PASSWORDS = out;
}

async function migrateCustomUsers() {
  if (ls('kd_cu_hashed', false)) return;
  const users = ls('kd_custom_users', []);
  for (const u of users) { if (u.password && !/^[0-9a-f]{64}$/.test(u.password)) u.password = await sha256(u.password); }
  lsw('kd_custom_users', users); lsw('kd_cu_hashed', true); customUsers = users;
}

// ===== RATE LIMITING =====
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60 * 1000;
function getRateData(key) { return ls('kd_rate_' + key, { count: 0, lockedUntil: 0 }); }
function recordFailedAttempt(key) {
  const d = getRateData(key); d.count = (d.count || 0) + 1;
  d.lockedUntil = d.count >= MAX_ATTEMPTS ? Date.now() + LOCKOUT_MS : (d.lockedUntil || 0);
  lsw('kd_rate_' + key, d); return d;
}
function clearRate(key) { lsw('kd_rate_' + key, { count: 0, lockedUntil: 0 }); }
function isLocked(key) {
  const d = getRateData(key);
  if (d.lockedUntil && Date.now() < d.lockedUntil) return Math.ceil((d.lockedUntil - Date.now()) / 60000);
  return 0;
}

// ===== SESSION =====
const SESSION_TTL = 8 * 60 * 60 * 1000;
function createSession(role, name) { const t = { role, name, ts: Date.now(), exp: Date.now() + SESSION_TTL }; lsw('kd_session', t); return t; }
function getSession() { const s = ls('kd_session', null); if (!s || Date.now() > s.exp) { lsw('kd_session', null); return null; } return s; }
function clearSession() { lsw('kd_session', null); }

// esc, escOr, fmtN, fmtDate - defined in utils.js
