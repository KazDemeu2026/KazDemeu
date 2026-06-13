// === app.js ===
// ===== ГЛАВНЫЙ МОДУЛЬ ПРИЛОЖЕНИЯ =====

const APP_PAGES = {
  admin: [
    { id: 'contracts', l: '📋 Договора' },
    { id: 'analytics', l: '📊 Аналитика' },
    { id: 'finance',   l: '💰 Финансы' },
    { id: 'expenses',  l: '🗂️ Расходы' },
    { id: 'warehouse', l: '🏪 Склад' },
    { id: 'workshop',  l: '🧵 Швейный цех' },
  ]
};

let currentPage = 'contracts';
let zoomLevel = storageGet('kd_zoom', 100);

// ===== NAVIGATION =====
function initNavTabs() {
  const tabs = document.getElementById('navtabs');
  if (!tabs) return;
  if (window.currentRole === 'admin') {
    tabs.style.display = 'flex';
    tabs.innerHTML = APP_PAGES.admin.map(p =>
      '<div class="ntab' + (p.id === currentPage ? ' active' : '') + '" data-page="' + p.id + '" onclick="goPage(\'' + p.id + '\')">' + p.l + '</div>'
    ).join('');
  } else {
    const whAccess = storageGet('kd_warehouse_access', ['admin']);
    const wsAccess = storageGet('kd_workshop_access', ['admin']);
    const role = window.currentRole;
    const hasWh = whAccess.includes(role);
    const hasWs = wsAccess.includes(role);
    tabs.style.display = (hasWh || hasWs) ? 'flex' : 'none';
    let html = '<div class="ntab' + (currentPage === 'contracts' ? ' active' : '') + '" data-page="contracts" onclick="goPage(\'contracts\')">📋 Договора</div>';
    if (hasWh) html += '<div class="ntab' + (currentPage === 'warehouse' ? ' active' : '') + '" data-page="warehouse" onclick="goPage(\'warehouse\')">🏪 Склад</div>';
    if (hasWs) html += '<div class="ntab' + (currentPage === 'workshop' ? ' active' : '') + '" data-page="workshop" onclick="goPage(\'workshop\')">🧵 Швейный цех</div>';
    tabs.innerHTML = html;
  }
}

function goPage(page) {
  currentPage = page;
  document.querySelectorAll('.ntab').forEach(el => el.classList.toggle('active', el.dataset.page === page));
  const m = document.getElementById('main');
  if (!m) return;
  if (page === 'contracts')  renderContractsPage(m);
  else if (page === 'analytics') renderAnalyticsPage(m);
  else if (page === 'finance')   renderFinancePage(m);
  else if (page === 'expenses')  renderExpensesPage(m);
  else if (page === 'warehouse') renderWarehousePage(m);
  else if (page === 'workshop')  renderWorkshopPage(m);
}

// ===== ZOOM =====
function zoom(dir) {
  if (dir === 0) zoomLevel = 100;
  else zoomLevel = Math.max(60, Math.min(150, zoomLevel + dir * 10));
  storageSet('kd_zoom', zoomLevel);
  applyZoom();
}
function applyZoom() {
  const inner = document.getElementById('app-inner');
  if (inner) inner.style.fontSize = zoomLevel + '%';
  const lbl = document.getElementById('zlbl');
  if (lbl) lbl.textContent = zoomLevel + '%';
}

// ===== SCROLL =====
function scrollTbl(delta) {
  const sc = document.querySelector('.tscroll');
  if (sc) sc.scrollBy({ top: delta, behavior: 'smooth' });
}

