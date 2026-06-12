// === auth.js ===
// ===== ÐÐÐ¢ÐÐ ÐÐÐÐ¦ÐÐ¯ Ð Ð ÐÐÐ =====

const ROLES = {
  admin:       { l: 'ÐÐ´Ð¼Ð¸Ð½Ð¸ÑÑÑÐ°ÑÐ¾Ñ', i: 'ð', c: '#1e3a8a', bg: '#dbeafe', d: 'ÐÐ¾Ð»Ð½ÑÐ¹ Ð´Ð¾ÑÑÑÐ¿' },
  manager:     { l: 'ÐÐµÐ½ÐµÐ´Ð¶ÐµÑ',      i: 'ð¼', c: '#064e3b', bg: '#d1fae5', d: 'ÐÐ°ÐºÐ°Ð·Ñ (Ð±ÐµÐ· ÑÐµÐ½)' },
  constructor: { l: 'ÐÐ¾Ð½ÑÑÑÑÐºÑÐ¾Ñ',   i: 'ð§', c: '#4c1d95', bg: '#ede9fe', d: 'Ð¢ÐµÑÐ½Ð¸ÑÐµÑÐºÐ¸Ðµ Ð´Ð°Ð½Ð½ÑÐµ' },
  technolog:   { l: 'Ð¢ÐµÑÐ½Ð¾Ð»Ð¾Ð³',      i: 'âï¸', c: '#134e4a', bg: '#ccfbf1', d: 'Ð¢ÐµÑÐ½Ð¾Ð»Ð¾Ð³Ð¸ÑÐµÑÐºÐ¸Ðµ Ð´Ð°Ð½Ð½ÑÐµ' },
  logist:      { l: 'ÐÐ¾Ð³Ð¸ÑÑ',        i: 'ð', c: '#0c4a6e', bg: '#e0f2fe', d: 'ÐÐ¾ÑÑÐ°Ð²ÐºÐ° Ð¸ ÑÑÐ¾ÐºÐ¸' },
  goszakup:    { l: 'ÐÐ¾ÑÐ·Ð°ÐºÑÐ¿ÑÐ¸Ðº',   i: 'ð', c: '#881337', bg: '#ffe4e6', d: 'ÐÐ¾Ð±Ð°Ð²Ð»ÐµÐ½Ð¸Ðµ/ÑÐ´Ð°Ð»ÐµÐ½Ð¸Ðµ' }
};

const BADGES = {
  admin:       'background:#1e3a8a;color:#93c5fd',
  manager:     'background:#064e3b;color:#6ee7b7',
  constructor: 'background:#4c1d95;color:#ddd6fe',
  technolog:   'background:#134e4a;color:#99f6e4',
  logist:      'background:#0c4a6e;color:#bae6fd',
  goszakup:    'background:#881337;color:#fda4af'
};

// ÐÐ°ÑÐ¾Ð»Ð¸ (ÑÑÐ°Ð½ÑÑÑÑ Ð»Ð¾ÐºÐ°Ð»ÑÐ½Ð¾, admin Ð¼Ð¾Ð¶ÐµÑ Ð¼ÐµÐ½ÑÑÑ)
const DEFAULT_PASSWORDS = {
  admin:       'kazdemeu-nan',
  manager:     'manager2026',
  constructor: 'const2026',
  technolog:   'tech2026',
  logist:      'logist2026',
  goszakup:    'zakup2026'
};

let ROLE_PASSWORDS = Object.assign({}, DEFAULT_PASSWORDS, ls('kd_passwords', {}));
const savePasswords = () => lsw('kd_passwords', ROLE_PASSWORDS);

// Ð¢ÐµÐºÑÑÐ¸Ð¹ Ð¿Ð¾Ð»ÑÐ·Ð¾Ð²Ð°ÑÐµÐ»Ñ
let currentRole = null;
let currentUserName = null; // for custom users

// Custom users stored in localStorage
let customUsers = ls('kd_custom_users', []);

// ÐÐ½Ð¸ÑÐ¸Ð°Ð»Ð¸Ð·Ð°ÑÐ¸Ñ ÑÐºÑÐ°Ð½Ð° Ð²ÑÐ¾Ð´Ð°
function initLogin() {
  const list = document.getElementById('rlist');
  const builtIn = Object.entries(ROLES).map(([k, v]) => `
    <div class="ritem" onclick="selectRole('${k}',null)" data-r="${k}">
      <div class="rico" style="background:${v.c};color:#fff">${v.i}</div>
      <div class="rinfo"><b>${v.l}</b><span>${v.d}</span></div>
    </div>`).join('');
  const custom = customUsers.map(u => {
    const base = ROLES[u.role] || ROLES.manager;
    return `<div class="ritem" onclick="selectRole('${u.key}','custom')" data-r="${u.key}">
      <div class="rico" style="background:${base.c};color:#fff">${u.icon || base.i}</div>
      <div class="rinfo"><b>${u.name}</b><span>${base.l} (Ð¿Ð¾Ð»ÑÐ·.)</span></div>
    </div>`;
  }).join('');
  list.innerHTML = builtIn + (custom ? `<div style="font-size:10px;color:#64748b;padding:4px 6px;text-transform:uppercase;letter-spacing:.06em">ÐÐ¾Ð»ÑÐ·Ð¾Ð²Ð°ÑÐµÐ»Ð¸</div>` + custom : '');
}

function selectRole(r, type) {
  currentRole = r;
  window.currentRole = r;
  document.querySelectorAll('.ritem').forEach(el => el.classList.toggle('on', el.dataset.r === r));
  document.getElementById('lbtn').disabled = false;
}

async function doLogin() {
  if (!currentRole) return;

  const customUser = customUsers.find(u => u.key === currentRole);
  const labelName = customUser ? customUser.name : (ROLES[currentRole] ? ROLES[currentRole].l : currentRole);
  const rateKey = currentRole;

  // Rate limiting check
  const lockMins = isLocked(rateKey);
  if (lockMins > 0) {
    showLoginError(`ð Ð¥ìæ¸a Ð¼Ð½Ð¾Ð³Ð¾ Ð¿Ð¾Ð¿ÑÑÐ¾Ðº. ÐÐ¾Ð´Ð¾Ð¶Ð´Ð¸ÑÐµ ${lockMins} Ð¼Ð¸Ð½.`);
    return;
  }

  const pass = prompt(`ÐÐ²ÐµÐ´Ð¸ÑÐµ Ð¿Ð°ÑÐ¾Ð»Ñ Ð´Ð»Ñ: ${labelName}`);
  if (!pass) return;

  // Hash the entered password for comparison
  const passHash = await sha256(pass);

  let authenticated = false;

  if (customUser) {
    const storedHash = /^[0-9a-f]{64}$/.test(customUser.password)
      ? customUser.password : await sha256(customUser.password);
    if (passHash !== storedHash) {
      const d = recordFailedAttempt(rateKey);
      const left = MAX_ATTEMPTS - d.count;
      showLoginError(left > 0 ? `â ÐÐµÐ²ÐµÑÐ½ÑÐ¹ Ð¿Ð°ÑÐ¾Ð»Ñ. ÐÑÑÐ°Ð»Ð¾ÑÑ Ð¿Ð¾Ð¿ÑÑÐ¾Ðº: ${left}` : 'ð ÐÐºÐºÐ°ÑÐ½Ñ Ð·Ð°Ð±Ð»Ð¾ÐºÐ¸ÑÐ¾Ð²Ð°Ð½ Ð½Ð° 5 Ð¼Ð¸Ð½ÑÑ');
      return;
    }
    currentUserName = customUser.name;
    const baseRole = customUser.role;
    currentRole = baseRole;
    window.currentRole = baseRole;
    window._customUserKey = customUser.key;
    window._customUserName = customUser.name;
    window._customUserBaseRole = baseRole;
    authenticated = true;
  } else {
    const storedHash = ROLE_PASSWORDS[currentRole];
    const expected = (storedHash && /^[0-9a-f]{64}$/.test(storedHash))
      ? storedHash : await sha256(storedHash || '');
    if (passHash !== expected) {
      const d = recordFailedAttempt(rateKey);
      const left = MAX_ATTEMPTS - d.count;
      showLoginError(left > 0 ? `â ÐÐµÐ²ÐµÑÐ½ÑÐ¹ Ð¿Ð°ÑÐ¾Ð»Ñ. ÐÑÑÐ°Ð»Ð¾ÑÑ Ð¿Ð¾Ð¿ÑÑÐ¾Ðº: ${left}` : 'ð ÐÐºÐºÐ°ÑÐ½Ñ Ð·Ð°Ð±Ð»Ð¾ÐºÐ¸ÑÐ¾Ð²Ð°Ð½ Ð½Ð° 5 Ð¼Ð¸Ð½ÑÑ');
      return;
    }
    currentUserName = null;
    window._customUserKey = null;
    window._customUserName = null;
    window._customUserBaseRole = null;
    authenticated = true;
  }

  if (!authenticated) return;
  clearRate(rateKey);
  createSession(currentRole, currentUserName || ROLES[currentRole]?.l || currentRole);

  // Show app
  document.getElementById('loginWrap').style.display = 'none';
  const app = document.getElementById('app');
  app.style.display = 'flex';

  const R = ROLES[currentRole];
  const displayName = currentUserName || R.l;
  document.getElementById('tbadge').textContent = displayName;
  document.getElementById('tbadge').style.cssText = BADGES[currentRole];
  document.getElementById('snav').style.display = 'flex';

  if (currentRole === 'admin') {
    document.getElementById('navtabs').style.display = 'flex';
    document.getElementById('btnPassSettings').style.display = 'inline-block';
  }

  // Session expiry warning
  setTimeout(() => {
    if (getSession()) showToast('â ï¸ Ð¡ÐµÑÑÐ¸Ñ Ð¸ÑÑÐµÐºÐ°ÐµÑ ÑÐµÑÐµÐ· 30 Ð¼Ð¸Ð½ÑÑ');
  }, SESSION_TTL - 30 * 60 * 1000);
  setTimeout(() => {
    if (getSession()) { clearSession(); doLogout(); showLoginError('â±ï¸ Ð¡ÐµÑÑÐ¸Ñ Ð¸ÑÑÐµÐºÐ»Ð°. ÐÐ¾Ð¹Ð´Ð¸ÑÐµ ÑÐ½Ð¾Ð²Ð°.'); }
  }, SESSION_TTL);

  applyZoom();
  if (typeof initNavTabs === 'function') initNavTabs();
  await loadAllData();
  startRealtimeSync();
  updateNavVisibility();
  goPage('contracts');
}

