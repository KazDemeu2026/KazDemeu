// === auth.js ===
// ===== АВТОРИЗАЦИЯ И РОЛИ =====

const ROLES = {
  admin:       { l: 'Администратор', i: '👑', c: '#1e3a8a', bg: '#dbeafe', d: 'Полный доступ' },
  manager:     { l: 'Менеджер',      i: '💼', c: '#064e3b', bg: '#d1fae5', d: 'Заказы (без цен)' },
  constructor: { l: 'Конструктор',   i: '🔧', c: '#4c1d95', bg: '#ede9fe', d: 'Технические данные' },
  technolog:   { l: 'Технолог',      i: '⚙️', c: '#134e4a', bg: '#ccfbf1', d: 'Технологические данные' },
  logist:      { l: 'Логист',        i: '🚚', c: '#0c4a6e', bg: '#e0f2fe', d: 'Доставка и сроки' },
  goszakup:    { l: 'Госзакупщик',   i: '📋', c: '#881337', bg: '#ffe4e6', d: 'Добавление/удаление' }
};

const BADGES = {
  admin:       'background:#1e3a8a;color:#93c5fd',
  manager:     'background:#064e3b;color:#6ee7b7',
  constructor: 'background:#4c1d95;color:#ddd6fe',
  technolog:   'background:#134e4a;color:#99f6e4',
  logist:      'background:#0c4a6e;color:#bae6fd',
  goszakup:    'background:#881337;color:#fda4af'
};

const DEFAULT_PASSWORDS = {
  admin: 'kazdemeu-nan', manager: 'manager2026', constructor: 'const2026',
  technolog: 'tech2026', logist: 'logist2026', goszakup: 'zakup2026'
};

let ROLE_PASSWORDS = Object.assign({}, DEFAULT_PASSWORDS, ls('kd_passwords', {}));
const savePasswords = () => lsw('kd_passwords', ROLE_PASSWORDS);

let currentRole = null;
let currentUserName = null;
let customUsers = ls('kd_custom_users', []);

function initLogin() {
  const list = document.getElementById('rlist');
  const builtIn = Object.entries(ROLES).map(([k, v]) =>
    '<div class="ritem" onclick="selectRole(\''+k+'\',null)" data-r="'+k+'">' +
    '<div class="rico" style="background:'+v.c+';color:#fff">'+v.i+'</div>' +
    '<div class="rinfo"><b>'+v.l+'</b><span>'+v.d+'</span></div></div>'
  ).join('');
  const custom = customUsers.map(u => {
    const base = ROLES[u.role] || ROLES.manager;
    return '<div class="ritem" onclick="selectRole(\''+u.key+'\',\'custom\')" data-r="'+u.key+'">' +
      '<div class="rico" style="background:'+base.c+';color:#fff">'+(u.icon||base.i)+'</div>' +
      '<div class="rinfo"><b>'+u.name+'</b><span>'+base.l+' (польз.)</span></div></div>';
  }).join('');
  list.innerHTML = builtIn + (custom ? '<div style="font-size:10px;color:#64748b;padding:4px 6px;text-transform:uppercase">Пользователи</div>' + custom : '');
}

function selectRole(r, type) {
  currentRole = r;
  document.querySelectorAll('.ritem').forEach(el => el.classList.toggle('on', el.dataset.r === r));
  document.getElementById('lbtn').disabled = false;
}