// ===== EXPORT =====
function exportData() {
  const data = {
    contracts: window.contracts || [],
    contractCosts: window.contractCosts || {},
    contractFiles: window.contractFiles || {},
    contractStatuses: window.contractStatuses || {},
    expenseCategories: window.expenseCategories || [],
    expenseRecords: window.expenseRecords || {},
    exportedAt: new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'kazdemeu_export_' + new Date().toISOString().slice(0, 10) + '.json';
  a.click();
  URL.revokeObjectURL(url);
}

// ===== IMPORT (JSON + Excel + CSV) =====
function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const ext = file.name.split('.').pop().toLowerCase();
  event.target.value = '';

  if (ext === 'json') {
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const data = JSON.parse(e.target.result);
        if (data.contracts)         window.contracts         = data.contracts;
        if (data.contractCosts)     window.contractCosts     = data.contractCosts;
        if (data.contractFiles)     window.contractFiles     = data.contractFiles;
        if (data.contractStatuses)  window.contractStatuses  = data.contractStatuses;
        if (data.expenseCategories) window.expenseCategories = data.expenseCategories;
        if (data.expenseRecords)    window.expenseRecords    = data.expenseRecords;
        goPage(currentPage);
        showToast('✅ JSON импортирован');
      } catch(err) { showToast('❌ Ошибка: ' + err.message); }
    };
    reader.readAsText(file);
  } else if (ext === 'csv') {
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const rows = e.target.result.split('\n').map(function(r) { return r.split(',').map(function(c) { return c.trim().replace(/^"|"$/g, ''); }); });
        const headers = rows[0];
        const imported = rows.slice(1).filter(function(r) { return r.length > 1 && r[0]; }).map(function(r) {
          const obj = { id: 'csv_' + Date.now() + Math.random().toString(36).slice(2) };
          headers.forEach(function(h, i) { if (r[i] !== undefined) obj[h] = r[i]; });
          return obj;
        });
        window.contracts = (window.contracts || []).concat(imported);
        goPage(currentPage);
        showToast('✅ Импортировано ' + imported.length + ' строк из CSV');
      } catch(err) { showToast('❌ Ошибка CSV: ' + err.message); }
    };
    reader.readAsText(file, 'utf-8');
  } else if (ext === 'xlsx' || ext === 'xls') {
    if (!window.XLSX) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
      script.onload = function() { importExcel(file); };
      script.onerror = function() { showToast('❌ Не удалось загрузить библиотеку Excel'); };
      document.head.appendChild(script);
    } else {
      importExcel(file);
    }
  } else {
    showToast('❌ Формат не поддерживается. Используйте .json, .xlsx или .csv');
  }
}

function importExcel(file) {
  const fieldMap = {
    'наименование': 'org', 'организация': 'org', 'заказчик': 'org',
    'фирма': 'firm', 'поставщик': 'firm',
    'изделие': 'item', 'предмет': 'item', 'товар': 'item',
    'количество': 'qty', 'кол-во': 'qty',
    'цена': 'price', 'стоимость': 'price',
    'себестоимость': 'cost_price',
    'сумма': 'total', 'итого': 'total',
    'регион': 'region',
    'дата': 'signed_date',
    'срок': 'deadline',
    '№ договора': 'contract_number', 'номер': 'contract_number',
    'телефон': 'phone',
    'код': 'code',
    'комментарий': 'comment',
  };
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const wb = XLSX.read(e.target.result, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
      const allHeaders = rows.length > 0 ? Object.keys(rows[0]) : [];
      const unknownHeaders = allHeaders.filter(function(h) { return !fieldMap[h.toLowerCase().trim()]; });
      const autoColIds = {};
      unknownHeaders.forEach(function(h) {
        const colId = 'xl_' + h.toLowerCase().replace(/[^a-zа-яё0-9]/gi, '_');
        autoColIds[h] = colId;
        const cols = getColConfig ? getColConfig() : [];
        if (!cols.find(function(c) { return c.id === colId; })) {
          const insertAt = cols.findIndex(function(c) { return c.id === 'actions'; });
          cols.splice(insertAt >= 0 ? insertAt : cols.length, 0, { id: colId, l: h, w: 120, custom: true });
          if (window.colConfig !== undefined) window.colConfig = cols;
          storageSet('kd_cols', cols);
        }
      });
      const imported = rows.map(function(row) {
        const obj = { id: 'xl_' + Date.now() + Math.random().toString(36).slice(2), payment_status: 'unpaid', is_visible: true };
        Object.entries(row).forEach(function(entry) {
          const key = entry[0]; const val = entry[1];
          const mapped = fieldMap[key.toLowerCase().trim()];
          if (mapped) obj[mapped] = String(val);
        });
        return obj;
      }).filter(function(r) { return r.org || r.item || r.firm; });
      if (!imported.length) { showToast('⚠️ Не найдено строк. Проверьте заголовки.'); return; }
      window.contracts = (window.contracts || []).concat(imported);
      goPage(currentPage);
      showToast('✅ Импортировано ' + imported.length + ' из Excel' + (unknownHeaders.length ? ' + ' + unknownHeaders.length + ' новых колонок' : ''));
    } catch(err) { showToast('❌ Ошибка Excel: ' + err.message); }
  };
  reader.readAsArrayBuffer(file);
}

