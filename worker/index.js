const ALLOWED_TABLES = [
  'contracts',
  'contract_costs',
  'contract_files',
  'contract_statuses',
  'expense_categories',
  'expense_records',
  'contract_comments'
];

const WRITE_PERMISSIONS = {
  contracts: ['admin'],
  contract_costs: ['admin', 'manager', 'goszakup'],
  contract_files: ['admin', 'goszakup'],
  contract_statuses: ['admin', 'manager', 'constructor', 'technolog', 'logist'],
  expense_categories: ['admin'],
  expense_records: ['admin']
};

const SESSION_TTL = 8 * 60 * 60 * 1000;

function jsonResponse(body, init = {}) {
  return new Response(JSON.stringify(body), Object.assign({ status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } }, init));
}

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

async function sha256(text) {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(byte => byte.toString(16).padStart(2, '0')).join('');
}

async function createToken(payload, secret) {
  const payloadWithExp = Object.assign({}, payload, { exp: Date.now() + SESSION_TTL });
  const base = btoa(JSON.stringify(payloadWithExp));
  const signature = await sha256(`${base}.${secret}`);
  return `${base}.${signature}`;
}

async function verifyToken(token, secret) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [base, signature] = parts;
  const expected = await sha256(`${base}.${secret}`);
  if (!safeEqual(signature, expected)) return null;
  let payload;
  try {
    payload = JSON.parse(atob(base));
  } catch {
    return null;
  }
  if (!payload.exp || payload.exp < Date.now()) return null;
  return payload;
}

function getAuthUsers(env) {
  try {
    return env.AUTH_USERS ? JSON.parse(env.AUTH_USERS) : {};
  } catch {
    return {};
  }
}

function buildSupabaseUrl(env, table, search) {
  const base = env.SUPABASE_URL.replace(/\/$/, '');
  const query = search ? `?${search}` : '';
  return `${base}/rest/v1/${table}${query}`;
}

async function forwardToSupabase(request, env, table, search) {
  const url = buildSupabaseUrl(env, table, search);
  const headers = {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    Accept: 'application/json',
    'Content-Type': request.headers.get('Content-Type') || 'application/json; charset=utf-8'
  };

  const options = {
    method: request.method,
    headers,
    body: ['GET', 'HEAD'].includes(request.method) ? null : request.body
  };

  if (request.method === 'POST' && request.headers.get('Prefer')) {
    options.headers.Prefer = request.headers.get('Prefer');
  }

  const response = await fetch(url, options);
  const text = await response.text();
  return new Response(text, { status: response.status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}

async function handleLogin(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: { message: 'Тело запроса должно быть JSON' } }, { status: 400 });
  }
  const { login, password } = body;
  if (!login || !password) {
    return jsonResponse({ error: { message: 'Требуется логин и пароль' } }, { status: 400 });
  }

  const users = getAuthUsers(env);
  const user = users[login];
  if (!user || !user.passwordHash) {
    return jsonResponse({ error: { message: 'Неверный логин или пароль' } }, { status: 401 });
  }
  const passwordHash = await sha256(password);
  if (!safeEqual(passwordHash, user.passwordHash)) {
    return jsonResponse({ error: { message: 'Неверный логин или пароль' } }, { status: 401 });
  }

  const token = await createToken({ login, role: user.role || login, name: user.name || login }, env.API_SECRET);
  return jsonResponse({ token, role: user.role || login, name: user.name || login, exp: Date.now() + SESSION_TTL });
}

async function handleMe(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  const payload = await verifyToken(token, env.API_SECRET);
  if (!payload) {
    return jsonResponse({ error: { message: 'Неавторизован' } }, { status: 401 });
  }
  return jsonResponse({ role: payload.role, name: payload.name });
}

async function handleData(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  const user = await verifyToken(token, env.API_SECRET);
  if (!user) {
    return jsonResponse({ error: { message: 'Неавторизован' } }, { status: 401 });
  }

  const url = new URL(request.url);
  const parts = url.pathname.split('/').filter(Boolean);
  if (parts.length < 3) {
    return jsonResponse({ error: { message: 'Неверный путь запроса' } }, { status: 400 });
  }
  const table = parts[2];
  const id = parts[3] || null;

  if (!ALLOWED_TABLES.includes(table)) {
    return jsonResponse({ error: { message: 'Таблица не разрешена' } }, { status: 403 });
  }

  const method = request.method.toUpperCase();
  if (method !== 'GET') {
    const allowed = WRITE_PERMISSIONS[table] || [];
    if (!allowed.includes(user.role)) {
      return jsonResponse({ error: { message: 'Нет прав на изменение данных' } }, { status: 403 });
    }
  }

  if (method === 'PATCH' || method === 'DELETE') {
    if (!id) {
      return jsonResponse({ error: { message: 'Отсутствует идентификатор записи' } }, { status: 400 });
    }
    const search = `id=eq.${encodeURIComponent(id)}`;
    return forwardToSupabase(request, env, table, search);
  }

  const queryString = url.searchParams.toString();
  return forwardToSupabase(request, env, table, queryString);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/auth/login' && request.method === 'POST') {
      return handleLogin(request, env);
    }
    if (url.pathname === '/api/auth/me' && request.method === 'GET') {
      return handleMe(request, env);
    }
    if (url.pathname.startsWith('/api/data/')) {
      return handleData(request, env);
    }
    return new Response('Not Found', { status: 404 });
  }
};