function showLoginError(msg) {
  let el = document.getElementById('loginErr');
  if (!el) {
    el = document.createElement('div');
    el.id = 'loginErr';
    el.style.cssText = 'margin-top:10px;padding:9px 13px;background:rgba(255,71,87,0.15);border:1px solid rgba(255,71,87,0.4);border-radius:7px;color:#ff4757;font-size:12px;text-align:center';
    document.getElementById('lbtn').insertAdjacentElement('afterend', el);
  }
  el.textContent = msg;
  setTimeout(() => { if (el.parentNode) el.textContent = ''; }, 5000);
}

function doLogout() {
  currentRole = null;
  window.currentRole = null;
  currentUserName = null;
  window._customUserKey = null;
  window._customUserName = null;
  window._customUserBaseRole = null;
  document.getElementById('app').style.display = 'none';
  document.getElementById('loginWrap').style.display = 'flex';
  document.getElementById('navtabs').style.display = 'none';
  document.getElementById('btnPassSettings').style.display = 'none';
  document.getElementById('snav').style.display = 'none';
  document.querySelectorAll('.ritem').forEach(el => el.classList.remove('on'));
  document.getElementById('lbtn').disabled = true;
  stopRealtimeSync();
  clearSession();
  initLogin();
}

// ===== USER MANAGEMENT =====
function openPasswordSettings() {
  if (currentRole !== 'admin') return;
  customUsers = ls('kd_custom_users', []);
  renderUserMgmt();
}

function renderUserMgmt() {
  const overlay = document.getElementById('userMgmtOverlay') || (() => {
    const el = document.createElement('div');
    el.id = 'userMgmtOverlay';
    el.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9000;display:flex;align-items:center;justify-content:center';
    document.body.appendChild(el);
    return el;
  })();

  const builtinRoles = Object.entries(ROLES);

  overlay.innerHTML = `
  <div style="background:#0d1a2e;border:1px solid rgba(0,212,255,0.3);border-radius:12px;width:700px;max-width:95vw;max-height:90vh;overflow-y:auto;padding:24px;box-shadow:0 0 40px rgba(0,212,255,0.15)">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
      <h2 style="font-size:16px;font-weight:700;color:#00d4ff;font-family:Orbitron,sans-serif">ð Ð£Ð¿ÑÐ°Ð²Ð»ÐµÐ½Ð¸Ðµ Ð¿Ð¾Ð»ÑÐ·Ð¾Ð²Ð°ÑÐµÐ»Ñ</h2>
      <button onclick="document.getElementById('userMgmtOverlay').remove()" style="background:none;border:none;color:#64748b;font-size:20px;cursor:pointer">â</button>
    </div>

    <div style="margin-bottom:20px">
      <div style="font-size:11px;font-weight:700;color:#00d4ff;text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px">ÐÑÑÑÐ¾ÐµÐ½Ð½ÑÐµ ÑÐ¾Ð»Ð¸</div>
      ${builtinRoles.map(([k, v]) => `
        <div style="display:flex;align-items:center;gap:10px;padding:9px 12px;background:rgba(7,15,29,0.6);border:1px solid rgba(0,212,255,0.1);border-radius:8px;margin-bottom:6px">
          <div style="width:32px;height:32px;border-radius:6px;background:${v.c};display:flex;align-items:center;justify-content:center;font-size:16px">${v.i}</div>
          <div style="flex:1"><b style="color:#e2e8f0;font-size:13px">${v.l}</b><div style="font-size:10px;color:#64748b">${v.d}</div></div>
          <div style="display:flex;align-items:center;gap:6px">
            <span style="font-size:11px;color:#64748b">ÐÐ°ÑÐ¾Ð»Ñ2:</span>
            <input type="password" placeholder="â¢â¢â¢â¢â¢â¢â¢â¢" id="bpw-${k}" style="width:140px;padding:5px 8px;background:#0a1628;border:1px solid rgba(0,212,255,0.2);border-radius:5px;color:#e2e8f0;font-size:12px;outline:none" ${k==='admin' ? 'readonly style="width:140px;padding:5px 8px;background:#0a1628;border:1px solid rgba(0,212,255,0.1);border-radius:5px;color:#64748b;font-size:12px"' : ''}>
            ${k !== 'admin' ? `<button onclick="saveBuiltinPw('${k}')" style="padding:5px 10px;background:rgba(0,212,255,0.1);border:1px solid rgba(0,212,255,0.25);border-radius:5px;color:#00d4ff;font-size:11px;cursor:pointer">â</button>` : ''}
          </div>
        </div>`).join('')}
    </div>

    <div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <div style="font-size:11px;font-weight:700;color:#00d4ff;text-transform:uppercase;letter-spacing:.08em">ÐÐ¾Ð»ÑÐ·Ð¾Ð²Ð°ÑÐµÐ»Ð¸</div>
        <button onclick="showAddUserForm()" style="padding:5px 12px;background:rgba(0,255,136,0.1);border:1px solid rgba(0,255,136,0.3);border-radius:6px;color:#00ff88;font-size:12px;cursor:pointer;font-weight:600">+ ÐÐ¾Ð±Ð°Ð²Ð¸ÑÑ</button>
      </div>
      <div id="customUsersList">
        ${customUsers.length === 0 ? '<div style="color:#64748b;font-size:12px;text-align:center;padding:16px">ÐÐµÑ Ð¿Ð¾Ð»ÑÐ·Ð¾Ð²Ð°ÑÐµÐ»ÐµÐ¹</div>' : customUsers.map(u => {
          const base = ROLES[u.role] || ROLES.manager;
          return `<div style="display:flex;align-items:center;gap:10px;padding:9px 12px;background:rgba(7,15,29,0.6);border:1px solid rgba(0,212,255,0.1);border-radius:8px;margin-bottom:6px">
            <div style="width:32px;height:32px;border-radius:6px;background:${base.c};display:flex;align-items:center;justify-content:center;font-size:16px">${u.icon || base.i}</div>
            <div style="flex:1">
              <b style="color:#e2e8f0;font-size:13px">${u.name}</b>
              <div style="font-size:10px;color:#64748b">@${u.key} Â· ${base.l}</div>
            </div>
            <input type="text" value="${u.password}" id="cpw-${u.key}" style="width:130px;padding:5px 8px;background:#0a1628;border:1px solid rgba(0,212,255,0.2);border-radius:5px;color:#e2e8f0;font-size:12px;outline:none" placeholder="ÐÐ°ÑÐ¾Ð»Ñ">
            <button onclick="saveCustomPw('${u.key}')" style="padding:5px 8px;background:rgba(0,212,255,0.1);border:1px solid rgba(0,212,255,0.25);border-radius:5px;color:#00d4ff;font-size:11px;cursor:pointer">â</button>
            <button onclick="deleteCustomUser('${u.key}')" style="padding:5px 8px;background:rgba(255,71,87,0.15);border:1px solid rgba(255,71,87,0.3);border-radius:5px;color:#ff4757;font-size:11px;cursor:pointer">â</button>
          </div>`;
        }).join('')}
      </div>
      <div id="addUserForm" style="display:none;margin-top:12px;padding:14px;background:rgba(0,212,255,0.04);border:1px dashed rgba(0,212,255,0.25);border-radius:8px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
          <div><label style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.06em;display:block;margin-bottom:3px">ÐÐ¼Ñ</label><input id="nu-name" type="text" placeholder="ÐÐ²Ð°Ð½ ÐÐ²Ð°Ð½Ð¾Ð²" style="width:100%;padding:7px 9px;background:#0a1628;border:1px solid rgba(0,212,255,0.25);border-radius:6px;color:#e2e8f0;font-size:12px;outline:none"></div>
          <div><label style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.06em;display:block;margin-bottom:3px">ÐÐ¾Ð³Ð¸Ð½</label><input id="nu-key" type="text" placeholder="ivan" style="width:100%;padding:7px 9px;background:#0a1628;border:1px solid rgba(0,212,255,0.25);border-radius:6px;color:#e2e8f0;font-size:12px;outline:none"></div>
          <div><label style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.06em;display:block;margin-bottom:3px">ÐÐ°ÑÐ¾Ð»Ñ</label><input id="nu-pass" type="text" placeholder="Ð¿Ð°ÑÐ¾Ð»Ñ" style="width:100%;padding:7px 9px;background:#0a1628;border:1px solid rgba(0,212,255,0.25);border-radius:6px;color:#e2e8f0;font-size:12px;outline:none"></div>
          <div><label style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.06em;display:block;margin-bottom:3px">Ð Ð¾Ð»Ñ</label>
            <select id="nu-role" style="width:100%;padding:7px 9px;background:#0a1628;border:1px solid rgba(0,212,255,0.25);border-radius:6px;color:#e2e8f0;font-size:12px;outline:none">
              ${Object.entries(ROLES).map(([k,v]) => `<option value="${k}">${v.l}</option>`).join('')}
            </select>
          </div>
          <div><label style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.06em;display:block;margin-bottom:3px">ÐÐºÐ¾Ð½ÐºÐ°</label><input id="nu-icon" type="text" placeholder="ð¤" maxlength="2" style="width:100%;padding:7px 9px;background:#0a1628;border:1px solid rgba(0,212,255,0.25);border-radius:6px;color:#e2e8f0;font-size:12px;outline:none"></div>
        </div>
        <div style="display:flex;gap:8px">
          <button onclick="saveNewUser()" style="padding:7px 16px;background:rgba(0,255,136,0.12);border:1px solid rgba(0,255,136,0.3);border-radius:6px;color:#00ff88;font-size:12px;cursor:pointer;font-weight:600">â Ð¡Ð¾Ð·Ð´Ð°ÑÑ</button>
          <button onclick="document.getElementById('addUserForm').style.display='none'" style="padding:7px 12px;background:transparent;border:1px solid rgba(100,116,139,0.3);border-radius:6px;color:#64748b;font-size:12px;cursor:pointer">ÐÑÐ¼ÐµÐ½Ð°</button>
        </div>
      </div>
    </div>
  </div>`;
}