// ===== WAREHOUSE PAGE =====
// warehouseMaterials, warehouseGoods объявлены в contracts.js

function renderWarehousePage(m) {
  if (!m) m = document.getElementById('main');
  const isAdmin = window.currentRole === 'admin';
  m.style.cssText = 'display:flex;flex-direction:column;height:100%;overflow:hidden;min-height:0';

  function sectionHtml(title, items, type, statuses, colors) {
    return '<div style="margin-bottom:20px">' +
      '<div style="font-size:12px;font-weight:700;color:#00d4ff;text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">' + title + '</div>' +
      '<table style="width:100%;border-collapse:collapse;font-size:12px">' +
      '<thead><tr>' +
        ['Наименование','Кол-во','Ед.изм','Статус','Дата','Комментарий',''].map(function(h) {
          return '<th style="padding:7px 10px;text-align:left;background:#0a1628;color:#64748b;font-size:10px;font-weight:600;text-transform:uppercase;border-bottom:1px solid rgba(0,212,255,0.15)">' + h + '</th>';
        }).join('') +
      '</tr></thead><tbody>' +
      items.map(function(item, i) {
        const si = statuses.indexOf(item.status || statuses[0]);
        const color = colors[si >= 0 ? si : 0];
        return '<tr style="border-bottom:1px solid rgba(0,212,255,0.08)">' +
          '<td style="padding:8px 10px">' + esc(item.name || '—') + '</td>' +
          '<td style="padding:8px 10px">' + esc(item.qty || '—') + '</td>' +
          '<td style="padding:8px 10px;color:#64748b">' + esc(item.unit || 'шт') + '</td>' +
          '<td style="padding:8px 10px"><span style="color:' + color + ';font-size:11px;font-weight:600">' + esc(item.status || statuses[0]) + '</span></td>' +
          '<td style="padding:8px 10px;font-size:11px;color:#64748b">' + esc(item.date || '—') + '</td>' +
          '<td style="padding:8px 10px;color:#94a3b8;font-size:11px">' + esc(item.comment || '') + '</td>' +
          '<td style="padding:8px 10px">' + (isAdmin ? '<button onclick="deleteWarehouseItem(\'' + type + '\',' + i + ')" style="background:none;border:none;color:#ff4757;cursor:pointer;font-size:13px">🗑️</button>' : '') + '</td>' +
        '</tr>';
      }).join('') +
      '</tbody></table>' +
      (isAdmin ? '<button onclick="openAddWarehouseItem(\'' + type + '\')" style="margin-top:8px;padding:6px 14px;background:rgba(0,212,255,0.1);border:1px solid rgba(0,212,255,0.3);border-radius:7px;color:#00d4ff;font-size:12px;cursor:pointer">+ Добавить</button>' : '') +
    '</div>';
  }

  m.innerHTML = '<div style="padding:14px;overflow:auto;height:100%">' +
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">' +
      '<div style="font-size:16px;font-weight:700;color:#00d4ff;font-family:Orbitron,sans-serif">🏪 Склад</div>' +
      (isAdmin ? '<button onclick="openWarehouseAccess()" style="padding:5px 12px;background:rgba(0,212,255,0.08);border:1px solid rgba(0,212,255,0.25);border-radius:6px;color:#00d4ff;font-size:12px;cursor:pointer">👁 Доступ</button>' : '') +
    '</div>' +
    sectionHtml('Материалы', warehouseMaterials, 'mat',
      ['В наличии','Заканчивается','Нет'],
      ['#00ff88','#ffa502','#ff4757']) +
    sectionHtml('Готовая продукция', warehouseGoods, 'good',
      ['На складе','Отправлен','Списан'],
      ['#00d4ff','#00ff88','#64748b']) +
  '</div>';
}

