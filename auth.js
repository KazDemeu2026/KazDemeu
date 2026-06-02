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

// Пароли (хранятся локально, admin может менять)
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

// Текущий пользователь
let currentRole = null;

// Инициализация экрана входа
function initLogin() {
  const list = document.getElementById('rlist');
  list.innerHTML = Object.entries(ROLES).map(([k, v]) => `
    <div class="ritem" onclick="selectRole('${k}')" data-r="${k}">
      <div class="rico" style="background:${v.c};color:#fff">${v.i}</div>
      <div class="rinfo"><b>${v.l}</b><span>${v.d}</span></div>
    </div>`).join('');
}

function selectRole(r) {
  currentRole = r;
  document.querySelectorAll('.ritem').forEach(el => el.classList.toggle('on', el.dataset.r === r));
  document.getElementById('lbtn').disabled = false;
}

async function doLogin() {
  if (!currentRole) return;
  
  const pass = prompt(`Введите пароль для роли: ${ROLES[currentRole].l}`);
  if (!pass) return;
  
  if (pass !== ROLE_PASSWORDS[currentRole]) {
    alert('❌ Неверный пароль!');
    return;
  }

  // Show app
  document.getElementById('loginWrap').style.display = 'none';
  const app = document.getElementById('app');
  app.style.display = 'flex';
  
  const R = ROLES[currentRole];
  document.getElementById('tbadge').textContent = R.l;
  document.getElementById('tbadge').style.cssText = BADGES[currentRole];
  document.getElementById('snav').style.display = 'flex';

  // Admin extras
  if (currentRole === 'admin') {
    document.getElementById('navtabs').style.display = 'flex';
    document.getElementById('btnPassSettings').style.display = 'inline-block';
  }

  applyZoom();
  
  // Load data from Supabase
  await loadAllData();
  
  // Start realtime updates
  startRealtimeSync();
  
  // Render
  goPage('contracts');
}

function doLogout() {
  currentRole = null;
  document.getElementById('app').style.display = 'none';
  document.getElementById('loginWrap').style.display = 'flex';
  document.getElementById('navtabs').style.display = 'none';
  document.getElementById('btnPassSettings').style.display = 'none';
  document.getElementById('snav').style.display = 'none';
  document.querySelectorAll('.ritem').forEach(el => el.classList.remove('on'));
  document.getElementById('lbtn').disabled = true;
  stopRealtimeSync();
}

// Password management
function openPasswordSettings() {
  if (currentRole !== 'admin') return;
  
  const roleNames = { manager:'Менеджер', constructor:'Конструктор', technolog:'Технолог', logist:'Логист', goszakup:'Госзакупщик' };
  
  let html = `
    <style>*{box-sizing:border-box;font-family:Inter,sans-serif}body{padding:24px;background:#f1f5f9}h2{margin-bottom:16px;color:#0f1923}
    .field{margin-bottom:12px}label{display:block;font-size:11px;font-weight:700;color:#6b7280;margin-bottom:4px;text-transform:uppercase}
    input{width:100%;padding:8px 12px;border:1px solid #e5e7eb;border-radius:6px;font-size:13px}
    button{width:100%;padding:12px;background:#1a56db;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;margin-top:8px}</style>
    <h2>🔑 Управление паролями</h2>
    <div style="background:#fef3c7;border:1px solid #fbbf24;border-radius:8px;padding:10px;margin-bottom:16px;font-size:12px;color:#92400e">⚠️ Пароль администратора: <b>kazdemeu-nan</b> (не изменяется)</div>`;
  
  Object.entries(roleNames).forEach(([r, name]) => {
    html += `<div class="field"><label>${name}</label><input type="text" id="p-${r}" value="${ROLE_PASSWORDS[r]}"></div>`;
  });
  html += `<button onclick="saveNewPasswords()">✓ Сохранить</button>`;
  
  const w = window.open('', '_blank', 'width=480,height=500');
  w.document.write(html);
  
  w.saveNewPasswords = () => {
    Object.keys(roleNames).forEach(r => {
      const el = w.document.getElementById(`p-${r}`);
      if (el && el.value.trim()) ROLE_PASSWORDS[r] = el.value.trim();
    });
    savePasswords();
    w.alert('✅ Пароли сохранены!');
    w.close();
  };
}

// Permission helpers
const canPrice   = () => currentRole === 'admin';
const canCosts   = () => currentRole === 'admin';
const canManage  = () => currentRole === 'admin' || currentRole === 'goszakup';
const canDelFile = () => currentRole === 'admin';
const myRoleKey  = () => ({ manager:'manager', constructor:'constructor', technolog:'technolog', logist:'logist' }[currentRole] || null);