async function saveBuiltinPw(role) {
  const el = document.getElementById('bpw-' + role);
  if (!el || !el.value.trim()) return;
  if (el.value.trim().length < 6) { showToast('â ÐÐ¸Ð½Ð¸Ð¼ÑÐ¼ 6 ÑÐ¸Ð¼Ð²Ð¾Ð»Ð¾Ð²'); return; }
  ROLE_PASSWORDS[role] = await sha256(el.value.trim());
  savePasswords();
  el.value = '';
  el.placeholder = 'â Ð¡Ð¾ÑÑÐ°Ð½ÐµÐ½Ð¾';
  setTimeout(() => { el.placeholder = 'â¢â¢â¢â¢â¢â¢â¢â¢'; }, 2000);
  showToast('ð ÐÐ°ÑÐ¾Ð»Ñ ÑÐ¾ÑÑÐ°Ð½ÑÐ½ (ÑÐµÑÐ¸ÑÐ¾Ð²Ð°Ð½)');
}

async function saveCustomPw(key) {
  const el = document.getElementById('cpw-' + key);
  if (!el || !el.value.trim()) return;
  if (el.value.trim().length < 6) { showToast('â ÐÐ¸Ð½Ð¸Ð¼ÑÐ¼ 6 ÑÐ¸Ð¼Ð²Ð¾Ð»Ð¾Ð²'); return; }
  const u = customUsers.find(x => x.key === key);
  if (u) {
    u.password = await sha256(el.value.trim());
    lsw('kd_custom_users', customUsers);
    el.value = '';
    el.placeholder = 'â Ð¡Ð¾ÑÑÐ°Ð½ÐµÐ½Ð¾';
    setTimeout(() => { el.placeholder = 'â¢â¢â¢â¢â¢â¢â¢â¢'; }, 2000);
    showToast('ð ÐÐ°ÑÐ¾Ð»Ñ ÑÐ¾ÑÑÐ°Ð½ÑÐ½ (ÑÐµÑÐ¸ÑÐ¾Ð²Ð°Ð½)');
  }
}

function deleteCustomUser(key) {
  if (!confirm('Ð£Ð´Ð°Ð»Ð¸ÑÑ Ð¿Ð¾Ð»ÑÐ·Ð¾Ð²Ð°ÑÐµÐ»Ñ?')) return;
  customUsers = customUsers.filter(u => u.key !== key);
  lsw('kd_custom_users', customUsers);
  renderUserMgmt();
}

function showAddUserForm() {
  const f = document.getElementById('addUserForm');
  if (f) f.style.display = 'block';
}

async function saveNewUser() {
  const name = (document.getElementById('nu-name')?.value || '').trim();
  const key = (document.getElementById('nu-key')?.value || '').trim().toLowerCase().replace(/[^a-z0-9_]/g,'');
  const pass = (document.getElementById('nu-pass')?.value || '').trim();
  const role = document.getElementById('nu-role')?.value || 'manager';
  const icon = (document.getElementById('nu-icon')?.value || '').trim();
  if (!name || !key || !pass) { showToast('â ÐÐ°Ð¿Ð¾Ð»Ð½Ð¸ÑÐµ Ð¸Ð¼Ñ, Ð»Ð¾Ð³Ð¸Ð½ Ð¸ Ð¿Ð°ÑÐ¾Ð»Ñ'); return; }
  if (pass.length < 6) { showToast('â ÐÐ°ÑÐ¾Ð»Ñ Ð¼Ð¸Ð½Ð¸Ð¼ÑÐ¼ 6 ÑÐ¸Ð¼Ð²Ð¾Ð»Ð¾Ð²'); return; }
  if (ROLES[key] || customUsers.find(u => u.key === key)) { showToast('â ÐÐ¾Ð³Ð¸Ð½ ÑÐ¶Ðµ Ð·Ð°Ð½ÑÑ'); return; }
  const passHash = await sha256(pass);
  customUsers.push({ key, name, password: passHash, role, icon: icon || null });
  lsw('kd_custom_users', customUsers);
  lsw('kd_cu_hashed', true);
  initLogin();
  renderUserMgmt();
  showToast('â ÐÐ¾Ð»ÑÐ·Ð¾Ð²Ð°ÑÐµÐ»Ñ Ð´Ð¾Ð±Ð°Ð²Ð»ÐµÐ½');
}