function openAddWarehouseItem(type) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9000;display:flex;align-items:center;justify-content:center';
  const statuses = type === 'mat' ? ['В наличии','Заканчивается','Нет'] : ['На складе','Отправлен','Списан'];
  overlay.innerHTML = '<div style="background:#0d1a2e;border:1px solid rgba(0,212,255,0.3);border-radius:12px;padding:24px;width:380px">' +
    '<div style="font-size:14px;font-weight:700;color:#e2e8f0;margin-bottom:16px">+ Добавить ' + (type === 'mat' ? 'материал' : 'продукцию') + '</div>' +
    '<div style="display:flex;flex-direction:column;gap:10px">' +
    '<input id="wi-name" placeholder="Наименование" style="padding:8px;background:#0a1628;border:1px solid rgba(0,212,255,0.25);border-radius:6px;color:#e2e8f0;font-size:13px;outline:none">' +
    '<input id="wi-qty" placeholder="Количество" style="padding:8px;background:#0a1628;border:1px solid rgba(0,212,255,0.25);border-radius:6px;color:#e2e8f0;font-size:13px;outline:none">' +
    '<input id="wi-unit" placeholder="Ед. изм (шт/м/кг)" style="padding:8px;background:#0a1628;border:1px solid rgba(0,212,255,0.25);border-radius:6px;color:#e2e8f0;font-size:13px;outline:none">' +
    '<select id="wi-status" style="padding:8px;background:#0a1628;border:1px solid rgba(0,212,255,0.25);border-radius:6px;color:#e2e8f0;font-size:13px;outline:none">' +
    statuses.map(function(s) { return '<option>' + s + '</option>'; }).join('') +
    '</select>' +
    '<input id="wi-date" type="date" style="padding:8px;background:#0a1628;border:1px solid rgba(0,212,255,0.25);border-radius:6px;color:#e2e8f0;font-size:13px;outline:none">' +
    '<input id="wi-comment" placeholder="Комментарий" style="padding:8px;background:#0a1628;border:1px solid rgba(0,212,255,0.25);border-radius:6px;color:#e2e8f0;font-size:13px;outline:none">' +
    '</div>' +
    '<div style="display:flex;gap:8px;margin-top:16px">' +
    '<button onclick="saveWarehouseItem(\'' + type + '\',this)" style="flex:1;padding:9px;background:rgba(0,212,255,0.15);border:1px solid rgba(0,212,255,0.4);color:#00d4ff;border-radius:7px;cursor:pointer;font-weight:600">✓ Сохранить</button>' +
    '<button onclick="this.closest(\'[style*=fixed]\').remove()" style="padding:9px 14px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:#94a3b8;border-radius:7px;cursor:pointer">Отмена</button>' +
    '</div></div>';
  document.body.appendChild(overlay);
}

function saveWarehouseItem(type, btn) {
  const item = {
    name: document.getElementById('wi-name').value.trim(),
    qty: document.getElementById('wi-qty').value.trim(),
    unit: document.getElementById('wi-unit').value.trim() || 'шт',
    status: document.getElementById('wi-status').value,
    date: document.getElementById('wi-date').value,
    comment: document.getElementById('wi-comment').value.trim(),
  };
  if (!item.name) { showToast('Укажите наименование'); return; }
  if (type === 'mat') { warehouseMaterials.push(item); storageSet('kd_warehouse_materials', warehouseMaterials); }
  else { warehouseGoods.push(item); storageSet('kd_warehouse_goods', warehouseGoods); }
  btn.closest('[style*=fixed]').remove();
  renderWarehousePage();
  showToast('Добавлено');
}

function deleteWarehouseItem(type, idx) {
  if (!confirm('Удалить?')) return;
  if (type === 'mat') { warehouseMaterials.splice(idx, 1); storageSet('kd_warehouse_materials', warehouseMaterials); }
  else { warehouseGoods.splice(idx, 1); storageSet('kd_warehouse_goods', warehouseGoods); }
  renderWarehousePage();
}