async function doLogin() {
  if (!currentRole) return;
  const customUser = customUsers.find(u => u.key === currentRole);
  const labelName = customUser ? customUser.name : (ROLES[currentRole] ? ROLES[currentRole].l : currentRole);
  const lockMins = isLocked(currentRole);
  if (lockMins > 0) { showLoginError('🔒 Подождите ' + lockMins + ' мин.'); return; }
  const pass = prompt('Введите пароль для: ' + labelName);
  if (!pass) return;
  const passHash = await sha256(pass);
  let authenticated = false;
  if (customUser) {
    const stored = /^[0-9a-f]{64}$/.test(customUser.password) ? customUser.password : await sha256(customUser.password);
    if (passHash !== stored) { const d = recordFailedAttempt(currentRole); showLoginError('❌ Неверный пароль. Осталось: '+(MAX_ATTEMPTS-d.count)); return; }
    currentUserName = customUser.name;
    currentRole = customUser.role;
    window._customUserKey = customUser.key; window._customUserName = customUser.name;
    authenticated = true;
  } else {
    const stored = ROLE_PASSWORDS[currentRole];
    const expected = (stored && /^[0-9a-f]{64}$/.test(stored)) ? stored : await sha256(stored || '');
    if (passHash !== expected) { const d = recordFailedAttempt(currentRole); showLoginError('❌ Неверный пароль. Осталось: '+(MAX_ATTEMPTS-d.count)); return; }
    currentUserName = null; window._customUserKey = null; window._customUserName = null;
    authenticated = true;
  }
  if (!authenticated) return;
  clearRate(currentRole);
  createSession(currentRole, currentUserName || ROLES[currentRole]?.l || currentRole);
  document.getElementById('loginWrap').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  const R = ROLES[currentRole];
  document.getElementById('tbadge').textContent = currentUserName || R.l;
  document.getElementById('tbadge').style.cssText = BADGES[currentRole];
  document.getElementById('snav').style.display = 'flex';
  if (currentRole === 'admin') {
    document.getElementById('navtabs').style.display = 'flex';
    document.getElementById('btnPassSettings').style.display = 'inline-block';
  }
  setTimeout(() => { if (getSession()) showToast('⚠️ Сессия истекает через 30 минут'); }, SESSION_TTL - 30*60*1000);
  setTimeout(() => { if (getSession()) { clearSession(); doLogout(); showLoginError('⏱️ Сессия истекла'); } }, SESSION_TTL);
  applyZoom();
  await loadAllData();
  startRealtimeSync();
  updateNavVisibility();
  goPage('contracts');
}

function showLoginError(msg) {
  let el = document.getElementById('loginErr');
  if (!el) {
    el = document.createElement('div'); el.id = 'loginErr';
    el.style.cssText = 'margin-top:10px;padding:9px 13px;background:rgba(255,71,87,0.15);border:1px solid rgba(255,71,87,0.4);border-radius:7px;color:#ff4757;font-size:12px;text-align:center';
    document.getElementById('lbtn').insertAdjacentElement('afterend', el);
  }
  el.textContent = msg;
  setTimeout(() => { if (el.parentNode) el.textContent = ''; }, 5000);
}

function doLogout() {
  currentRole = null; currentUserName = null;
  window._customUserKey = null; window._customUserName = null;
  document.getElementById('app').style.display = 'none';
  document.getElementById('loginWrap').style.display = 'flex';
  document.getElementById('navtabs').style.display = 'none';
  document.getElementById('btnPassSettings').style.display = 'none';
  document.getElementById('snav').style.display = 'none';
  document.querySelectorAll('.ritem').forEach(el => el.classList.remove('on'));
  document.getElementById('lbtn').disabled = true;
  if (typeof stopRealtimeSync === 'function') stopRealtimeSync();
  clearSession(); initLogin();
}

function openPasswordSettings() {
  if (currentRole !== 'admin') return;
  customUsers = ls('kd_custom_users', []);
  renderUserMgmt();
}