function showToast(msg) {
  const t = document.createElement('div');
  t.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#00ff88;color:#050d1a;padding:8px 20px;border-radius:8px;font-weight:600;font-size:13px;z-index:99999;pointer-events:none';
  t.textContent = 'â ' + msg;
// ===== ÐÐÐ¢ÐÐ ÐÐÐÐ¦ÐÐ¯ Ð Ð ÐÐÐ =====

const ROLES = {
  admin:       { l: 'ÐÐ´Ð¼Ð¸Ð½Ð¸ÑÑÑÐ°ÑÐ¾Ñ', i: 'ð', c: '#1e3a8a', bg: '#dbeafe', d: 'ÐÐ¾Ð»Ð½ÑÐ¹ Ð´Ð¾ÑÑÑÐ¿' },
  manager:     { l: 'ÐÐµÐ½ÐµÐ´Ð¶ÐµÑ',      i: 'ð¼', c: '#064e3b', bg: '#d1fae5', d: 'ÐÐ°ÐºÐ°Ð·Ñ (Ð±ÐµÐ· ÑÐµÐ½)' },
  constructor: { l: 'ÐÐ¾Ð½ÑÑÑÑÐºÑÐ¾Ñ',   i: 'ð§', c: '#4c1d95', bg: '#ede9fe', d: 'Ð¢ÐµÑÐ½Ð¸ÑÐµÑÐºÐ¸Ðµ Ð´Ð°Ð½Ð½ÑÐµ' },
  technolog:   { l: 'Ð¢ÐµÑÐ½Ð¾Ð»Ð¾Ð³',      i: 'âï¸', c: '#134e4a', bg: '#ccfbf1', d: 'Ð¢ÐµÑÐ½Ð¾Ð»Ð¾Ð³Ð¸ÑÐµÑÐºÐ¸Ðµ Ð´Ð°Ð½Ð½ÑÐµ' },
  logist:      { l: 'ÐÐ¾Ð³Ð¸ÑÑ',        i: 'ð', c: '#0c4a6e', bg: '#e0f2fe', d: 'ÐÐ¾ÑÑÐ°Ð²ÐºÐ° Ð¸ ÑÑÐ¾ÐºÐ¸' },
  goszakup:    { l: 'ÐÐ¾ÑÐ·Ð°ÐºÑÐ¿ÑÐ¸Ðº',   i: 'ð', c: '#881337', bg: '#ffe4e6', d: 'ÐÐ¾Ð±Ð°Ð²Ð»ÐµÐ½Ð¸Ðµ/ÑÐ´Ð°Ð»ÐµÐ½Ð¸Ðµ' }
};

const BADGES = {
  admin:       'background:#1e3a8a;color:#93c5fd',
  manager:     'background:#064e3b;color:#6ee7b7',
  constructor: 'background:#4c1d95;color:#ddd6fe',
  technolog:   'background:#134e4a;color:#99f6e4',
  logist:      'background:#0c4a6e;color:#bae6fd',
  goszakup:    'background:#881337;color:#fda4af'
};

// ÐÐ°ÑÐ¾Ð»Ð¸ (ÑÑÐ°Ð½ÑÑÑÑ Ð»Ð¾ÐºÐ°Ð»ÑÐ½Ð¾, admin Ð¼Ð¾Ð¶ÐµÑ Ð¼ÐµÐ½ÑÑÑ)
const DEFAULT_PASSWORDS = {
  admin:       'kazdemeu-nan',
  manager:     'manager2026',
  constructor: 'const2026',
  technolog:   'tech2026',
  logist:      'logist2026',
  goszakup:    'zakup2026'
};

let ROLE_PASSWORDS = Object.assign({}, DEFAULT_PASSWORDS, ls('kd_passwords', {}));
const savePasswords = () => lsw('kd_passwords', ROLE_PASSWORDS);

// Ð¢ÐµÐºÑÑÐ¸Ð¹ Ð¿Ð¾Ð»ÑÐ·Ð¾Ð²Ð°ÑÐµÐ»Ñ
let currentRole = null;
let currentUserName = null; // for custom users

// Custom users stored in localStorage
let customUsers = ls('kd_custom_users', []);

// ÐÐ½Ð¸ÑÐ¸Ð°Ð»Ð¸Ð·Ð°ÑÐ¸Ñ ÑÐºÑÐ°Ð½Ð° Ð²ÑÐ¾Ð´Ð°
function initLogin() {
  const list = document.getElementById('rlist');
  const builtIn = Object.entries(ROLES).map(([k, v]) => `
    <div class="ritem" onclick="selectRole('${k}',null)" data-r="${k}">
      <div class="rico" style="background:${v.c};color:#fff">${v.i}</div>
      <div class="rinfo"><b>${v.l}</b><span>${v.d}</span></div>
    </div>`).join('');
  const custom = customUsers.map(u => {
    const base = ROLES[u.role] || ROLES.manager;
    return `<div class="ritem" onclick="selectRole('${u.key}','custom')" data-r="${u.key}">
      <div class="rico" style="background:${base.c};color:#fff">${u.icon || base.i}</div>
      <div class="rinfo"><b>${u.name}</b><span>${base.l} (Ð¿Ð¾Ð»ÑÐ·.)</span></div>
    </div>`;
  }).join('');
  list.innerHTML = builtIn + (custom ? `<div style="font-size:10px;color:#64748b;padding:4px 6px;text-transform:uppercase;letter-spacing:.06em">ÐÐ¾Ð»ÑÐ·Ð¾Ð²Ð°ÑÐµÐ»Ð¸</div>` + custom : '');
}

function selectRole(r, type) {
  currentRole = r;
  window.currentRole = r;
  document.querySelectorAll('.ritem').forEach(el => el.classList.toggle('on', el.dataset.r === r));
  document.getElementById('lbtn').disabled = false;
}

async function doLogin() {
  if (!currentRole) return;

  const customUser = customUsers.find(u => u.key === currentRole);
  const labelName = customUser ? customUser.name : (ROLES[currentRole] ? ROLES[currentRole].l : currentRole);
  const rateKey = currentRole;

  // Rate limiting check
  const lockMins = isLocked(rateKey);
  if (lockMins > 0) {
    showLoginError(`ð Ð¥ìæ¸a Ð¼Ð½Ð¾Ð³Ð¾ Ð¿Ð¾Ð¿ÑÑÐ¾Ðº. ÐÐ¾Ð´Ð¾Ð¶Ð´Ð¸ÑÐµ ${lockMins} Ð¼Ð¸Ð½.`);
    return;
  }

  const pass = prompt(`ÐÐ²ÐµÐ´Ð¸ÑÐµ Ð¿Ð°ÑÐ¾Ð»Ñ Ð´Ð»Ñ: ${labelName}`);
  if (!pass) return;

  // Hash the entered password for comparison
  const passHash = await sha256(pass);

  let authenticated = false;

  if (customUser) {
    const storedHash = /^[0-9a-f]{64}$/.test(customUser.password)
      ? customUser.password : await sha256(customUser.password);
    if (passHash !== storedHash) {
      const d = recordFailedAttempt(rateKey);
      const left = MAX_ATTEMPTS - d.count;
      showLoginError(left > 0 ? `â ÐÐµÐ²ÐµÑÐ½ÑÐ¹ Ð¿Ð°ÑÐ¾Ð»Ñ. ÐÑÑÐ°Ð»Ð¾ÑÑ Ð¿Ð¾Ð¿ÑÑÐ¾Ðº: ${left}` : 'ð ÐÐºÐºÐ°ÑÐ½Ñ Ð·Ð°Ð±Ð»Ð¾ÐºÐ¸ÑÐ¾Ð²Ð°Ð½ Ð½Ð° 5 Ð¼Ð¸Ð½ÑÑ');
      return;
    }
    currentUserName = customUser.name;
    const baseRole = customUser.role;
    currentRole = baseRole;
    window.currentRole = baseRole;
    window._customUserKey = customUser.key;
    window._customUserName = customUser.name;
    window._customUserBaseRole = baseRole;
    authenticated = true;
  } else {
    const storedHash = ROLE_PASSWORDS[currentRole];
    const expected = (storedHash && /^[0-9a-f]{64}$/.test(storedHash))
      ? storedHash : await sha256(storedHash || '');
    if (passHash !== expected) {
      const d = recordFailedAttempt(rateKey);
      const left = MAX_ATTEMPTS - d.count;
      showLoginError(left > 0 ? `â ÐÐµÐ²ÐµÑÐ½ÑÐ¹ Ð¿Ð°ÑÐ¾Ð»Ñ. ÐÑÑÐ°Ð»Ð¾ÑÑ Ð¿Ð¾Ð¿ÑÑÐ¾Ðº: ${left}` : 'ð ÐÐºÐºÐ°ÑÐ½Ñ Ð·Ð°Ð±Ð»Ð¾ÐºÐ¸ÑÐ¾Ð²Ð°Ð½ Ð½Ð° 5 Ð¼Ð¸Ð½ÑÑ');
      return;
    }
    currentUserName = null;
    window._customUserKey = null;
    window._customUserName = null;
    window._customUserBaseRole = null;
    authenticated = true;
  }

  if (!authenticated) return;
  clearRate(rateKey);
  createSession(currentRole, currentUserName || ROLES[currentRole]?.l || currentRole);

  // Show app
  document.getElementById('loginWrap').style.display = 'none';
  const app = document.getElementById('app');
  app.style.display = 'flex';

  const R = ROLES[currentRole];
  const displayName = currentUserName || R.l;
  document.getElementById('tbadge').textContent = displayName;
  document.getElementById('tbadge').style.cssText = BADGES[currentRole];
  document.getElementById('snav').style.display = 'flex';

  if (currentRole === 'admin') {
    document.getElementById('navtabs').style.display = 'flex';
    document.getElementById('btnPassSettings').style.display = 'inline-block';
  }

  // Session expiry warning
  setTimeout(() => {
    if (getSession()) showToast('â ï¸ Ð¡ÐµÑÑÐ¸Ñ Ð¸ÑÑÐµÐºÐ°ÐµÑ ÑÐµÑÐµÐ· 30 Ð¼Ð¸Ð½ÑÑ');
  }, SESSION_TTL - 30 * 60 * 1000);
  setTimeout(() => {
    if (getSession()) { clearSession(); doLogout(); showLoginError('â±ï¸ Ð¡ÐµÑÑÐ¸Ñ Ð¸ÑÑÐµÐºÐ»Ð°. ÐÐ¾Ð¹Ð´Ð¸ÑÐµ ÑÐ½Ð¾Ð²Ð°.'); }
  }, SESSION_TTL);

  applyZoom();
  if (typeof initNavTabs === 'function') initNavTabs();
  await loadAllData();
  startRealtimeSync();
  updateNavVisibility();
  goPage('contracts');
}

function showLoginError(msg) {
  let el = document.getElementById('loginErr');
  if (!el) {
    el = document.createElement('div');
    el.id = 'loginErr';
    el.style.cssText = 'margin-top:10px;padding:9px 13px;background:rgba(255,71,87,0.15);border:1px solid rgba(255,71,87,0.4);border-radius:7px;color:#ff4757;font-size:12px;text-align:center';
    document.getElementById('lbtn').insertAdjacentElement('afterend', el);
  }
  el.textContent = msg;
  setTimeout(() => { if (el.parentNode) el.textContent = ''; }, 5000);
}

function doLogout() {
  currentRole = null;
  window.currentRole = null;
  currentUserName = null;
  window._customUserKey = null;
  window._customUserName = null;
  window._customUserBaseRole = null;
  document.getElementById('app').style.display = 'none';
  document.getElementById('loginWrap').style.display = 'flex';
  document.getElementById('navtabs').style.display = 'none';
  document.getElementById('btnPassSettings').style.display = 'none';
  document.getElementById('snav').style.display = 'none';
  document.querySelectorAll('.ritem').forEach(el => el.classList.remove('on'));
  document.getElementById('lbtn').disabled = true;
  stopRealtimeSync();
  clearSession();
  initLogin();
}

// ===== USER MANAGEMENT =====
function openPasswordSettings() {
  if (currentRole !== 'admin') return;
  customUsers = ls('kd_custom_users', []);
  renderUserMgmt();
}

function renderUserMgmt() {
  const overlay = document.getElementById('userMgmtOverlay') || (() => {
    const el = document.createElement('div');
    el.id = 'userMgmtOverlay';
    el.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9000;display:flex;align-items:center;justify-content:center';
    document.body.appendChild(el);
    return el;
  })();

  const builtinRoles = Object.entries(ROLES);

  overlay.innerHTML = `
  <div style="background:#0d1a2e;border:1px solid rgba(0,212,255,0.3);border-radius:12px;width:700px;max-width:95vw;max-height:90vh;overflow-y:auto;padding:24px;box-shadow:0 0 40px rgba(0,212,255,0.15)">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
      <h2 style="font-size:16px;font-weight:700;color:#00d4ff;font-family:Orbitron,sans-serif">ð Ð£Ð¿ÑÐ°Ð²Ð»ÐµÐ½Ð¸Ðµ Ð¿Ð¾Ð»ÑÐ·Ð¾Ð²Ð°ÑÐµÐ»Ñ</h2>
      <button onclick="document.getElementById('userMgmtOverlay').remove()" style="background:none;border:none;color:#64748b;font-size:20px;cursor:pointer">â</button>
    </div>

    <div style="margin-bottom:20px">
      <div style="font-size:11px;font-weight:700;color:#00d4ff;text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px">ÐÑÑÑÐ¾ÐµÐ½Ð½ÑÐµ ÑÐ¾Ð»Ð¸</div>
      ${builtinRoles.map(([k, v]) => `
        <div style="display:flex;align-items:center;gap:10px;padding:9px 12px;background:rgba(7,15,29,0.6);border:1px solid rgba(0,212,255,0.1);border-radius:8px;margin-bottom:6px">
          <div style="width:32px;height:32px;border-radius:6px;background:${v.c};display:flex;align-items:center;justify-content:center;font-size:16px">${v.i}</div>
          <div style="flex:1"><b style="color:#e2e8f0;font-size:13px">${v.l}</b><div style="font-size:10px;color:#64748b">${v.d}</div></div>
          <div style="display:flex;align-items:center;gap:6px">
            <span style="font-size:11px;color:#64748b">ÐÐ°ÑÐ¾Ð»Ñ2:</span>
            <input type="password" placeholder="â¢â¢â¢â¢â¢â¢â¢â¢" id="bpw-${k}" style="width:140px;padding:5px 8px;background:#0a1628;border:1px solid rgba(0,212,255,0.2);border-radius:5px;color:#e2e8f0;font-size:12px;outline:none" ${k==='admin' ? 'readonly style="width:140px;padding:5px 8px;background:#0a1628;border:1px solid rgba(0,212,255,0.1);border-radius:5px;color:#64748b;font-size:12px"' : ''}>
            ${k !== 'admin' ? `<button onclick="saveBuiltinPw('${k}')" style="padding:5px 10px;background:rgba(0,212,255,0.1);border:1px solid rgba(0,212,255,0.25);border-radius:5px;color:#00d4ff;font-size:11px;cursor:pointer">â</button>` : ''}
          </div>
        </div>`).join('')}
    </div>

    <div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <div style="font-size:11px;font-weight:700;color:#00d4ff;text-transform:uppercase;letter-spacing:.08em">ÐÐ¾Ð»ÑÐ·Ð¾Ð²Ð°ÑÐµÐ»Ð¸</div>
        <button onclick="showAddUserForm()" style="padding:5px 12px;background:rgba(0,255,136,0.1);border:1px solid rgba(0,255,136,0.3);border-radius:6px;color:#00ff88;font-size:12px;cursor:pointer;font-weight:600">+ ÐÐ¾Ð±Ð°Ð²Ð¸ÑÑ</button>
      </div>
      <div id="customUsersList">
        ${customUsers.length === 0 ? '<div style="color:#64748b;font-size:12px;text-align:center;padding:16px">ÐÐµÑ Ð¿Ð¾Ð»ÑÐ·Ð¾Ð²Ð°ÑÐµÐ»ÐµÐ¹</div>' : customUsers.map(u => {
          const base = ROLES[u.role] || ROLES.manager;
          return `<div style="display:flex;align-items:center;gap:10px;padding:9px 12px;background:rgba(7,15,29,0.6);border:1px solid rgba(0,212,255,0.1);border-radius:8px;margin-bottom:6px">
            <div style="width:32px;height:32px;border-radius:6px;background:${base.c};display:flex;align-items:center;justify-content:center;font-size:16px">${u.icon || base.i}</div>
            <div style="flex:1">
              <b style="color:#e2e8f0;font-size:13px">${u.name}</b>
              <div style="font-size:10px;color:#64748b">@${u.key} Â· ${base.l}</div>
            </div>
            <input type="text" value="${u.password}" id="cpw-${u.key}" style="width:130px;padding:5px 8px;background:#0a1628;border:1px solid rgba(0,212,255,0.2);border-radius:5px;color:#e2e8f0;font-size:12px;outline:none" placeholder="ÐÐ°ÑÐ¾Ð»Ñ">
            <button onclick="saveCustomPw('${u.key}')" style="padding:5px 8px;background:rgba(0,212,255,0.1);border:1px solid rgba(0,212,255,0.25);border-radius:5px;color:#00d4ff;font-size:11px;cursor:pointer">â</button>
            <button onclick="deleteCustomUser('${u.key}')" style="padding:5px 8px;background:rgba(255,71,87,0.15);border:1px solid rgba(255,71,87,0.3);border-radius:5px;color:#ff4757;font-size:11px;cursor:pointer">â</button>
          </div>`;
        }).join('')}
      </div>
      <div id="addUserForm" style="display:none;margin-top:12px;padding:14px;background:rgba(0,212,255,0.04);border:1px dashed rgba(0,212,255,0.25);border-radius:8px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
          <div><label style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.06em;display:block;margin-bottom:3px">ÐÐ¼Ñ</label><input id="nu-name" type="text" placeholder="ÐÐ²Ð°Ð½ ÐÐ²Ð°Ð½Ð¾Ð²" style="width:100%;padding:7px 9px;background:#0a1628;border:1px solid rgba(0,212,255,0.25);border-radius:6px;color:#e2e8f0;font-size:12px;outline:none"></div>
          <div><label style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.06em;display:block;margin-bottom:3px">ÐÐ¾Ð³Ð¸Ð½</label><input id="nu-key" type="text" placeholder="ivan" style="width:100%;padding:7px 9px;background:#0a1628;border:1px solid rgba(0,212,255,0.25);border-radius:6px;color:#e2e8f0;font-size:12px;outline:none"></div>
          <div><label style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.06em;display:block;margin-bottom:3px">ÐÐ°ÑÐ¾Ð»Ñ</label><input id="nu-pass" type="text" placeholder="Ð¿Ð°ÑÐ¾Ð»Ñ" style="width:100%;padding:7px 9px;background:#0a1628;border:1px solid rgba(0,212,255,0.25);border-radius:6px;color:#e2e8f0;font-size:12px;outline:none"></div>
          <div><label style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.06em;display:block;margin-bottom:3px">Ð Ð¾Ð»Ñ</label>
            <select id="nu-role" style="width:100%;padding:7px 9px;background:#0a1628;border:1px solid rgba(0,212,255,0.25);border-radius:6px;color:#e2e8f0;font-size:12px;outline:none">
              ${Object.entries(ROLES).map(([k,v]) => `<option value="${k}">${v.l}</option>`).join('')}
            </select>
          </div>
          <div><label style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.06em;display:block;margin-bottom:3px">ÐÐºÐ¾Ð½ÐºÐ°</label><input id="nu-icon" type="text" placeholder="ð¤" maxlength="2" style="width:100%;padding:7px 9px;background:#0a1628;border:1px solid rgba(0,212,255,0.25);border-radius:6px;color:#e2e8f0;font-size:12px;outline:none"></div>
        </div>
        <div style="display:flex;gap:8px">
          <button onclick="saveNewUser()" style="padding:7px 16px;background:rgba(0,255,136,0.12);border:1px solid rgba(0,255,136,0.3);border-radius:6px;color:#00ff88;font-size:12px;cursor:pointer;font-weight:600">â Ð¡Ð¾Ð·Ð´Ð°ÑÑ</button>
          <button onclick="document.getElementById('addUserForm').style.display='none'" style="padding:7px 12px;background:transparent;border:1px solid rgba(100,116,139,0.3);border-radius:6px;color:#64748b;font-size:12px;cursor:pointer">ÐÑÐ¼ÐµÐ½Ð°</button>
        </div>
      </div>
    </div>
  </div>`;
}

async function saveBuiltinPw(role) {
  const el = document.getElementById('bpw-' + role);
  if (!el || !el.value.trim()) return;
  if (el.value.trim().length < 6) { showToast('â ÐÐ¸Ð½Ð¸Ð¼ÑÐ¼ 6 ÑÐ¸Ð¼Ð²Ð¾Ð»Ð¾Ð²'); return; }
  ROLE_PASSWORDS[role] = await sha256(el.value.trim());
  savePasswords();
  el.value = '';
  el.placeholder = 'â Ð¡Ð¾ÑÑÐ°Ð½ÐµÐ½Ð¾';
  setTimeout(() => { el.placeholder = 'â¢â¢â¢â¢â¢â¢â¢â¢'; }, 2000);
  showToast('ð ÐÐ°ÑÐ¾Ð»Ñ ÑÐ¾ÑÑÐ°Ð½ÑÐ½ (ÑÐµÑÐ¸ÑÐ¾Ð²Ð°Ð½)');
}

async function saveCustomPw(key) {
  const el = document.getElementById('cpw-' + key);
  if (!el || !el.value.trim()) return;
  if (el.value.trim().length < 6) { showToast('â ÐÐ¸Ð½Ð¸Ð¼ÑÐ¼ 6 ÑÐ¸Ð¼Ð²Ð¾Ð»Ð¾Ð²'); return; }
  const u = customUsers.find(x => x.key === key);
  if (u) {
    u.password = await sha256(el.value.trim());
    lsw('kd_custom_users', customUsers);
    el.value = '';
    el.placeholder = 'â Ð¡Ð¾ÑÑÐ°Ð½ÐµÐ½Ð¾';
    setTimeout(() => { el.placeholder = 'â¢â¢â¢â¢â¢â¢â¢â¢'; }, 2000);
    showToast('ð ÐÐ°ÑÐ¾Ð»Ñ ÑÐ¾ÑÑÐ°Ð½ÑÐ½ (ÑÐµÑÐ¸ÑÐ¾Ð²Ð°Ð½)');
  }
}

function deleteCustomUser(key) {
  if (!confirm('Ð£Ð´Ð°Ð»Ð¸ÑÑ Ð¿Ð¾Ð»ÑÐ·Ð¾Ð²Ð°ÑÐµÐ»Ñ?')) return;
  customUsers = customUsers.filter(u => u.key !== key);
  lsw('kd_custom_users', customUsers);
  renderUserMgmt();
}

function showAddUserForm() {
  const f = document.getElementById('addUserForm');
  if (f) f.style.display = 'block';
}

async function saveNewUser() {
  const name = (document.getElementById('nu-name')?.value || '').trim();
  const key = (document.getElementById('nu-key')?.value || '').trim().toLowerCase().replace(/[^a-z0-9_]/g,'');
  const pass = (document.getElementById('nu-pass')?.value || '').trim();
  const role = document.getElementById('nu-role')?.value || 'manager';
  const icon = (document.getElementById('nu-icon')?.value || '').trim();
  if (!name || !key || !pass) { showToast('â ÐÐ°Ð¿Ð¾Ð»Ð½Ð¸ÑÐµ Ð¸Ð¼Ñ, Ð»Ð¾Ð³Ð¸Ð½ Ð¸ Ð¿Ð°ÑÐ¾Ð»Ñ'); return; }
  if (pass.length < 6) { showToast('â ÐÐ°ÑÐ¾Ð»Ñ Ð¼Ð¸Ð½Ð¸Ð¼ÑÐ¼ 6 ÑÐ¸Ð¼Ð²Ð¾Ð»Ð¾Ð²'); return; }
  if (ROLES[key] || customUsers.find(u => u.key === key)) { showToast('â ÐÐ¾Ð³Ð¸Ð½ ÑÐ¶Ðµ Ð·Ð°Ð½ÑÑ'); return; }
  const passHash = await sha256(pass);
  customUsers.push({ key, name, password: passHash, role, icon: icon || null });
  lsw('kd_custom_users', customUsers);
  lsw('kd_cu_hashed', true);
  initLogin();
  renderUserMgmt();
  showToast('â ÐÐ¾Ð»ÑÐ·Ð¾Ð²Ð°ÑÐµÐ»Ñ Ð´Ð¾Ð±Ð°Ð²Ð»ÐµÐ½');
}

function showToast(msg) {
  const t = document.createElement('div');
  t.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#00ff88;color:#050d1a;padding:8px 20px;border-radius:8px;font-weight:600;font-size:13px;z-index:99999;pointer-events:none';
  t.textContent = 'â ' + msg;
// ===== ÐÐÐ¢ÐÐ ÐÐÐÐ¦ÐÐ¯ Ð Ð ÐÐÐ =====

const ROLES = {
  admin:       { l: 'ÐÐ´Ð¼Ð¸Ð½Ð¸ÑÑÑÐ°ÑÐ¾Ñ', i: 'ð', c: '#1e3a8a', bg: '#dbeafe', d: 'ÐÐ¾Ð»Ð½ÑÐ¹ Ð´Ð¾ÑÑÑÐ¿' },
  manager:     { l: 'ÐÐµÐ½ÐµÐ´Ð¶ÐµÑ',      i: 'ð¼', c: '#064e3b', bg: '#d1fae5', d: 'ÐÐ°ÐºÐ°Ð·Ñ (Ð±ÐµÐ· ÑÐµÐ½)' },
  constructor: { l: 'ÐÐ¾Ð½ÑÑÑÑÐºÑÐ¾Ñ',   i: 'ð§', c: '#4c1d95', bg: '#ede9fe', d: 'Ð¢ÐµÑÐ½Ð¸ÑÐµÑÐºÐ¸Ðµ Ð´Ð°Ð½Ð½ÑÐµ' },
  technolog:   { l: 'Ð¢ÐµÑÐ½Ð¾Ð»Ð¾Ð³',      i: 'âï¸', c: '#134e4a', bg: '#ccfbf1', d: 'Ð¢ÐµÑÐ½Ð¾Ð»Ð¾Ð³Ð¸ÑÐµÑÐºÐ¸Ðµ Ð´Ð°Ð½Ð½ÑÐµ' },
  logist:      { l: 'ÐÐ¾Ð³Ð¸ÑÑ',        i: 'ð', c: '#0c4a6e', bg: '#e0f2fe', d: 'ÐÐ¾ÑÑÐ°Ð²ÐºÐ° Ð¸ ÑÑÐ¾ÐºÐ¸' },
  goszakup:    { l: 'ÐÐ¾ÑÐ·Ð°ÐºÑÐ¿ÑÐ¸Ðº',   i: 'ð', c: '#881337', bg: '#ffe4e6', d: 'ÐÐ¾Ð±Ð°Ð²Ð»ÐµÐ½Ð¸Ðµ/ÑÐ´Ð°Ð»ÐµÐ½Ð¸Ðµ' }
};

const BADGES = {
  admin:       'background:#1e3a8a;color:#93c5fd',
  manager:     'background:#064e3b;color:#6ee7b7',
  constructor: 'background:#4c1d95;color:#ddd6fe',
  technolog:   'background:#134e4a;color:#99f6e4',
  logist:      'background:#0c4a6e;color:#bae6fd',
  goszakup:    'background:#881337;color:#fda4af'
};

// ÐÐ°ÑÐ¾Ð»Ð¸ (ÑÑÐ°Ð½ÑÑÑÑ Ð»Ð¾ÐºÐ°Ð»ÑÐ½Ð¾, admin Ð¼Ð¾Ð¶ÐµÑ Ð¼ÐµÐ½ÑÑÑ)
const DEFAULT_PASSWORDS = {
  admin:       'kazdemeu-nan',
  manager:     'manager2026',
  constructor: 'const2026',
  technolog:   'tech2026',
  logist:      'logist2026',
  goszakup:    'zakup2026'
};

let ROLE_PASSWORDS = Object.assign({}, DEFAULT_PASSWORDS, ls('kd_passwords', {}));
const savePasswords = () => lsw('kd_passwords', ROLE_PASSWORDS);

// Ð¢ÐµÐºÑÑÐ¸Ð¹ Ð¿Ð¾Ð»ÑÐ·Ð¾Ð²Ð°ÑÐµÐ»Ñ
let currentRole = null;
let currentUserName = null; // for custom users

// Custom users stored in localStorage
let customUsers = ls('kd_custom_users', []);

// ÐÐ½Ð¸ÑÐ¸Ð°Ð»Ð¸Ð·Ð°ÑÐ¸Ñ ÑÐºÑÐ°Ð½Ð° Ð²ÑÐ¾Ð´Ð°
function initLogin() {
  const list = document.getElementById('rlist');
  const builtIn = Object.entries(ROLES).map(([k, v]) => `
    <div class="ritem" onclick="selectRole('${k}',null)" data-r="${k}">
      <div class="rico" style="background:${v.c};color:#fff">${v.i}</div>
      <div class="rinfo"><b>${v.l}</b><span>${v.d}</span></div>
    </div>`).join('');
  const custom = customUsers.map(u => {
    const base = ROLES[u.role] || ROLES.manager;
    return `<div class="ritem" onclick="selectRole('${u.key}','custom')" data-r="${u.key}">
      <div class="rico" style="background:${base.c};color:#fff">${u.icon || base.i}</div>
      <div class="rinfo"><b>${u.name}</b><span>${base.l} (Ð¿Ð¾Ð»ÑÐ·.)</span></div>
    </div>`;
  }).join('');
  list.innerHTML = builtIn + (custom ? `<div style="font-size:10px;color:#64748b;padding:4px 6px;text-transform:uppercase;letter-spacing:.06em">ÐÐ¾Ð»ÑÐ·Ð¾Ð²Ð°ÑÐµÐ»Ð¸</div>` + custom : '');
}

function selectRole(r, type) {
  currentRole = r;
  window.currentRole = r;
  document.querySelectorAll('.ritem').forEach(el => el.classList.toggle('on', el.dataset.r === r));
  document.getElementById('lbtn').disabled = false;
}

async function doLogin() {
  if (!currentRole) return;

  const customUser = customUsers.find(u => u.key === currentRole);
  const labelName = customUser ? customUser.name : (ROLES[currentRole] ? ROLES[currentRole].l : currentRole);
  const rateKey = currentRole;

  // Rate limiting check
  const lockMins = isLocked(rateKey);
  if (lockMins > 0) {
    showLoginError(`ð Ð¡Ð»Ð¸ÑÐºÐ¾Ð¼ Ð¼Ð½Ð¾Ð³Ð¾ Ð¿Ð¾Ð¿ÑÑÐ¾Ðº. ÐÐ¾Ð´Ð¾Ð¶Ð´Ð¸ÑÐµ ${lockMins} Ð¼Ð¸Ð½.`);
    return;
  }

  const pass = prompt(`ÐÐ²ÐµÐ´Ð¸ÑÐµ Ð¿Ð°ÑÐ¾Ð»Ñ Ð´Ð»Ñ: ${labelName}`);
  if (!pass) return;

  // Hash the entered password for comparison
  const passHash = await sha256(pass);

  let authenticated = false;

  if (customUser) {
    const storedHash = /^[0-9a-f]{64}$/.test(customUser.password)
      ? customUser.password : await sha256(customUser.password);
    if (passHash !== storedHash) {
      const d = recordFailedAttempt(rateKey);
      const left = MAX_ATTEMPTS - d.count;
      showLoginError(left > 0 ? `â ÐÐµÐ²ÐµÑÐ½ÑÐ¹ Ð¿Ð°ÑÐ¾Ð»Ñ. ÐÑÑÐ°Ð»Ð¾ÑÑ Ð¿Ð¾Ð¿ÑÑÐ¾Ðº: ${left}` : 'ð ÐÐºÐºÐ°ÑÐ½Ñ Ð·Ð°Ð±Ð»Ð¾ÐºÐ¸ÑÐ¾Ð²Ð°Ð½ Ð½Ð° 5 Ð¼Ð¸Ð½ÑÑ');
      return;
    }
    currentUserName = customUser.name;
    const baseRole = customUser.role;
    currentRole = baseRole;
    window.currentRole = baseRole;
    window._customUserKey = customUser.key;
    window._customUserName = customUser.name;
    window._customUserBaseRole = baseRole;
    authenticated = true;
  } else {
    const storedHash = ROLE_PASSWORDS[currentRole];
    const expected = (storedHash && /^[0-9a-f]{64}$/.test(storedHash))
      ? storedHash : await sha256(storedHash || '');
    if (passHash !== expected) {
      const d = recordFailedAttempt(rateKey);
      const left = MAX_ATTEMPTS - d.count;
      showLoginError(left > 0 ? `â ÐÐµÐ²ÐµÑÐ½ÑÐ¹ Ð¿Ð°ÑÐ¾Ð»Ñ. ÐÑÑÐ°Ð»Ð¾ÑÑ Ð¿Ð¾Ð¿ÑÑÐ¾Ðº: ${left}` : 'ð ÐÐºÐºÐ°ÑÐ½Ñ Ð·Ð°Ð±Ð»Ð¾ÐºÐ¸ÑÐ¾Ð²Ð°Ð½ Ð½Ð° 5 Ð¼Ð¸Ð½ÑÑ');
      return;
    }
    currentUserName = null;
    window._customUserKey = null;
    window._customUserName = null;
    window._customUserBaseRole = null;
    authenticated = true;
  }

  if (!authenticated) return;
  clearRate(rateKey);
  createSession(currentRole, currentUserName || ROLES[currentRole]?.l || currentRole);

  // Show app
  document.getElementById('loginWrap').style.display = 'none';
  const app = document.getElementById('app');
  app.style.display = 'flex';

  const R = ROLES[currentRole];
  const displayName = currentUserName || R.l;
  document.getElementById('tbadge').textContent = displayName;
  document.getElementById('tbadge').style.cssText = BADGES[currentRole];
  document.getElementById('snav').style.display = 'flex';

  if (currentRole === 'admin') {
    document.getElementById('navtabs').style.display = 'flex';
    document.getElementById('btnPassSettings').style.display = 'inline-block';
  }

  // Session expiry warning
  setTimeout(() => {
    if (getSession()) showToast('â ï¸ Ð¡ÐµÑÑÐ¸Ñ Ð¸ÑÑÐµÐºÐ°ÐµÑ ÑÐµÑÐµÐ· 30 Ð¼Ð¸Ð½ÑÑ');
  }, SESSION_TTL - 30 * 60 * 1000);
  setTimeout(() => {
    if (getSession()) { clearSession(); doLogout(); showLoginError('â±ï¸ Ð¡ÐµÑÑÐ¸Ñ Ð¸ÑÑÐµÐºÐ»Ð°. ÐÐ¾Ð¹Ð´Ð¸ÑÐµ ÑÐ½Ð¾Ð²Ð°.'); }
  }, SESSION_TTL);

  applyZoom();
  if (typeof initNavTabs === 'function') initNavTabs();
  await loadAllData();
  startRealtimeSync();
  updateNavVisibility();
  goPage('contracts');
}

function showLoginError(msg) {
  let el = document.getElementById('loginErr');
  if (!el) {
    el = document.createElement('div');
    el.id = 'loginErr';
    el.style.cssText = 'margin-top:10px;padding:9px 13px;background:rgba(255,71,87,0.15);border:1px solid rgba(255,71,87,0.4);border-radius:7px;color:#ff4757;font-size:12px;text-align:center';
    document.getElementById('lbtn').insertAdjacentElement('afterend', el);
  }
  el.textContent = msg;
  setTimeout(() => { if (el.parentNode) el.textContent = ''; }, 5000);
}

function doLogout() {
  currentRole = null;
  window.currentRole = null;
  currentUserName = null;
  window._customUserKey = null;
  window._customUserName = null;
  window._customUserBaseRole = null;
  document.getElementById('app').style.display = 'none';
  document.getElementById('loginWrap').style.display = 'flex';
  document.getElementById('navtabs').style.display = 'none';
  document.getElementById('btnPassSettings').style.display = 'none';
  document.getElementById('snav').style.display = 'none';
  document.querySelectorAll('.ritem').forEach(el => el.classList.remove('on'));
  document.getElementById('lbtn').disabled = true;
  stopRealtimeSync();
  clearSession();
  initLogin();
}

// ===== USER MANAGEMENT =====
function openPasswordSettings() {
  if (currentRole !== 'admin') return;
  customUsers = ls('kd_custom_users', []);
  renderUserMgmt();
}

function renderUserMgmt() {
  const overlay = document.getElementById('userMgmtOverlay') || (() => {
    const el = document.createElement('div');
    el.id = 'userMgmtOverlay';
    el.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9000;display:flex;align-items:center;justify-content:center';
    document.body.appendChild(el);
    return el;
  })();

  const builtinRoles = Object.entries(ROLES);

  overlay.innerHTML = `
  <div style="background:#0d1a2e;border:1px solid rgba(0,212,255,0.3);border-radius:12px;width:700px;max-width:95vw;max-height:90vh;overflow-y:auto;padding:24px;box-shadow:0 0 40px rgba(0,212,255,0.15)">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
      <h2 style="font-size:16px;font-weight:700;color:#00d4ff;font-family:Orbitron,sans-serif">ð Ð£Ð¿ÑÐ°Ð²Ð»ÐµÐ½Ð¸Ðµ Ð¿Ð¾Ð»ÑÐ·Ð¾Ð²Ð°ÑÐµÐ»ÑÐ¼Ð¸</h2>
      <button onclick="document.getElementById('userMgmtOverlay').remove()" style="background:none;border:none;color:#64748b;font-size:20px;cursor:pointer">â</button>
    </div>

    <div style="margin-bottom:20px">
      <div style="font-size:11px;font-weight:700;color:#00d4ff;text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px">ÐÑÑÑÐ¾ÐµÐ½Ð½ÑÐµ ÑÐ¾Ð»Ð¸</div>
      ${builtinRoles.map(([k, v]) => `
        <div style="display:flex;align-items:center;gap:10px;padding:9px 12px;background:rgba(7,15,29,0.6);border:1px solid rgba(0,212,255,0.1);border-radius:8px;margin-bottom:6px">
          <div style="width:32px;height:32px;border-radius:6px;background:${v.c};display:flex;align-items:center;justify-content:center;font-size:16px">${v.i}</div>
          <div style="flex:1"><b style="color:#e2e8f0;font-size:13px">${v.l}</b><div style="font-size:10px;color:#64748b">${v.d}</div></div>
          <div style="display:flex;align-items:center;gap:6px">
            <span style="font-size:11px;color:#64748b">ÐÐ°ÑÐ¾Ð»Ñ:</span>
            <input type="password" placeholder="â¢â¢â¢â¢â¢â¢â¢â¢" id="bpw-${k}" style="width:140px;padding:5px 8px;background:#0a1628;border:1px solid rgba(0,212,255,0.2);border-radius:5px;color:#e2e8f0;font-size:12px;outline:none" ${k==='admin' ? 'readonly style="width:140px;padding:5px 8px;background:#0a1628;border:1px solid rgba(0,212,255,0.1);border-radius:5px;color:#64748b;font-size:12px"' : ''}>
            ${k !== 'admin' ? `<button onclick="saveBuiltinPw('${k}')" style="padding:5px 10px;background:rgba(0,212,255,0.1);border:1px solid rgba(0,212,255,0.25);border-radius:5px;color:#00d4ff;font-size:11px;cursor:pointer">â</button>` : ''}
          </div>
        </div>`).join('')}
    </div>

    <div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <div style="font-size:11px;font-weight:700;color:#00d4ff;text-transform:uppercase;letter-spacing:.08em">ÐÐ¾Ð»ÑÐ·Ð¾Ð²Ð°ÑÐµÐ»Ð¸</div>
        <button onclick="showAddUserForm()" style="padding:5px 12px;background:rgba(0,255,136,0.1);border:1px solid rgba(0,255,136,0.3);border-radius:6px;color:#00ff88;font-size:12px;cursor:pointer;font-weight:600">+ ÐÐ¾Ð±Ð°Ð²Ð¸ÑÑ</button>
      </div>
      <div id="customUsersList">
        ${customUsers.length === 0 ? '<div style="color:#64748b;font-size:12px;text-align:center;padding:16px">ÐÐµÑ Ð¿Ð¾Ð»ÑÐ·Ð¾Ð²Ð°ÑÐµÐ»ÐµÐ¹</div>' : customUsers.map(u => {
          const base = ROLES[u.role] || ROLES.manager;
          return `<div style="display:flex;align-items:center;gap:10px;padding:9px 12px;background:rgba(7,15,29,0.6);border:1px solid rgba(0,212,255,0.1);border-radius:8px;margin-bottom:6px">
            <div style="width:32px;height:32px;border-radius:6px;background:${base.c};display:flex;align-items:center;justify-content:center;font-size:16px">${u.icon || base.i}</div>
            <div style="flex:1">
              <b style="color:#e2e8f0;font-size:13px">${u.name}</b>
              <div style="font-size:10px;color:#64748b">@${u.key} Â· ${base.l}</div>
            </div>
            <input type="text" value="${u.password}" id="cpw-${u.key}" style="width:130px;padding:5px 8px;background:#0a1628;border:1px solid rgba(0,212,255,0.2);border-radius:5px;color:#e2e8f0;font-size:12px;outline:none" placeholder="ÐÐ°ÑÐ¾Ð»Ñ">
            <button onclick="saveCustomPw('${u.key}')" style="padding:5px 8px;background:rgba(0,212,255,0.1);border:1px solid rgba(0,212,255,0.25);border-radius:5px;color:#00d4ff;font-size:11px;cursor:pointer">â</button>
            <button onclick="deleteCustomUser('${u.key}')" style="padding:5px 8px;background:rgba(255,71,87,0.15);border:1px solid rgba(255,71,87,0.3);border-radius:5px;color:#ff4757;font-size:11px;cursor:pointer">â</button>
          </div>`;
        }).join('')}
      </div>
      <div id="addUserForm" style="display:none;margin-top:12px;padding:14px;background:rgba(0,212,255,0.04);border:1px dashed rgba(0,212,255,0.25);border-radius:8px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
          <div><label style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.06em;display:block;margin-bottom:3px">ÐÐ¼Ñ</label><input id="nu-name" type="text" placeholder="ÐÐ²Ð°Ð½ ÐÐ²Ð°Ð½Ð¾Ð²" style="width:100%;padding:7px 9px;background:#0a1628;border:1px solid rgba(0,212,255,0.25);border-radius:6px;color:#e2e8f0;font-size:12px;outline:none"></div>
          <div><label style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.06em;display:block;margin-bottom:3px">ÐÐ¾Ð³Ð¸Ð½</label><input id="nu-key" type="text" placeholder="ivan" style="width:100%;padding:7px 9px;background:#0a1628;border:1px solid rgba(0,212,255,0.25);border-radius:6px;color:#e2e8f0;font-size:12px;outline:none"></div>
          <div><label style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.06em;display:block;margin-bottom:3px">ÐÐ°ÑÐ¾Ð»Ñ</label><input id="nu-pass" type="text" placeholder="Ð¿Ð°ÑÐ¾Ð»Ñ" style="width:100%;padding:7px 9px;background:#0a1628;border:1px solid rgba(0,212,255,0.25);border-radius:6px;color:#e2e8f0;font-size:12px;outline:none"></div>
          <div><label style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.06em;display:block;margin-bottom:3px">Ð Ð¾Ð»Ñ</label>
            <select id="nu-role" style="width:100%;padding:7px 9px;background:#0a1628;border:1px solid rgba(0,212,255,0.25);border-radius:6px;color:#e2e8f0;font-size:12px;outline:none">
              ${Object.entries(ROLES).map(([k,v]) => `<option value="${k}">${v.l}</option>`).join('')}
            </select>
          </div>
          <div><label style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.06em;display:block;margin-bottom:3px">ÐÐºÐ¾Ð½ÐºÐ°</label><input id="nu-icon" type="text" placeholder="ð¤" maxlength="2" style="width:100%;padding:7px 9px;background:#0a1628;border:1px solid rgba(0,212,255,0.25);border-radius:6px;color:#e2e8f0;font-size:12px;outline:none"></div>
        </div>
        <div style="display:flex;gap:8px">
          <button onclick="saveNewUser()" style="padding:7px 16px;background:rgba(0,255,136,0.12);border:1px solid rgba(0,255,136,0.3);border-radius:6px;color:#00ff88;font-size:12px;cursor:pointer;font-weight:600">â Ð¡Ð¾Ð·Ð´Ð°ÑÑ</button>
          <button onclick="document.getElementById('addUserForm').style.display='none'" style="padding:7px 12px;background:transparent;border:1px solid rgba(100,116,139,0.3);border-radius:6px;color:#64748b;font-size:12px;cursor:pointer">ÐÑÐ¼ÐµÐ½Ð°</button>
        </div>
      </div>
    </div>
  </div>`;
}

async function saveBuiltinPw(role) {
  const el = document.getElementById('bpw-' + role);
  if (!el || !el.value.trim()) return;
  if (el.value.trim().length < 6) { showToast('â ÐÐ¸Ð½Ð¸Ð¼ÑÐ¼ 6 ÑÐ¸Ð¼Ð²Ð¾Ð»Ð¾Ð²'); return; }
  ROLE_PASSWORDS[role] = await sha256(el.value.trim());
  savePasswords();
  el.value = '';
  el.placeholder = 'â Ð¡Ð¾ÑÑÐ°Ð½ÐµÐ½Ð¾';
  setTimeout(() => { el.placeholder = 'â¢â¢â¢â¢â¢â¢â¢â¢'; }, 2000);
  showToast('ð ÐÐ°ÑÐ¾Ð»Ñ ÑÐ¾ÑÑÐ°Ð½ÑÐ½ (ÑÐµÑÐ¸ÑÐ¾Ð²Ð°Ð½)');
}

async function saveCustomPw(key) {
  const el = document.getElementById('cpw-' + key);
  if (!el || !el.value.trim()) return;
  if (el.value.trim().length < 6) { showToast('â ÐÐ¸Ð½Ð¸Ð¼ÑÐ¼ 6 ÑÐ¸Ð¼Ð²Ð¾Ð»Ð¾Ð²'); return; }
  const u = customUsers.find(x => x.key === key);
  if (u) {
    u.password = await sha256(el.value.trim());
    lsw('kd_custom_users', customUsers);
    el.value = '';
    el.placeholder = 'â Ð¡Ð¾ÑÑÐ°Ð½ÐµÐ½Ð¾';
    setTimeout(() => { el.placeholder = 'â¢â¢â¢â¢â¢â¢â¢â¢'; }, 2000);
    showToast('ð ÐÐ°ÑÐ¾Ð»Ñ ÑÐ¾ÑÑÐ°Ð½ÑÐ½ (ÑÐµÑÐ¸ÑÐ¾Ð²Ð°Ð½)');
  }
}

function deleteCustomUser(key) {
  if (!confirm('Ð£Ð´Ð°Ð»Ð¸ÑÑ Ð¿Ð¾Ð»ÑÐ·Ð¾Ð²Ð°ÑÐµÐ»Ñ?')) return;
  customUsers = customUsers.filter(u => u.key !== key);
  lsw('kd_custom_users', customUsers);
  renderUserMgmt();
}

function showAddUserForm() {
  const f = document.getElementById('addUserForm');
  if (f) f.style.display = 'block';
}

async function saveNewUser() {
  const name = (document.getElementById('nu-name')?.value || '').trim();
  const key = (document.getElementById('nu-key')?.value || '').trim().toLowerCase().replace(/[^a-z0-9_]/g,'');
  const pass = (document.getElementById('nu-pass')?.value || '').trim();
  const role = document.getElementById('nu-role')?.value || 'manager';
  const icon = (document.getElementById('nu-icon')?.value || '').trim();
  if (!name || !key || !pass) { showToast('â ÐÐ°Ð¿Ð¾Ð»Ð½Ð¸ÑÐµ Ð¸Ð¼Ñ, Ð»Ð¾Ð³Ð¸Ð½ Ð¸ Ð¿Ð°ÑÐ¾Ð»Ñ'); return; }
  if (pass.length < 6) { showToast('â ÐÐ°ÑÐ¾Ð»Ñ Ð¼Ð¸Ð½Ð¸Ð¼ÑÐ¼ 6 ÑÐ¸Ð¼Ð²Ð¾Ð»Ð¾Ð²'); return; }
  if (ROLES[key] || customUsers.find(u => u.key === key)) { showToast('â ÐÐ¾Ð³Ð¸Ð½ ÑÐ¶Ðµ Ð·Ð°Ð½ÑÑ'); return; }
  const passHash = await sha256(pass);
  customUsers.push({ key, name, password: passHash, role, icon: icon || null });
  lsw('kd_custom_users', customUsers);
  lsw('kd_cu_hashed', true);
  initLogin();
  renderUserMgmt();
  showToast('â ÐÐ¾Ð»ÑÐ·Ð¾Ð²Ð°ÑÐµÐ»Ñ Ð´Ð¾Ð±Ð°Ð²Ð»ÐµÐ½');
}

function showToast(msg) {
  const t = document.createElement('div');
  t.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#00ff88;color:#050d1a;padding:8px 20px;border-radius:8px;font-weight:600;font-size:13px;z-index:99999;pointer-events:none';
  t.textContent = 'â ' + msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2000);
}

// ===== RESTORE SESSION ON PAGE RELOAD =====
async function restoreSession() {
  const session = getSession();
  if (!session) return false;

  const role = session.role;
  const R = ROLES[role];
  if (!R) { clearSession(); return false; }

  currentRole = role;
  window.currentRole = role;
  currentUserName = session.name || R.l;

  document.getElementById('loginWrap').style.display = 'none';
  const app = document.getElementById('app');
  app.style.display = 'flex';

  document.getElementById('tbadge').textContent = currentUserName;
  document.getElementById('tbadge').style.cssText = BADGES[role] || '';
  document.getElementById('snav').style.display = 'flex';

  if (role === 'admin') {
    document.getElementById('navtabs').style.display = 'flex';
    document.getElementById('btnPassSettings').style.display = 'inline-block';
  }

  applyZoom();
  if (typeof initNavTabs === 'function') initNavTabs();
  if (typeof loadAllData === 'function') await loadAllData();
  if (typeof startRealtimeSync === 'function') startRealtimeSync();
  if (typeof updateNavVisibility === 'function') updateNavVisibility();
  if (typeof goPage === 'function') goPage('contracts');

  return true;
}

// Permission helpers
const canPrice      = () => currentRole === 'admin';
const canCostPrice  = () => currentRole === 'admin' || currentRole === 'manager';
const canCosts      = () => currentRole === 'admin';
const canManage     = () => currentRole === 'admin' || currentRole === 'goszakup';
const canDelFile    = () => currentRole === 'admin';
const myRoleKey     = () => ({ manager:'manager', constructor:'constructor', technolog:'technolog', logist:'logist' }[currentRole] || null);