function openWarehouseAccess() {
  const current = storageGet('kd_warehouse_access', ['admin']);
  const ROLES = window.ROLES || {};
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9000;display:flex;align-items:center;justify-content:center';
  overlay.innerHTML = '<div style="background:#0d1a2e;border:1px solid rgba(0,212,255,0.3);border-radius:12px;padding:24px;width:340px">' +
    '<div style="font-size:14px;font-weight:700;color:#e2e8f0;margin-bottom:14px">👁 Доступ к складу</div>' +
    '<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:18px">' +
    Object.entries(ROLES).filter(function(e) { return e[0] !== 'admin'; }).map(function(e) {
      return '<label style="display:flex;align-items:center;gap:10px;cursor:pointer;padding:8px 10px;border:1px solid rgba(0,212,255,0.12);border-radius:7px">' +
        '<input type="checkbox" id="whacc-' + e[0] + '"' + (current.includes(e[0]) ? ' checked' : '') + ' style="accent-color:#00d4ff">' +
        '<span>' + e[1].i + ' ' + e[1].l + '</span></label>';
    }).join('') +
    '</div>' +
    '<div style="display:flex;gap:8px">' +
    '<button onclick="saveWarehouseAccess(this)" style="flex:1;padding:9px;background:rgba(0,212,255,0.15);border:1px solid rgba(0,212,255,0.4);color:#00d4ff;border-radius:7px;cursor:pointer;font-weight:600">✓ Сохранить</button>' +
    '<button onclick="this.closest(\'[style*=fixed]\').remove()" style="padding:9px 14px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:#94a3b8;border-radius:7px;cursor:pointer">Отмена</button>' +
    '</div></div>';
  document.body.appendChild(overlay);
}

function saveWarehouseAccess(btn) {
  const ROLES = window.ROLES || {};
  const access = Object.keys(ROLES).filter(function(k) { return k !== 'admin' && document.getElementById('whacc-' + k) && document.getElementById('whacc-' + k).checked; });
  access.push('admin');
  storageSet('kd_warehouse_access', access);
  btn.closest('[style*=fixed]').remove();
  initNavTabs();
  showToast('Доступ обновлён');
}

// ===== WORKSHOP PAGE =====
// workshopItems объявлен в contracts.js
const WORKSHOP_STAGES = ['Раскрой','Пошив','ОТК','Упаковка','Готово'];

function renderWorkshopPage(m) {
  if (!m) m = document.getElementById('main');
  const isAdmin = window.currentRole === 'admin';
  m.style.cssText = 'display:flex;flex-direction:column;height:100%;overflow:hidden;min-height:0';

  function stageBar(stage) {
    const idx = WORKSHOP_STAGES.indexOf(stage);
    return '<div style="display:flex;align-items:center;gap:3px">' +
      WORKSHOP_STAGES.map(function(s, i) {
        const active = i === idx;
        const done = i < idx;
        const color = active ? '#00d4ff' : done ? '#00ff88' : '#1e293b';
        return '<div style="width:14px;height:14px;border-radius:50%;background:' + color + ';border:1px solid rgba(0,212,255,0.3)" title="' + s + '"></div>' +
          (i < WORKSHOP_STAGES.length - 1 ? '<div style="width:8px;height:2px;background:' + (done ? 'rgba(0,212,255,0.4)' : 'rgba(100,116,139,0.2)') + '"></div>' : '');
      }).join('') +
      '</div>';
  }

  m.innerHTML = '<div style="padding:14px;overflow:auto;height:100%">' +
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">' +
    '<div style="font-size:16px;font-weight:700;color:#00d4ff;font-family:Orbitron,sans-serif">🧵 Швейный цех</div>' +
    (isAdmin ? '<div style="display:flex;gap:8px">' +
      '<button onclick="openAddWorkshopItem()" style="padding:5px 12px;background:rgba(0,255,136,0.1);border:1px solid rgba(0,255,136,0.3);border-radius:6px;color:#00ff88;font-size:12px;cursor:pointer">+ Добавить</button>' +
      '<button onclick="openWorkshopAccess()" style="padding:5px 12px;background:rgba(0,212,255,0.08);border:1px solid rgba(0,212,255,0.25);border-radius:6px;color:#00d4ff;font-size:12px;cursor:pointer">👁 Доступ</button>' +
    '</div>' : '') +
    '</div>' +
    (workshopItems.length === 0 ? '<div style="text-align:center;padding:40px;color:#64748b">Нет изделий в цехе</div>' :
    '<table style="width:100%;border-collapse:collapse;font-size:12px">' +
    '<thead><tr>' + ['Договор','Изделие','Кол-во','Этап','Исполнитель','Начало','Готовность','Статус',''].map(function(h) {
      return '<th style="padding:7px 10px;text-align:left;background:#0a1628;color:#64748b;font-size:10px;font-weight:600;text-transform:uppercase;border-bottom:1px solid rgba(0,212,255,0.15)">' + h + '</th>';
    }).join('') + '</tr></thead><tbody>' +
    workshopItems.map(function(item, i) {
      const statusColors = { 'В работе': '#00d4ff', 'Готово': '#00ff88', 'Задержка': '#ff4757', 'На паузе': '#ffa502' };
      const sc = statusColors[item.status] || '#94a3b8';
      return '<tr style="border-bottom:1px solid rgba(0,212,255,0.08)">' +
        '<td style="padding:8px 10px;color:#64748b;font-size:11px">' + esc(item.contract_id || '—') + '</td>' +
        '<td style="padding:8px 10px;font-weight:500">' + esc(item.item || '—') + '</td>' +
        '<td style="padding:8px 10px">' + esc(item.qty || '—') + '</td>' +
        '<td style="padding:8px 10px">' + stageBar(item.stage) + '</td>' +
        '<td style="padding:8px 10px">' + esc(item.executor || '—') + '</td>' +
        '<td style="padding:8px 10px;font-size:11px;color:#64748b">' + esc(item.start_date || '—') + '</td>' +
        '<td style="padding:8px 10px;font-size:11px;color:#64748b">' + esc(item.ready_date || '—') + '</td>' +
        '<td style="padding:8px 10px"><span style="color:' + sc + ';font-size:11px;font-weight:600">' + esc(item.status || 'В работе') + '</span></td>' +
        '<td style="padding:8px 10px">' + (isAdmin ? '<button onclick="deleteWorkshopItem(' + i + ')" style="background:none;border:none;color:#ff4757;cursor:pointer">🗑️</button>' : '') + '</td>' +
      '</tr>';
    }).join('') + '</tbody></table>') +
  '</div>';
}