function renderUserMgmt() {
  const overlay = document.getElementById('userMgmtOverlay') || (() => {
    const el = document.createElement('div'); el.id = 'userMgmtOverlay';
    el.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9000;display:flex;align-items:center;justify-content:center';
    document.body.appendChild(el); return el;
  })();
  overlay.innerHTML = '<div style="background:#0d1a2e;border:1px solid rgba(0,212,255,0.3);border-radius:12px;width:600px;max-width:95vw;max-height:90vh;overflow-y:auto;padding:24px">' +
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">' +
    '<h2 style="font-size:16px;font-weight:700;color:#00d4ff">🔑 Управление пользователями</h2>' +
    '<button onclick="document.getElementById(\'userMgmtOverlay\').remove()" style="background:none;border:none;color:#64748b;font-size:20px;cursor:pointer">✕</button></div>' +
    '<div style="margin-bottom:16px">' +
    '<div style="font-size:11px;font-weight:700;color:#00d4ff;text-transform:uppercase;margin-bottom:8px">Встроенные роли</div>' +
    Object.entries(ROLES).map(([k,v]) =>
      '<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:rgba(7,15,29,0.6);border:1px solid rgba(0,212,255,0.1);border-radius:8px;margin-bottom:5px">' +
      '<div style="width:32px;height:32px;border-radius:6px;background:'+v.c+';display:flex;align-items:center;justify-content:center">'+v.i+'</div>' +
      '<div style="flex:1"><b style="color:#e2e8f0">'+v.l+'</b></div>' +
      (k!=='admin' ? '<input type="password" placeholder="Новый пароль" id="bpw-'+k+'" style="width:130px;padding:5px 8px;background:#0a1628;border:1px solid rgba(0,212,255,0.2);border-radius:5px;color:#e2e8f0;font-size:12px;outline:none">' +
      '<button onclick="saveBuiltinPw(\''+k+'\')" style="padding:5px 10px;background:rgba(0,212,255,0.1);border:1px solid rgba(0,212,255,0.25);border-radius:5px;color:#00d4ff;font-size:11px;cursor:pointer">✓</button>' : '') +
      '</div>'
    ).join('') + '</div>' +
    '<div><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">' +
    '<div style="font-size:11px;font-weight:700;color:#00d4ff;text-transform:uppercase">Пользователи</div>' +
    '<button onclick="showAddUserForm()" style="padding:5px 12px;background:rgba(0,255,136,0.1);border:1px solid rgba(0,255,136,0.3);border-radius:6px;color:#00ff88;font-size:12px;cursor:pointer">+ Добавить</button></div>' +
    '<div id="customUsersList">' +
    (customUsers.length===0 ? '<div style="color:#64748b;font-size:12px;text-align:center;padding:16px">Нет пользователей</div>' :
      customUsers.map(u => { const base=ROLES[u.role]||ROLES.manager; return '<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:rgba(7,15,29,0.6);border:1px solid rgba(0,212,255,0.1);border-radius:8px;margin-bottom:5px">' +
        '<div style="width:32px;height:32px;border-radius:6px;background:'+base.c+';display:flex;align-items:center;justify-content:center">'+(u.icon||base.i)+'</div>' +
        '<div style="flex:1"><b style="color:#e2e8f0;font-size:13px">'+u.name+'</b><div style="font-size:10px;color:#64748b">@'+u.key+'</div></div>' +
        '<button onclick="deleteCustomUser(\''+u.key+'\')" style="padding:5px 8px;background:rgba(255,71,87,0.15);border:1px solid rgba(255,71,87,0.3);border-radius:5px;color:#ff4757;font-size:11px;cursor:pointer">✕</button></div>'; }).join('')) +
    '</div>' +
    '<div id="addUserForm" style="display:none;margin-top:12px;padding:14px;background:rgba(0,212,255,0.04);border:1px dashed rgba(0,212,255,0.25);border-radius:8px">' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">' +
    '<div><label style="font-size:10px;color:#64748b;display:block;margin-bottom:3px">Имя</label><input id="nu-name" type="text" placeholder="Иван Иванов" style="width:100%;padding:7px;background:#0a1628;border:1px solid rgba(0,212,255,0.25);border-radius:6px;color:#e2e8f0;font-size:12px;outline:none"></div>' +
    '<div><label style="font-size:10px;color:#64748b;display:block;margin-bottom:3px">Логин</label><input id="nu-key" type="text" placeholder="ivan" style="width:100%;padding:7px;background:#0a1628;border:1px solid rgba(0,212,255,0.25);border-radius:6px;color:#e2e8f0;font-size:12px;outline:none"></div>' +
    '<div><label style="font-size:10px;color:#64748b;display:block;margin-bottom:3px">Пароль</label><input id="nu-pass" type="text" placeholder="пароль" style="width:100%;padding:7px;background:#0a1628;border:1px solid rgba(0,212,255,0.25);border-radius:6px;color:#e2e8f0;font-size:12px;outline:none"></div>' +
    '<div><label style="font-size:10px;color:#64748b;display:block;margin-bottom:3px">Роль</label><select id="nu-role" style="width:100%;padding:7px;background:#0a1628;border:1px solid rgba(0,212,255,0.25);border-radius:6px;color:#e2e8f0;font-size:12px;outline:none">' +
    Object.entries(ROLES).map(([k,v])=>'<option value="'+k+'">'+v.l+'</option>').join('') + '</select></div>' +
    '<div><label style="font-size:10px;color:#64748b;display:block;margin-bottom:3px">Иконка</label><input id="nu-icon" type="text" placeholder="👤" maxlength="2" style="width:100%;padding:7px;background:#0a1628;border:1px solid rgba(0,212,255,0.25);border-radius:6px;color:#e2e8f0;font-size:12px;outline:none"></div>' +
    '</div><div style="display:flex;gap:8px">' +
    '<button onclick="saveNewUser()" style="padding:7px 16px;background:rgba(0,255,136,0.12);border:1px solid rgba(0,255,136,0.3);border-radius:6px;color:#00ff88;font-size:12px;cursor:pointer;font-weight:600">✓ Создать</button>' +
    '<button onclick="document.getElementById(\'addUserForm\').style.display=\'none\'" style="padding:7px 12px;background:transparent;border:1px solid rgba(100,116,139,0.3);border-radius:6px;color:#64748b;font-size:12px;cursor:pointer">Отмена</button>' +
    '</div></div></div></div>';
}

