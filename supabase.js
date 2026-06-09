const API_BASE = window.APP_CONFIG?.apiBase || '';

const supabase = {
  async request(path, options = {}) {
    const headers = Object.assign({}, options.headers || {});
    if (!headers['Content-Type'] && options.body) {
      headers['Content-Type'] = 'application/json; charset=utf-8';
    }
    const session = getSession();
    if (session?.token) {
      headers['Authorization'] = `Bearer ${session.token}`;
    }
    const response = await fetch(`${API_BASE}${path}`, Object.assign({ method: 'GET', headers }, options));
    let payload;
    try {
      payload = await response.json();
    } catch {
      throw new Error('Сервер вернул некорректный ответ');
    }
    if (!response.ok) {
      if (response.status === 401) {
        clearSession();
      }
      throw new Error(payload.error?.message || payload.message || 'Серверная ошибка');
    }
    return payload;
  },

  async login(login, password) {
    return this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ login, password })
    });
  },

  async me() {
    return this.request('/api/auth/me', { method: 'GET' });
  },

  async query(table, options = {}) {
    const parts = [];
    if (options.select) parts.push(`select=${encodeURIComponent(options.select)}`);
    if (options.filter) {
      Object.entries(options.filter).forEach(([key, value]) => {
        parts.push(`${encodeURIComponent(key)}=eq.${encodeURIComponent(value)}`);
      });
    }
    if (options.order) parts.push(`order=${encodeURIComponent(options.order)}`);
    if (options.limit) parts.push(`limit=${encodeURIComponent(options.limit)}`);
    const query = parts.length ? `?${parts.join('&')}` : '';
    return this.request(`/api/data/${encodeURIComponent(table)}${query}`, { method: 'GET' });
  },

  async insert(table, data) {
    return this.request(`/api/data/${encodeURIComponent(table)}`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async update(table, id, data) {
    return this.request(`/api/data/${encodeURIComponent(table)}/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  async delete(table, id) {
    return this.request(`/api/data/${encodeURIComponent(table)}/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
  },

  async upsert(table, data, onConflict = 'id') {
    return this.request(`/api/data/${encodeURIComponent(table)}?on_conflict=${encodeURIComponent(onConflict)}`, {
      method: 'POST',
      headers: { Prefer: 'return=representation,resolution=merge-duplicates' },
      body: JSON.stringify(data)
    });
  }
};