function openAddWorkshopItem() {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9000;display:flex;align-items:center;justify-content:center';
  overlay.innerHTML = '<div style="background:#0d1a2e;border:1px solid rgba(0,212,255,0.3);border-radius:12px;padding:24px;width:400px;max-height:90vh;overflow-y:auto">' +
    '<div style="font-size:14px;font-weight:700;color:#e2e8f0;margin-bottom:16px">+ В цех</div>' +
    '<div style="display:flex;flex-direction:column;gap:10px">' +
    '<input id="ws-item" placeholder="Изделие" style="padding:8px;background:#0a1628;border:1px solid rgba(0,212,255,0.25);border-radius:6px;color:#e2e8f0;font-size:13px;outline:none">' +
    '<input id="ws-qty" placeholder="Кол-во" style="padding:8px;background:#0a1628;border:1px solid rgba(0,212,255,0.25);border-radius:6px;color:#e2e8f0;font-size:13px;outline:none">' +
    '<select id="ws-stage" style="padding:8px;background:#0a1628;border:1px solid rgba(0,212,255,0.25);border-radius:6px;color:#e2e8f0;font-size:13px;outline:none">' +
    WORKSHOP_STAGES.map(function(s) { return '<option>' + s + '</option>'; }).join('') + '</select>' +
    '<input id="ws-exec" placeholder="Исполнитель" style="padding:8px;background:#0a1628;border:1px solid rgba(0,212,255,0.25);border-radius:6px;color:#e2e8f0;font-size:13px;outline:none">' +
    '<select id="ws-status" style="padding:8px;background:#0a1628;border:1px solid rgba(0,212,255,0.25);border-radius:6px;color:#e2e8f0;font-size:13px;outline:none">' +
    ['В работе','Готово','Задержка','На паузе'].map(function(s) { return '<option>' + s + '</option>'; }).join('') + '</select>' +
    '<input id="ws-start" type="date" style="padding:8px;background:#0a1628;border:1px solid rgba(0,212,255,0.25);border-radius:6px;color:#e2e8f0;font-size:13px;outline:none">' +
    '<input id="ws-ready" type="date" style="padding:8px;background:#0a1628;border:1px solid rgba(0,212,255,0.25);border-radius:6px;color:#e2e8f0;font-size:13px;outline:none">' +
    '</div>' +
    '<div style="display:flex;gap:8px;margin-top:16px">' +
    '<button onclick="saveWorkshopItem(this)" style="flex:1;padding:9px;background:rgba(0,212,255,0.15);border:1px solid rgba(0,212,255,0.4);color:#00d4ff;border-radius:7px;cursor:pointer;font-weight:600">✓ Сохранить</button>' +
    '<button onclick="this.closest(\'[style*=fixed]\').remove()" style="padding:9px 14px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:#94a3b8;border-radius:7px;cursor:pointer">Отмена</button>' +
    '</div></div>';
  document.body.appendChild(overlay);
}

