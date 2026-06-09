const ROLES = {
  admin:       { l: 'Администратор', i: '👑', c: '#1e3a8a', bg: '#dbeafe', d: 'Полный доступ' },
  manager:     { l: 'Менеджер',      i: '💼', c: '#064e3b', bg: '#d1fae5', d: 'Заказы и статусы' },
  constructor: { l: 'Конструктор',   i: '🔧', c: '#4c1d95', bg: '#ede9fe', d: 'Технические данные' },
  technolog:   { l: 'Технолог',      i: '⚙️', c: '#134e4a', bg: '#ccfbf1', d: 'Технология и сроки' },
  logist:      { l: 'Логист',        i: '🚚', c: '#0c4a6e', bg: '#e0f2fe', d: 'Доставка и исполнение' },
  goszakup:    { l: 'Госзакупщик',   i: '📋', c: '#881337', bg: '#ffe4e6', d: 'Добавление и закупки' }
};

const BADGES = {
  admin:       'background:#1e3a8a;color:#93c5fd',
  manager:     'background:#064e3b;color:#6ee7b7',
  constructor: 'background:#4c1d95;color:#ddd6fe',
  technolog:   'background:#134e4a;color:#99f6e4',
  logist:      'background:#0c4a6e;color:#bae6fd',
  goszakup:    'background:#881337;color:#fda4af'
};

let selectedRole = null;
let currentUserName = null;
let currentRole = null;

function initLogin() {
  const list = document.getElementById('rlist');
  if (!list) return;
  list.innerHTML = Object.entries(ROLES).map(([key, role]) => `
    <div class="ritem" onclick="selectRole('${key}')" data-role="${esc(key)}">
      <div class="rico" style="background:${role.c};color:#fff">${role.i}</div>
      <div class="rinfo"><b>${esc(role.l)}</b><span>${esc(role.d)}</span></div>
    </div>
  `).join('');
}

function selectRole(roleKey) {
  selectedRole = roleKey;
  document.querySelectorAll('.ritem').forEach(el => {
    el.classList.toggle('on', el.dataset.role === roleKey);
  });
  document.getElementById('lbtn').disabled = false;
}

async function doLogin() {
  if (!selectedRole) return;
  const roleMeta = ROLES[selectedRole];
  const password = prompt(`Введите пароль для ${roleMeta.l}`);
  if (!password) return;

  try {
    setLoading('Проверяю данные...');
    const result = await supabase.login(selectedRole, password);
    if (!result || !result.token) throw new Error('Ошибка авторизации');

    currentRole = result.role;
    currentUserName = result.name || roleMeta.l;
    setSession({ token: result.token, role: currentRole, name: currentUserName, exp: Date.now() + 8 * 60 * 60 * 1000 });
    await activateApp();
    showToast('Вход выполнен успешно', 'info');
  } catch (error) {
    showLoginError(error.message);
  } finally {
    clearLoading();
  }
}

function showLoginError(message) {
  let el = document.getElementById('loginErr');
  if (!el) {
    el = document.createElement('div');
    el.id = 'loginErr';
    el.style.cssText = 'margin-top:12px;padding:10px 12px;background:rgba(255,71,87,0.14);border:1px solid rgba(255,71,87,0.3);border-radius:12px;color:#ff7b7b;font-size:12px;text-align:center';
    document.getElementById('lbtn').insertAdjacentElement('afterend', el);
  }
  el.textContent = message;
  setTimeout(() => { if (el.parentNode) el.textContent = ''; }, 5000);
}

async function restoreSession() {
  const session = getSession();
  if (!session || !session.token) return false;
  try {
    setLoading('Восстановление сессии...');
    const me = await supabase.me();
    currentRole = me.role;
    currentUserName = me.name || ROLES[currentRole]?.l || 'Пользователь';
    await activateApp(false);
    return true;
  } catch {
    clearSession();
    return false;
  } finally {
    clearLoading();
  }
}

async function activateApp(loadData = true) {
  document.getElementById('loginWrap').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  document.getElementById('navtabs').style.display = 'flex';
  document.getElementById('tbadge').textContent = currentUserName;
  document.getElementById('tbadge').style.cssText = BADGES[currentRole] || '';
  if (loadData) await loadAllData();
  initNavTabs();
  goPage('contracts');
}

function doLogout() {
  currentRole = null;
  currentUserName = null;
  selectedRole = null;
  clearSession();
  document.getElementById('app').style.display = 'none';
  document.getElementById('loginWrap').style.display = 'flex';
  document.getElementById('navtabs').style.display = 'none';
  document.getElementById('lbtn').disabled = true;
  document.querySelectorAll('.ritem').forEach(el => el.classList.remove('on'));
  initLogin();
}

window.initLogin = initLogin;
window.doLogin = doLogin;
window.doLogout = doLogout;
window.restoreSession = restoreSession;
window.currentRole = currentRole;
