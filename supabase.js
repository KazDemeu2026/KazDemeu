// ===== SUPABASE CLIENT =====
const SUPABASE_URL = 'https://cbdvpzryztoyowprjtro.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNiZHZwenJ5enRveW93cHJqdHJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMjUxNTIsImV4cCI6MjA5NTkwMTE1Mn0.hd8CMF_sPxsy35KeRPGfjtHFcJWp4kTrvw_gbHtmFn0';

// Simple Supabase REST client
const supabase = {
  url: SUPABASE_URL,
  key: SUPABASE_KEY,

  async query(table, options = {}) {
    let url = `${this.url}/rest/v1/${table}`;
    const params = [];
    
    if (options.select) params.push(`select=${options.select}`);
    if (options.filter) {
      Object.entries(options.filter).forEach(([k, v]) => params.push(`${k}=eq.${v}`));
    }
    if (options.order) params.push(`order=${options.order}`);
    if (options.limit) params.push(`limit=${options.limit}`);
    
    if (params.length) url += '?' + params.join('&');

    const res = await fetch(url, {
      headers: {
        'apikey': this.key,
        'Authorization': `Bearer ${this.key}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      }
    });
    
    if (!res.ok) throw new Error(`Supabase error: ${res.status}`);
    return res.json();
  },

  async insert(table, data) {
    const res = await fetch(`${this.url}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        'apikey': this.key,
        'Authorization': `Bearer ${this.key}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Insert failed');
    }
    return res.json();
  },

  async update(table, id, data) {
    const res = await fetch(`${this.url}/rest/v1/${table}?id=eq.${id}`, {
      method: 'PATCH',
      headers: {
        'apikey': this.key,
        'Authorization': `Bearer ${this.key}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Update failed');
    return res.json();
  },

  async delete(table, id) {
    const res = await fetch(`${this.url}/rest/v1/${table}?id=eq.${id}`, {
      method: 'DELETE',
      headers: {
        'apikey': this.key,
        'Authorization': `Bearer ${this.key}`
      }
    });
    if (!res.ok) throw new Error('Delete failed');
    return true;
  },

  async upsert(table, data, onConflict = 'id') {
    const res = await fetch(`${this.url}/rest/v1/${table}?on_conflict=${onConflict}`, {
      method: 'POST',
      headers: {
        'apikey': this.key,
        'Authorization': `Bearer ${this.key}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation,resolution=merge-duplicates'
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Upsert failed');
    return res.json();
  },

  // Realtime subscription via polling (simple approach)
  subscribe(table, callback, interval = 5000) {
    let lastCheck = new Date().toISOString();
    return setInterval(async () => {
      try {
        const data = await this.query(table, {
          filter: { 'updated_at': `gte.${lastCheck}` }
        });
        if (data.length > 0) {
          lastCheck = new Date().toISOString();
          callback(data);
        }
      } catch(e) {}
    }, interval);
  }
};

// ===== LOCAL STORAGE HELPERS =====
const ls = (k, d = null) => { try { const v = localStorage.getItem(k); return v !== null ? JSON.parse(v) : d; } catch { return d; } };
const lsw = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

// ===== FORMAT HELPERS =====
const fmtN = n => Math.round(n).toLocaleString('ru-RU') + '₸';
const fmtDate = d => d ? new Date(d).toLocaleDateString('ru-RU') : '—';