function saveWorkshopItem(btn) {
  const item = {
    item: document.getElementById('ws-item').value.trim(),
    qty: document.getElementById('ws-qty').value.trim(),
    stage: document.getElementById('ws-stage').value,
    executor: document.getElementById('ws-exec').value.trim(),
    status: document.getElementById('ws-status').value,
    start_date: document.getElementById('ws-start').value,
    ready_date: document.getElementById('ws-ready').value,
  };
  if (!item.item) { showToast('Укажите изделие'); return; }
  workshopItems.push(item);
  storageSet('kd_workshop_items', workshopItems);
  btn.closest('[style*=fixed]').remove();
  renderWorkshopPage();
  showToast('Добавлено в цех');
}

function deleteWorkshopItem(idx) {
  if (!confirm('Удалить из цеха?')) return;
  workshopItems.splice(idx, 1);
  storageSet('kd_workshop_items', workshopItems);
  renderWorkshopPage();
}

function openWorkshopAccess() {
  const current = storageGet('kd_workshop_access', ['admin']);
  const ROLES = window.ROLES || {};
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9000;display:flex;align-items:center;justify-content:center';
  overlay.innerHTML = '<div style="background:#0d1a2e;border:1px solid rgba(0,212,255,0.3);border-radius:12px;padding:24px;width:340px">' +
    '<div style="font-size:14px;font-weight:700;color:#e2e8f0;margin-bottom:14px">👁 Доступ к швейному цеху</div>' +
    '<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:18px">' +
    Object.entries(ROLES).filter(function(e) { return e[0] !== 'admin'; }).map(function(e) {
      return '<label style="display:flex;align-items:center;gap:10px;cursor:pointer;padding:8px 10px;border:1px solid rgba(0,212,255,0.12);border-radius:7px">' +
        '<input type="checkbox" id="wsacc-' + e[0] + '"' + (current.includes(e[0]) ? ' checked' : '') + ' style="accent-color:#00d4ff">' +
        '<span>' + e[1].i + ' ' + e[1].l + '</span></label>';
    }).join('') +
    '</div>' +
    '<div style="display:flex;gap:8px">' +
    '<button onclick="saveWorkshopAccess(this)" style="flex:1;padding:9px;background:rgba(0,212,255,0.15);border:1px solid rgba(0,212,255,0.4);color:#00d4ff;border-radius:7px;cursor:pointer;font-weight:600">✓ Сохранить</button>' +
    '<button onclick="this.closest(\'[style*=fixed]\').remove()" style="padding:9px 14px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:#94a3b8;border-radius:7px;cursor:pointer">Отмена</button>' +
    '</div></div>';
  document.body.appendChild(overlay);
}

function saveWorkshopAccess(btn) {
  const ROLES = window.ROLES || {};
  const access = Object.keys(ROLES).filter(function(k) { return k !== 'admin' && document.getElementById('wsacc-' + k) && document.getElementById('wsacc-' + k).checked; });
  access.push('admin');
  storageSet('kd_workshop_access', access);
  btn.closest('[style*=fixed]').remove();
  initNavTabs();
  showToast('Доступ обновлён');
}

// ===== INIT APP =====
async function initApp() {
  initLogin();
  applyZoom();
  const restored = await restoreSession();
  if (!restored) {
    document.getElementById('app').style.display = 'none';
    document.getElementById('loginWrap').style.display = 'flex';
  }
}

window.addEventListener('DOMContentLoaded', initApp);