async function saveBuiltinPw(role) {
  const el = document.getElementById('bpw-' + role);
  if (!el || !el.value.trim() || el.value.trim().length < 6) { showToast('❌ Минимум 6 символов'); return; }
  ROLE_PASSWORDS[role] = await sha256(el.value.trim()); savePasswords();
  el.value = ''; el.placeholder = '✅ Сохранено'; setTimeout(() => { el.placeholder = '••••••••'; }, 2000);
  showToast('🔐 Пароль сохранён');
}

async function saveCustomPw(key) {
  const el = document.getElementById('cpw-' + key);
  if (!el || !el.value.trim() || el.value.trim().length < 6) { showToast('❌ Минимум 6 символов'); return; }
  const u = customUsers.find(x => x.key === key);
  if (u) { u.password = await sha256(el.value.trim()); lsw('kd_custom_users', customUsers); el.value=''; showToast('🔐 Пароль сохранён'); }
}

function deleteCustomUser(key) {
  if (!confirm('Удалить пользователя?')) return;
  customUsers = customUsers.filter(u => u.key !== key);
  lsw('kd_custom_users', customUsers); renderUserMgmt();
}

function showAddUserForm() {
  const f = document.getElementById('addUserForm'); if (f) f.style.display = 'block';
}

async function saveNewUser() {
  const name = (document.getElementById('nu-name')?.value||'').trim();
  const key = (document.getElementById('nu-key')?.value||'').trim().toLowerCase().replace(/[^a-z0-9_]/g,'');
  const pass = (document.getElementById('nu-pass')?.value||'').trim();
  const role = document.getElementById('nu-role')?.value || 'manager';
  const icon = (document.getElementById('nu-icon')?.value||'').trim();
  if (!name||!key||!pass) { showToast('❌ Заполните имя, логин и пароль'); return; }
  if (pass.length < 6) { showToast('❌ Пароль минимум 6 символов'); return; }
  if (ROLES[key] || customUsers.find(u=>u.key===key)) { showToast('❌ Логин занят'); return; }
  customUsers.push({ key, name, password: await sha256(pass), role, icon: icon||null });
  lsw('kd_custom_users', customUsers); lsw('kd_cu_hashed', true);
  initLogin(); renderUserMgmt(); showToast('✅ Пользователь добавлен');
}

function showToast(msg) {
  const t = document.createElement('div');
  t.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#00ff88;color:#050d1a;padding:8px 20px;border-radius:8px;font-weight:600;font-size:13px;z-index:99999;pointer-events:none';
  t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 2000);
}

// ===== RESTORE SESSION =====
async function restoreSession() {
  const session = getSession();
  if (!session) return false;
  const role = session.role;
  const R = ROLES[role];
  if (!R) { clearSession(); return false; }
  currentRole = role;
  currentUserName = session.name || R.l;
  document.getElementById('loginWrap').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  document.getElementById('tbadge').textContent = currentUserName;
  document.getElementById('tbadge').style.cssText = BADGES[role] || '';
  document.getElementById('snav').style.display = 'flex';
  if (role === 'admin') {
    document.getElementById('navtabs').style.display = 'flex';
    document.getElementById('btnPassSettings').style.display = 'inline-block';
  }
  applyZoom();
  if (typeof loadAllData === 'function') await loadAllData();
  if (typeof startRealtimeSync === 'function') startRealtimeSync();
  if (typeof updateNavVisibility === 'function') updateNavVisibility();
  if (typeof goPage === 'function') goPage('contracts');
  return true;
}

// Permission helpers
const canPrice     = () => currentRole === 'admin';
const canCostPrice = () => currentRole === 'admin' || currentRole === 'manager';
const canCosts     = () => currentRole === 'admin';
const canManage    = () => currentRole === 'admin' || currentRole === 'goszakup';
const canDelFile   = () => currentRole === 'admin';
const myRoleKey    = () => ({ manager:'manager', constructor:'constructor', technolog:'technolog', logist:'logist' }[currentRole] || null);
