// === contracts.js ===
// ===== ДОГОВОРА =====

// Local state (cache from Supabase)
let contracts = [];
let contractCosts = {};
let contractFiles = {};
let contractStatuses = {};
let contractComments = {};
let hiddenContracts = new Set(ls('kd_hidden', []));
// Per-row role visibility: {contractId: ['admin','manager',...]} — если пусто = виден всем
let rowRoleVisibility = ls('kd_row_visibility', {});
// Custom fields from Excel import: {contractId: {colId: value}}
let customFields = ls('kd_custom_fields', {});

// Warehouse & Workshop state
let warehouseMaterials = ls('kd_warehouse_materials', []);
let warehouseGoods = ls('kd_warehouse_goods', []);
let workshopItems = ls('kd_workshop_items', []);

let searchQ = '';
let filterFirm = '';
let expandedRows = new Set();
let editId = null;
let showForm = false;
let dragSrc = null;
let resizing = null;
let colWidths = ls('kd_colw', {});

// ===== LOAD DATA =====
async function loadAllData() {
  showLoading();
  try {
    const [c, costs, files, statuses, cats, records] = await Promise.all([
      supabase.query('contracts', { select: '*', order: 'sort_order.asc,created_at.desc' }),
      supabase.query('contract_costs', { select: '*', order: 'created_at.asc' }),
      supabase.query('contract_files', { select: '*', order: 'created_at.asc' }),
      supabase.query('contract_statuses', { select: '*' }),
      supabase.query('expense_categories', { select: '*', order: 'sort_order.asc' }),
      supabase.query('expense_records', { select: '*', order: 'created_at.asc' })
    ]);

    contracts = c || [];

    // Load expense categories & records
    expenseCategories = cats || [];
    expenseRecords = {};
    (records || []).forEach(r => {
      if (!expenseRecords[r.category_id]) expenseRecords[r.category_id] = [];
      expenseRecords[r.category_id].push(r);
    });

    // Group costs by contract
    contractCosts = {};
    (costs || []).forEach(c => {
      if (!contractCosts[c.contract_id]) contractCosts[c.contract_id] = [];
      contractCosts[c.contract_id].push(c);
    });

    // Group files by contract
    contractFiles = {};
    (files || []).forEach(f => {
      if (!contractFiles[f.contract_id]) contractFiles[f.contract_id] = [];
      contractFiles[f.contract_id].push(f);
    });

    // Group statuses
    contractStatuses = {};
    (statuses || []).forEach(s => {
      if (!contractStatuses[s.contract_id]) contractStatuses[s.contract_id] = {};
      contractStatuses[s.contract_id][s.role] = s.status;
    });

    // Load comments (graceful - table may not exist)
    try {
      const commentsData = await supabase.query('contract_comments', { select: '*', order: 'created_at.asc' });
      contractComments = {};
      (commentsData || []).forEach(cm => {
        if (!contractComments[cm.contract_id]) contractComments[cm.contract_id] = [];
        contractComments[cm.contract_id].push(cm);
      });
    } catch(ce) {
      // Table may not exist yet, fall back to localStorage
      contractComments = ls('kd_comments', {});
    }

    hideLoading();
  } catch(e) {
    hideLoading();
    console.error('Load error:', e);
    showError('Ошибка загрузки данных: ' + e.message);
  }
}

function showLoading() {
  const m = document.getElementById('main');
  if (m) m.innerHTML = '<div class="loading"><div class="spinner"></div>Загрузка данных...</div>';
}
function hideLoading() {}
function showError(msg) {
  const m = document.getElementById('main');
  if (m) m.innerHTML = `<div class="nodata" style="color:#dc2626">❌ ${msg}</div>`;
}

// ===== REALTIME SYNC =====
let syncInterval = null;

let lastSyncTime = new Date().toISOString();

function startRealtimeSync() {
  syncInterval = setInterval(async () => {
    try {
      // Check for new contracts
      const updated = await supabase.query('contracts', {
        select: 'id,updated_at',
        order: 'updated_at.desc',
        limit: 1
      });
      if (updated && updated[0] && updated[0].updated_at > lastSyncTime) {
        lastSyncTime = new Date().toISOString();
        await loadAllData();
        const m = document.getElementById('main');
        if (currentPage === 'contracts') renderContractsPage(m);
        else if (currentPage === 'expenses') renderExpensesPage(m);
        else if (currentPage === 'finance') renderFinancePage(m);
        else if (currentPage === 'analytics') renderAnalyticsPage(m);
        else if (currentPage === 'warehouse') renderWarehousePage(m);
        else if (currentPage === 'workshop') renderWorkshopPage(m);
      }
    } catch(e) {}
  }, 15000); // Check every 15 seconds
}

function stopRealtimeSync() {
  if (syncInterval) clearInterval(syncInterval);
}

// ===== FILTER =====
function filtered() {
  return contracts.filter(r => {
    if (hiddenContracts.has(r.id) && currentRole !== 'admin') return false;
    if (!r.is_visible && currentRole !== 'admin') return false;
    // Per-role visibility: if set, only listed roles can see this row
    const allowedRoles = rowRoleVisibility[r.id];
    if (allowedRoles && allowedRoles.length > 0 && currentRole !== 'admin') {
      if (!allowedRoles.includes(currentRole)) return false;
    }
    const q = searchQ.toLowerCase();
    return (!q || (r.item||'').toLowerCase().includes(q) ||
            (r.org||'').toLowerCase().includes(q) ||
            (r.code||'').toLowerCase().includes(q) ||
            (r.contract_number||'').toLowerCase().includes(q)) &&
           (!filterFirm || r.firm === filterFirm);
  });
}

function firms() {
  return [...new Set(contracts.map(r => r.firm).filter(Boolean))];
}

// ===== STATUS =====
const STATUS_OPTS = [
  { v: '', l: '— нет —', c: 'sn' },
  { v: 'start', l: '🟡 Старт', c: 'ss2' },
  { v: 'plan', l: '🔵 Плановая', c: 'sp' },
  { v: 'finish', l: '🟢 Финиш', c: 'sf' }
];

const getStatus = (id, role) => (contractStatuses[id] || {})[role] || '';
const getCls = v => STATUS_OPTS.find(o => o.v === v)?.c || 'sn';

async function setStatus(contractId, role, val) {
  if (!contractStatuses[contractId]) contractStatuses[contractId] = {};
  contractStatuses[contractId][role] = val;
  
  // Update UI immediately
  const sel = document.querySelector(`select[data-sid="${contractId}-${role}"]`);
  if (sel) { sel.value = val; sel.className = 'ssel ' + getCls(val); }
  const cell = document.querySelector(`div[data-src="${contractId}"]`);
  if (cell) cell.innerHTML = statusCellHtml(contractId);
  
  // Save to Supabase
  try {
    await supabase.upsert('contract_statuses', {
      contract_id: contractId,
      role: role,
      status: val
    }, 'contract_id,role');
  } catch(e) { console.error('Status save error:', e); }
}

function statusSel(id, role) {
  const cur = getStatus(id, role);
  return `<select data-sid="${id}-${role}" class="ssel ${getCls(cur)}" onchange="setStatus('${id}','${role}',this.value);this.className='ssel '+getCls(this.value)">
    ${STATUS_OPTS.map(o => `<option value="${o.v}"${cur === o.v ? ' selected' : ''}>${o.l}</option>`).join('')}
  </select>`;
}

const statusBadge = v => {
  const o = STATUS_OPTS.find(x => x.v === v);
  if (!o || !o.v) return '<span style="color:#9ca3af;font-size:11px">—</span>';
  const cls = v === 'start' ? 'by' : v === 'plan' ? 'bb' : 'bg';
  return `<span class="bdg ${cls}">${o.l}</span>`;
};

function statusCellHtml(id) {
  return ['manager','constructor','technolog','logist'].map(r => `
    <div style="display:flex;align-items:center;gap:4px;white-space:nowrap">
      <span style="font-size:10px;color:#9ca3af;min-width:26px">${{manager:'Мен.',constructor:'Кон.',technolog:'Тех.',logist:'Лог.'}[r]}</span>
      ${statusBadge(getStatus(id, r))}
    </div>`).join('');
}

// ===== COSTS =====
function getCosts(id) { return contractCosts[id] || []; }

async function addCost(contractId) {
  const sEl = document.getElementById('cs-' + contractId);
  const cEl = document.getElementById('cc-' + contractId);
  const s = parseFloat((sEl?.value || '').replace(/\s/g, '').replace(',', '.'));
  const c = (cEl?.value || '').trim();
  if (!s || s <= 0) { if (sEl) sEl.style.borderColor = 'red'; return; }
  
  try {
    const result = await supabase.insert('contract_costs', {
      contract_id: contractId,
      amount: s,
      comment: c
    });
    if (!contractCosts[contractId]) contractCosts[contractId] = [];
    contractCosts[contractId].push(result[0]);
    expandedRows.add(contractId);
    renderContractsPage();
  } catch(e) { alert('Ошибка: ' + e.message); }
}

async function delCost(contractId, costId) {
  try {
    await supabase.delete('contract_costs', costId);
    contractCosts[contractId] = contractCosts[contractId].filter(c => c.id !== costId);
    expandedRows.add(contractId);
    renderContractsPage();
  } catch(e) { alert('Ошибка: ' + e.message); }
}

function costsHtml(row, canEdit) {
  const id = row.id;
  const list = getCosts(id);
  const tot = list.reduce((s, c) => s + Number(c.amount), 0);
  const rem = Number(row.total) - tot;
  
  let h = `<div class="xtitle">💸 Затраты</div>`;
  if (list.length) {
    h += `<div class="clist">${list.map(c => `
      <div class="crow">
        <span class="csum">${fmtN(c.amount)}</span>
        <span class="ccom">${c.comment || '—'}</span>
        <span class="cdate">${fmtDate(c.created_at)}</span>
        ${canEdit ? `<button class="cdel" onclick="delCost('${id}','${c.id}')">✕</button>` : ''}
      </div>`).join('')}</div>
      <div class="ctot">
        <span>Итого: <b>${fmtN(tot)}</b></span>
        <span style="color:${rem >= 0 ? '#00ff88' : '#ff4757'};font-weight:600">${rem >= 0 ? 'Остаток' : 'Перерасход'}: ${fmtN(Math.abs(rem))}</span>
      </div>`;
  } else {
    h += `<div style="color:#64748b;font-size:12px;margin-bottom:8px">Затрат нет</div>`;
  }
  if (canEdit) {
    h += `<div class="acost"><div class="acrow">
      <input id="cs-${id}" class="acs" type="number" placeholder="Сумма (₸)">
      <textarea id="cc-${id}" class="acc" placeholder="Комментарий..."></textarea>
    </div><button class="btn btn-p" style="align-self:flex-start;font-size:11px;padding:5px 10px" onclick="addCost('${id}')">+ Добавить затрату</button></div>`;
  }
  return h;
}

// ===== FILES =====
function getFiles(id) { return contractFiles[id] || []; }

const fileIcon = name => {
  const n = (name || '').toLowerCase();
  if (n.includes('.pdf')) return '📄';
  if (n.includes('.doc')) return '📝';
  if (n.includes('.xls')) return '📊';
  if (n.includes('.png') || n.includes('.jpg')) return '🖼️';
  return '🔗';
};

async function addFileLink(contractId) {
  const name = prompt('Название файла (например: ТЗ_договор.pdf):');
  if (!name?.trim()) return;
  const url = prompt('Ссылка на Google Drive\n(Файл → Поделиться → Скопировать ссылку):');
  if (!url?.trim()) return;
  
  try {
    const result = await supabase.insert('contract_files', {
      contract_id: contractId,
      name: name.trim(),
      url: url.trim()
    });
    if (!contractFiles[contractId]) contractFiles[contractId] = [];
    contractFiles[contractId].push(result[0]);
    expandedRows.add(contractId);
    renderContractsPage();
  } catch(e) { alert('Ошибка: ' + e.message); }
}

async function delFile(contractId, fileId) {
  try {
    await supabase.delete('contract_files', fileId);
    contractFiles[contractId] = contractFiles[contractId].filter(f => f.id !== fileId);
    expandedRows.add(contractId);
    renderContractsPage();
  } catch(e) { alert('Ошибка: ' + e.message); }
}

function filesHtml(id, canAdd, canDel) {
  const list = getFiles(id);
  let h = `<div class="xtitle" style="margin-top:10px">📎 Технические файлы</div>`;
  if (list.length) {
    h += `<div class="flist">${list.map(f => `
      <div class="frow">
        <span class="fic">${fileIcon(f.name)}</span>
        <div class="fin">
          <a href="${f.url}" target="_blank" class="fnm">${f.name}</a>
          <div class="fmeta">Google Drive · ${fmtDate(f.created_at)}</div>
        </div>
        ${canDel ? `<button class="cdel" onclick="delFile('${id}','${f.id}')">✕</button>` : ''}
      </div>`).join('')}</div>`;
  } else {
    h += `<div style="color:#64748b;font-size:12px;margin-bottom:6px">Файлов нет</div>`;
  }
  if (canAdd) {
    h += `<button class="fup" onclick="addFileLink('${id}')">🔗 Добавить ссылку</button>`;
  }
  return h;
}

// ===== COMMENTS =====
function getComments(contractId) {
  return contractComments[contractId] || [];
}

const ROLE_COMMENT_COLORS = {
  admin: '#93c5fd', manager: '#6ee7b7', constructor: '#ddd6fe',
  technolog: '#99f6e4', logist: '#bae6fd', goszakup: '#fda4af'
};

function commentCellHtml(contractId) {
  const cmts = getComments(contractId);
  const last = cmts.slice(-3);
  const authorDisplay = (currentUserName || (ROLES[currentRole] ? ROLES[currentRole].l : currentRole));
  let h = '<div style="min-width:160px">';
  if (last.length > 0) {
    last.forEach(cm => {
      const color = ROLE_COMMENT_COLORS[cm.role] || '#94a3b8';
      const ts = cm.created_at ? new Date(cm.created_at).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}) : (cm.ts ? new Date(cm.ts).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}) : '');
      h += `<div style="margin-bottom:4px;padding:4px 6px;background:rgba(0,0,0,0.2);border-radius:5px;border-left:2px solid ${color}">
        <div style="font-size:10px;color:${color};margin-bottom:1px">${escOr(cm.author)} · ${ts}</div>
        <div style="font-size:11px;color:#e2e8f0;white-space:pre-wrap;word-break:break-word">${(cm.text||'').substring(0,80)}${(cm.text||'').length>80?'…':''}</div>
      </div>`;
    });
    if (cmts.length > 3) h += `<div style="font-size:10px;color:#64748b;cursor:pointer" onclick="showAllComments('${contractId}')">ещё ${cmts.length-3}...</div>`;
  } else {
    h += `<div style="font-size:10px;color:#64748b">Нет комментариев</div>`;
  }
  h += `<button onclick="openCommentForm('${contractId}',this)" style="margin-top:4px;padding:2px 8px;background:rgba(0,212,255,0.08);border:1px dashed rgba(0,212,255,0.3);border-radius:5px;color:#00d4ff;font-size:10px;cursor:pointer">+ Добавить</button>`;
  h += '</div>';
  return h;
}

function openCommentForm(contractId, btn) {
  const existing = document.getElementById('cmtform-' + contractId);
  if (existing) { existing.remove(); return; }
  const div = document.createElement('div');
  div.id = 'cmtform-' + contractId;
  div.style.cssText = 'margin-top:5px';
  div.innerHTML = `<textarea id="cmttxt-${contractId}" placeholder="Введите комментарий..." style="width:100%;padding:6px 8px;background:#0a1628;border:1px solid rgba(0,212,255,0.3);border-radius:6px;color:#e2e8f0;font-size:12px;font-family:inherit;resize:none;height:56px;outline:none" onkeydown="if(event.ctrlKey&&event.key==='Enter')saveComment('${contractId}')"></textarea>
  <div style="display:flex;gap:5px;margin-top:4px">
    <button onclick="saveComment('${contractId}')" style="padding:4px 12px;background:rgba(0,212,255,0.12);border:1px solid rgba(0,212,255,0.3);border-radius:5px;color:#00d4ff;font-size:11px;cursor:pointer;font-weight:600">✓ Сохранить</button>
    <button onclick="document.getElementById('cmtform-${contractId}').remove()" style="padding:4px 8px;background:transparent;border:1px solid rgba(100,116,139,0.3);border-radius:5px;color:#64748b;font-size:11px;cursor:pointer">✕</button>
  </div>`;
  btn.parentNode.insertBefore(div, btn.nextSibling);
  document.getElementById('cmttxt-' + contractId)?.focus();
}

async function saveComment(contractId) {
  const txt = (document.getElementById('cmttxt-' + contractId)?.value || '').trim();
  if (!txt) return;
  const author = currentUserName || (ROLES[currentRole] ? ROLES[currentRole].l : currentRole);
  const role = currentRole;
  const ts = Date.now();
  const newCmt = { text: txt, author, role, ts };

  if (!contractComments[contractId]) contractComments[contractId] = [];
  contractComments[contractId].push(newCmt);

  // Save to localStorage fallback
  const localAll = ls('kd_comments', {});
  if (!localAll[contractId]) localAll[contractId] = [];
  localAll[contractId].push(newCmt);
  lsw('kd_comments', localAll);

  // Try Supabase
  try {
    const result = await supabase.insert('contract_comments', { contract_id: contractId, text: txt, author, role });
    if (result && result[0]) {
      const idx = contractComments[contractId].indexOf(newCmt);
      if (idx >= 0) contractComments[contractId][idx] = result[0];
    }
  } catch(e) { /* graceful fallback */ }

  document.getElementById('cmtform-' + contractId)?.remove();
  // Refresh comment cell
  const cell = document.querySelector(`[data-cmtcell="${contractId}"]`);
  if (cell) cell.innerHTML = commentCellHtml(contractId);
}

function showAllComments(contractId) {
  const cmts = getComments(contractId);
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center';
  let h = `<div style="background:#0d1a2e;border:1px solid rgba(0,212,255,0.3);border-radius:12px;width:500px;max-width:95vw;max-height:80vh;overflow-y:auto;padding:20px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
      <b style="color:#00d4ff;font-size:14px">Комментарии</b>
      <button onclick="this.closest('div[style*=fixed]').remove()" style="background:none;border:none;color:#64748b;font-size:18px;cursor:pointer">✕</button>
    </div>`;
  cmts.forEach(cm => {
    const color = ROLE_COMMENT_COLORS[cm.role] || '#94a3b8';
    const ts = cm.created_at ? new Date(cm.created_at).toLocaleString('ru-RU') : (cm.ts ? new Date(cm.ts).toLocaleString('ru-RU') : '');
    h += `<div style="margin-bottom:8px;padding:8px 10px;background:rgba(0,0,0,0.3);border-radius:6px;border-left:3px solid ${color}">
      <div style="font-size:11px;color:${color};margin-bottom:3px">${escOr(cm.author)} · ${ts}</div>
      <div style="font-size:12px;color:#e2e8f0;white-space:pre-wrap">${esc(cm.text)}</div>
    </div>`;
  });
  h += '</div>';
  overlay.innerHTML = h;
  document.body.appendChild(overlay);
}

// ===== CONTRACT CRUD =====
const FORM_FIELDS = [
  { id: 'nf-code', l: 'Номер закупки', ph: '16999999-1' },
  { id: 'nf-firm', l: 'Фирма', ph: 'Каз Демеу' },
  { id: 'nf-org', l: 'Организация *', ph: 'МВД' },
  { id: 'nf-item', l: 'Предмет закупки', ph: 'Костюм...' },
  { id: 'nf-qty', l: 'Кол-во', ph: '100', t: 'text' },
  { id: 'nf-price', l: 'Цена', ph: '15000', t: 'text' },
  ...(canCostPrice() ? [{ id: 'nf-cost_price', l: '💰 Себестоимость', ph: '12000', t: 'text' }] : []),
  { id: 'nf-total', l: 'Сумма (без НДС)', ph: '1500000', t: 'text' },
  { id: 'nf-location', l: 'Место поставки', ph: 'г.Астана...' },
  { id: 'nf-deadline', l: 'Срок поставки', ph: '60 дней...' },
  { id: 'nf-contract_number', l: '№ договора', ph: '' },
  { id: 'nf-phone', l: 'Телефон', ph: '' },
  { id: 'nf-signed_date', l: 'Дата подписания', ph: '01.06.2026' },
  { id: 'nf-delivery_date', l: 'Срок исполнения', ph: '01.08.2026' },
  { id: 'nf-comment', l: 'Комментарий', ph: '' },
];

const fv = id => (document.getElementById(id) || {}).value || '';

function formHtml(editing) {
  const r = editing ? contracts.find(x => x.id === editId) : null;
  return `<div class="cform">
    <div class="cform-title">${editing ? '✏️ Редактирование договора' : '+ Новый договор'}</div>
    <div class="fgrid">
      ${FORM_FIELDS.map(f => `<div class="ffield">
        <label>${f.l}</label>
        <input id="${f.id}" type="${f.t || 'text'}" placeholder="${f.ph}" value="${r ? (r[f.id.replace('nf-', '')] || '') : ''}" ${f.id === 'nf-code' && editing ? 'readonly' : ''}>
      </div>`).join('')}
    </div>
    <div class="factions">
      <button class="btn btn-p" onclick="${editing ? 'saveEdit()' : 'saveNew()'}">✓ Сохранить</button>
      <button class="btn btn-g" onclick="cancelForm()">Отмена</button>
    </div>
  </div>`;
}

function rowFromForm() {
  return {
    code: fv('nf-code').trim() || null,
    firm: fv('nf-firm'),
    org: fv('nf-org'),
    item: fv('nf-item'),
    qty: parseInt(fv('nf-qty')) || 0,
    price: parseFloat(fv('nf-price')) || 0,
    cost_price: canCostPrice() ? (parseFloat(fv('nf-cost_price')) || null) : undefined,
    total: parseFloat(fv('nf-total')) || 0,
    location: fv('nf-location'),
    deadline: fv('nf-deadline'),
    contract_number: fv('nf-contract_number'),
    phone: fv('nf-phone'),
    signed_date: fv('nf-signed_date'),
    delivery_date: fv('nf-delivery_date'),
    comment: fv('nf-comment'),
  };
}

async function saveNew() {
  const data = rowFromForm();
  if (!data.org) { document.getElementById('nf-org').style.borderColor = 'red'; return; }
  try {
    const result = await supabase.insert('contracts', { ...data, sort_order: 0 });
    contracts.unshift(result[0]);
    showForm = false;
    renderContractsPage();
  } catch(e) { alert('Ошибка: ' + e.message); }
}

async function saveEdit() {
  const data = rowFromForm();
  try {
    const result = await supabase.update('contracts', editId, data);
    const idx = contracts.findIndex(x => x.id === editId);
    if (idx >= 0) contracts[idx] = { ...contracts[idx], ...result[0] };
    editId = null; showForm = false;
    renderContractsPage();
  } catch(e) { alert('Ошибка: ' + e.message); }
}

function cancelForm() { showForm = false; editId = null; renderContractsPage(); }
function startEdit(id) { editId = id; showForm = true; renderContractsPage(); }
function startAdd() { editId = null; showForm = true; renderContractsPage(); }

async function deleteRow(id) {
  if (!confirm('Удалить договор?')) return;
  try {
    await supabase.delete('contracts', id);
    contracts = contracts.filter(r => r.id !== id);
    renderContractsPage();
  } catch(e) { alert('Ошибка: ' + e.message); }
}

async function togglePay(id) {
  if (currentRole !== 'admin') return;
  const r = contracts.find(x => x.id === id);
  if (!r) return;
  const newStatus = r.payment_status === 'paid' ? 'unpaid' : 'paid';
  try {
    await supabase.update('contracts', id, { payment_status: newStatus });
    r.payment_status = newStatus;
    renderContractsPage();
  } catch(e) { alert('Ошибка: ' + e.message); }
}

async function toggleVisibility(id) {
  if (currentRole !== 'admin') return;
  const r = contracts.find(x => x.id === id);
  if (!r) return;

  // Show role-selector modal
  const current = rowRoleVisibility[id] || [];
  const allRoles = Object.entries(ROLES);
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9000;display:flex;align-items:center;justify-content:center';
  overlay.innerHTML = `
    <div style="background:#0d1a2e;border:1px solid rgba(0,212,255,0.3);border-radius:12px;padding:24px;width:360px;box-shadow:0 0 30px rgba(0,212,255,0.2)">
      <div style="font-size:14px;font-weight:700;color:#e2e8f0;margin-bottom:6px">👁️ Видимость договора</div>
      <div style="font-size:11px;color:#64748b;margin-bottom:16px">Выберите роли, которым виден этот договор.<br>Если никого не выбрать — виден всем.</div>
      <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:18px">
        ${allRoles.filter(([k])=>k!=='admin').map(([k,v])=>`
          <label style="display:flex;align-items:center;gap:10px;cursor:pointer;padding:8px 10px;border:1px solid rgba(0,212,255,0.15);border-radius:7px;background:rgba(0,212,255,0.03)">
            <input type="checkbox" id="vrole-${k}" ${current.includes(k)?'checked':''} style="width:15px;height:15px;accent-color:#00d4ff">
            <span style="font-size:13px">${v.i} ${v.l}</span>
          </label>`).join('')}
      </div>
      <div style="display:flex;gap:8px">
        <button onclick="saveRowVisibility('${id}',this)" style="flex:1;padding:9px;background:rgba(0,212,255,0.15);border:1px solid rgba(0,212,255,0.4);color:#00d4ff;border-radius:7px;cursor:pointer;font-size:13px;font-weight:600">✓ Сохранить</button>
        <button onclick="this.closest('[style*=fixed]').remove()" style="padding:9px 16px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:#94a3b8;border-radius:7px;cursor:pointer;font-size:13px">Отмена</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
}

function saveRowVisibility(id, btn) {
  const allRoleKeys = Object.keys(ROLES).filter(k => k !== 'admin');
  const selected = allRoleKeys.filter(k => document.getElementById('vrole-'+k)?.checked);
  rowRoleVisibility[id] = selected; // empty = visible to all
  lsw('kd_row_visibility', rowRoleVisibility);
  btn.closest('[style*=fixed]').remove();
  renderContractsPage();
  const label = selected.length === 0 ? 'всем' : selected.map(k=>ROLES[k].l).join(', ');
  showToast(`Видимость: ${label}`);
}

// ===== DRAG ROWS =====
function onDS(e, id) {
  dragSrc = id;
  setTimeout(() => { const el = document.querySelector(`tr[data-id="${id}"]`); if (el) el.classList.add('dragging'); }, 0);
}
function onDE() { document.querySelectorAll('tr.dragging, tr.drag-over').forEach(el => el.classList.remove('dragging', 'drag-over')); }
function onDO(e, id) {
  e.preventDefault();
  document.querySelectorAll('tr.drag-over').forEach(el => el.classList.remove('drag-over'));
  const el = document.querySelector(`tr[data-id="${id}"]`);
  if (el && id !== dragSrc) el.classList.add('drag-over');
}
function onDrop(e, targetId) {
  e.preventDefault(); onDE();
  if (!dragSrc || dragSrc === targetId) return;
  const si = contracts.findIndex(r => r.id === dragSrc);
  const ti = contracts.findIndex(r => r.id === targetId);
  if (si < 0 || ti < 0) return;
  const [moved] = contracts.splice(si, 1);
  contracts.splice(ti, 0, moved);
  // Update sort orders in background
  contracts.forEach((r, i) => { r.sort_order = i; });
  renderContractsPage();
  // Save sort to Supabase
  Promise.all(contracts.map((r, i) => supabase.update('contracts', r.id, { sort_order: i }))).catch(console.error);
}

// ===== COLUMN RESIZE =====
function initResizers() {
  document.querySelectorAll('.tscroll th').forEach((th, i) => {
    if (th.querySelector('.rzr')) return;
    const k = currentRole + i;
    if (colWidths[k]) th.style.minWidth = colWidths[k] + 'px';
    const rz = document.createElement('div');
    rz.className = 'rzr';
    rz.addEventListener('mousedown', e => {
      e.preventDefault(); e.stopPropagation();
      resizing = { th, k, sx: e.clientX, sw: th.getBoundingClientRect().width };
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    });
    th.appendChild(rz);
  });
}

document.addEventListener('mousemove', e => {
  if (!resizing) return;
  const w = Math.max(40, resizing.sw + (e.clientX - resizing.sx));
  resizing.th.style.minWidth = w + 'px';
});
document.addEventListener('mouseup', () => {
  if (!resizing) return;
  colWidths[resizing.k] = resizing.th.getBoundingClientRect().width;
  lsw('kd_colw', colWidths);
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
  resizing = null;
});

// ===== SEARCH =====
function onSearch(v) {
  searchQ = v;
  renderTable();
  requestAnimationFrame(() => {
    const inp = document.getElementById('sinp');
    if (inp) { inp.focus(); inp.setSelectionRange(v.length, v.length); }
  });
}

// ===== COLUMN CONFIG =====
const DEFAULT_COLS = [
  {id:'num',    l:'№',           w:40,  locked:true},
  {id:'drag',   l:'',            w:24,  locked:true},
  {id:'name',   l:'Наименование',w:180, locked:true},
  {id:'firm',   l:'Фирма',       w:130},
  {id:'region', l:'Регион',      w:100},
  {id:'item',   l:'Изделие',     w:110},
  {id:'qty',    l:'Кол-во',      w:70},
  {id:'date',   l:'Дата',        w:85},
  {id:'deadline',l:'Срок сдачи', w:85},
  {id:'price',      l:'Цена',          w:100},
  {id:'cost_price', l:'Себестоимость', w:110},
  {id:'paid',       l:'Оплата',        w:70},
  {id:'comments',l:'Комментарии', w:180},
  {id:'status', l:'Статус',      w:110},
  {id:'actions',l:'',            w:60,  locked:true}
];

let colConfig = ls('kd_cols', null);

function getColConfig() {
  return colConfig || DEFAULT_COLS;
}

function openColSettings() {
  if (currentRole !== 'admin') return;
  const cols = getColConfig();
  let overlay = document.getElementById('colMgmtOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'colMgmtOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9000;display:flex;align-items:center;justify-content:center';
    document.body.appendChild(overlay);
  }
  overlay.innerHTML = `
  <div style="background:#0d1a2e;border:1px solid rgba(0,212,255,0.3);border-radius:12px;width:520px;max-width:95vw;max-height:90vh;overflow-y:auto;padding:24px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
      <h2 style="font-size:15px;font-weight:700;color:#00d4ff;font-family:Orbitron,sans-serif">⚙️ Колонки таблицы</h2>
      <button onclick="document.getElementById('colMgmtOverlay').remove()" style="background:none;border:none;color:#64748b;font-size:20px;cursor:pointer">✕</button>
    </div>
    <div id="colsList" style="margin-bottom:14px">
      ${cols.map((col, i) => `
        <div draggable="true" ondragstart="colDragStart(event,${i})" ondragover="colDragOver(event,${i})" ondrop="colDrop(event,${i})"
          style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:rgba(7,15,29,0.6);border:1px solid rgba(0,212,255,0.1);border-radius:7px;margin-bottom:5px;cursor:grab">
          <span style="color:#64748b;font-size:14px;cursor:grab">⠿</span>
          ${col.locked ? `<span style="flex:1;color:#e2e8f0;font-size:13px">${esc(col.l) || '(системная)'}</span>` : `<input type="text" value="${esc(col.l)}" onchange="updateColLabel(${i},this.value)" style="flex:1;padding:5px 8px;background:#0a1628;border:1px solid rgba(0,212,255,0.2);border-radius:5px;color:#e2e8f0;font-size:12px;outline:none">`}
          <span style="font-size:10px;color:#64748b;min-width:50px">w:${col.w||'auto'}</span>
          ${col.locked ? `<span style="width:24px"></span>` : `<button onclick="deleteCol(${i})" style="padding:3px 7px;background:rgba(255,71,87,0.15);border:1px solid rgba(255,71,87,0.3);border-radius:4px;color:#ff4757;font-size:11px;cursor:pointer">✕</button>`}
        </div>`).join('')}
    </div>
    <div style="display:flex;gap:8px;margin-bottom:14px">
      <input id="newColName" type="text" placeholder="Название новой колонки" style="flex:1;padding:7px 9px;background:#0a1628;border:1px solid rgba(0,212,255,0.25);border-radius:6px;color:#e2e8f0;font-size:12px;outline:none">
      <button onclick="addNewCol()" style="padding:7px 14px;background:rgba(0,212,255,0.12);border:1px solid rgba(0,212,255,0.3);border-radius:6px;color:#00d4ff;font-size:12px;cursor:pointer;font-weight:600">+ Добавить</button>
    </div>
    <div style="display:flex;gap:8px">
      <button onclick="applyColConfig()" style="padding:8px 18px;background:rgba(0,255,136,0.12);border:1px solid rgba(0,255,136,0.3);border-radius:7px;color:#00ff88;font-size:13px;cursor:pointer;font-weight:600">✓ Применить</button>
      <button onclick="resetColConfig()" style="padding:8px 14px;background:transparent;border:1px solid rgba(255,165,2,0.3);border-radius:7px;color:#ffa502;font-size:12px;cursor:pointer">↺ Сбросить</button>
    </div>
  </div>`;
  window._colDragSrc = null;
}

let _colDragSrc = null;
function colDragStart(e, i) { _colDragSrc = i; e.dataTransfer.effectAllowed = 'move'; }
function colDragOver(e, i) { e.preventDefault(); }
function colDrop(e, i) {
  e.preventDefault();
  if (_colDragSrc === null || _colDragSrc === i) return;
  const cols = getColConfig();
  const [moved] = cols.splice(_colDragSrc, 1);
  cols.splice(i, 0, moved);
  colConfig = cols;
  _colDragSrc = null;
  openColSettings();
}
function updateColLabel(i, val) {
  const cols = getColConfig();
  if (cols[i]) cols[i].l = val;
  colConfig = cols;
}
function deleteCol(i) {
  const cols = getColConfig();
  if (cols[i] && !cols[i].locked) { cols.splice(i, 1); colConfig = cols; openColSettings(); }
}
function addNewCol() {
  const name = (document.getElementById('newColName')?.value || '').trim();
  if (!name) return;
  const cols = getColConfig();
  const newId = 'custom_' + Date.now();
  const actIdx = cols.findIndex(c => c.id === 'actions');
  const insertAt = actIdx >= 0 ? actIdx : cols.length;
  cols.splice(insertAt, 0, { id: newId, l: name, w: 120, custom: true });
  colConfig = cols;
  openColSettings();
}
function applyColConfig() {
  const cols = getColConfig();
  lsw('kd_cols', cols);
  document.getElementById('colMgmtOverlay')?.remove();
  renderContractsPage();
  showToast('Конфигурация колонок сохранена');
}
function resetColConfig() {
  colConfig = null;
  lsw('kd_cols', null);
  document.getElementById('colMgmtOverlay')?.remove();
  renderContractsPage();
  showToast('Колонки сброшены');
}

// ===== CONTRACTS PAGE =====
function renderContractsPage(m) {
  if (!m) m = document.getElementById('main');
  if (!m) return;
  m.style.cssText = 'display:flex;flex-direction:column;height:100%;overflow:hidden;min-height:0';

  const rows = filtered();
  const totalSum = rows.reduce((s, r) => s + Number(r.total || 0), 0);
  const paidCount = rows.filter(r => r.payment_status === 'paid').length;
  const paidSum = rows.filter(r => r.payment_status === 'paid').reduce((s, r) => s + Number(r.total || 0), 0);
  const firmList = firms();

  const isAdmin = currentRole === 'admin';
  const isGoszakup = currentRole === 'goszakup';
  const canAdd = isAdmin || isGoszakup;
  const canDel = isAdmin || isGoszakup;
  const canSeePrice = canPrice();

  let html = '';

  html += `<div class="stats">
    <div class="sc"><div class="sl">Договоров</div><div class="sv">${rows.length}</div></div>
    ${canSeePrice ? `
    <div class="sc"><div class="sl">Общая сумма</div><div class="sv" style="font-size:13px">${fmtN(totalSum)}</div></div>
    <div class="sc"><div class="sl">Оплачено</div><div class="sv" style="color:#00ff88;font-size:13px">${fmtN(paidSum)}</div><div class="ss">${paidCount} дог.</div></div>
    <div class="sc"><div class="sl">Дебиторка</div><div class="sv" style="color:#ffa502;font-size:13px">${fmtN(totalSum - paidSum)}</div></div>
    ` : ''}
  </div>`;

  if (showForm) {
    html += formHtml(editId !== null);
  }

  html += `<div class="toolbar">
    <div class="sbox">
      <span class="si">🔍</span>
      <input id="sinp" type="text" placeholder="Поиск по организации, предмету, номеру..." value="${searchQ}" oninput="onSearch(this.value)">
    </div>
    <select class="fsel" onchange="filterFirm=this.value;renderContractsPage()">
      <option value="">Все фирмы</option>
      ${firmList.map(f => `<option value="${f}"${filterFirm === f ? ' selected' : ''}>${f}</option>`).join('')}
    </select>
    ${canAdd ? `<button class="btn btn-p" onclick="startAdd()">+ Добавить</button>` : ''}
    ${isAdmin ? `<button class="btn btn-g" onclick="renderContractsPage()">🔄 Обновить</button>` : ''}
    ${isAdmin ? `<button class="btn btn-g" onclick="openColSettings()">⚙️ Колонки</button>` : ''}
  </div>`;

  html += `<div class="twrap">
    <div class="thead-bar">
      <span class="th-title">Договора</span>
      <span class="cnt">${rows.length}</span>
    </div>
    <div class="tscroll" id="tscroll">`;

  html += buildTable(rows, isAdmin, canAdd, canDel, canSeePrice);

  html += `</div></div>`;

  m.innerHTML = html;
  initResizers();
}

function renderTable() {
  const sc = document.getElementById('tscroll');
  if (!sc) { renderContractsPage(); return; }
  const rows = filtered();
  const isAdmin = currentRole === 'admin';
  const canAdd = isAdmin || currentRole === 'goszakup';
  const canDel = isAdmin || currentRole === 'goszakup';
  sc.innerHTML = buildTable(rows, isAdmin, canAdd, canDel, canPrice());
  initResizers();
  const cnt = document.querySelector('.cnt');
  if (cnt) cnt.textContent = rows.length;
}

function buildTable(rows, isAdmin, canAdd, canDel, canSeePrice) {
  const roleKey = myRoleKey();
  let cols;
  if (isAdmin) {
    cols = getColConfig().map(c => ({ ...c }));
    if (!canSeePrice) cols = cols.filter(c => c.id !== 'price' && c.id !== 'total' && c.id !== 'paid');
  } else {
    cols = [];
    cols.push({ id: 'drag', l: '' });
    cols.push({ id: 'num', l: '#' });
    cols.push({ id: 'code', l: 'Номер закупки' });
    cols.push({ id: 'firm', l: 'Фирма' });
    cols.push({ id: 'org', l: 'Организация' });
    cols.push({ id: 'item', l: 'Предмет закупки' });
    cols.push({ id: 'qty', l: 'Кол-во' });
    if (canSeePrice) { cols.push({ id: 'price', l: 'Цена' }); cols.push({ id: 'total', l: 'Сумма' }); }
    cols.push({ id: 'location', l: 'Место поставки' });
    cols.push({ id: 'deadline', l: 'Срок поставки' });
    cols.push({ id: 'contract_number', l: '№ договора' });
    cols.push({ id: 'signed_date', l: 'Дата подп.' });
    cols.push({ id: 'delivery_date', l: 'Срок исп.' });
    if (roleKey) cols.push({ id: 'status', l: 'Статус' });
  }

  let h = `<table><thead><tr>`;
  cols.forEach(c => { h += `<th style="${c.w ? `min-width:${c.w}px` : ''}">${c.l}<div class="rzr"></div></th>`; });
  h += `</tr></thead><tbody>`;

  if (!rows.length) {
    h += `<tr><td colspan="${cols.length}" class="td"><div class="nodata">Нет данных</div></td></tr>`;
  }

  const customFields = ls('kd_custom_fields', {});

  rows.forEach((r, idx) => {
    const expanded = expandedRows.has(r.id);
    const costs = getCosts(r.id);
    const costTot = costs.reduce((s, c) => s + Number(c.amount), 0);
    const isHidden = !r.is_visible;
    const isPaid = r.payment_status === 'paid';
    const roleRestrict = rowRoleVisibility[r.id] || [];
    const hasRestrict = roleRestrict.length > 0;

    h += `<tr data-id="${r.id}"
      draggable="${isAdmin ? 'true' : 'false'}"
      ondragstart="onDS(event,'${r.id}')"
      ondragend="onDE()"
      ondragover="onDO(event,'${r.id}')"
      ondrop="onDrop(event,'${r.id}')"
      style="${isHidden && isAdmin ? 'opacity:0.5' : ''}">`;

    cols.forEach(c => {
      if (c.id === 'drag') {
        h += `<td class="td" style="padding:9px 6px;width:24px">${isAdmin ? `<span class="dh" title="Перетащить">⠿</span>` : ''}</td>`;
      } else if (c.id === 'num') {
        h += `<td class="td" style="width:30px;color:#64748b;font-size:11px">${idx + 1}</td>`;
      } else if (c.id === 'name' || c.id === 'org') {
        h += `<td class="td" style="max-width:160px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:500">${escOr(r.org)}</td>`;
      } else if (c.id === 'code') {
        h += `<td class="td" style="font-family:monospace;font-size:11px;white-space:nowrap">${escOr(r.code)}</td>`;
      } else if (c.id === 'firm') {
        h += `<td class="td"><span class="bdg bfirm">${escOr(r.firm)}</span></td>`;
      } else if (c.id === 'region') {
        const loc = r.location || '';
        let region = '—';
        if (loc.includes('Астана')) region = 'Астана';
        else if (loc.includes('Алматы')) region = 'Алматы';
        else if (loc.includes('Костанай')) region = 'Костанай';
        else if (loc.includes('Павлодар')) region = 'Павлодар';
        else if (loc.includes('Уральск') || loc.includes('ЗКО')) region = 'ЗКО';
        else if (loc.includes('Атырау')) region = 'Атырау';
        else if (loc) region = loc.substring(0,12);
        h += `<td class="td" style="font-size:11px">${region}</td>`;
      } else if (c.id === 'item') {
        const hasSub = costs.length > 0 || getFiles(r.id).length > 0;
        h += `<td class="td" style="max-width:200px">
          <div style="display:flex;align-items:flex-start;gap:5px">
            ${hasSub ? `<button onclick="toggleExp('${r.id}')" style="background:none;border:none;cursor:pointer;color:var(--accent);font-size:12px;padding:0;flex-shrink:0;margin-top:1px">${expanded ? '▾' : '▸'}</button>` : '<span style="width:16px;flex-shrink:0"></span>'}
            <div>
              <div style="font-size:12px">${escOr(r.item)}</div>
              ${r.comment ? `<div style="font-size:10px;color:#64748b;margin-top:2px">${esc(r.comment)}</div>` : ''}
              ${costs.length > 0 && canSeePrice ? `<div style="font-size:10px;color:#00ff88;margin-top:1px">Затрат: ${fmtN(costTot)}</div>` : ''}
            </div>
          </div>
        </td>`;
      } else if (c.id === 'qty') {
        h += `<td class="td" style="text-align:right;white-space:nowrap">${r.qty ? r.qty.toLocaleString('ru') : '—'}</td>`;
      } else if (c.id === 'price') {
        h += `<td class="td" style="text-align:right;white-space:nowrap;font-size:12px">${r.price ? fmtN(r.price) : '—'}</td>`;
      } else if (c.id === 'total') {
        h += `<td class="td" style="text-align:right;white-space:nowrap;font-weight:700;color:var(--accent)">${r.total ? fmtN(r.total) : '—'}</td>`;
      } else if (c.id === 'location') {
        h += `<td class="td" style="max-width:120px;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escOr(r.location)}</td>`;
      } else if (c.id === 'date' || c.id === 'signed_date') {
        h += `<td class="td" style="font-size:11px;white-space:nowrap">${escOr(r.signed_date)}</td>`;
      } else if (c.id === 'deadline' || c.id === 'delivery_date') {
        h += `<td class="td" style="font-size:11px;white-space:nowrap">${r.deadline || r.delivery_date || '—'}</td>`;
      } else if (c.id === 'contract_number') {
        h += `<td class="td" style="font-size:11px;font-family:monospace">${escOr(r.contract_number)}</td>`;
      } else if (c.id === 'paid' || c.id === 'payment') {
        h += `<td class="td" onclick="${isAdmin ? `togglePay('${r.id}')` : ''}" style="${isAdmin ? 'cursor:pointer' : ''}">
          <span class="bdg ${isPaid ? 'bg' : 'br'}">${isPaid ? '✅ Оплачен' : '❌ Не опл.'}</span>
        </td>`;
      } else if (c.id === 'comments') {
        h += `<td class="td" style="vertical-align:top;min-width:160px"><div data-cmtcell="${r.id}">${commentCellHtml(r.id)}</div></td>`;
      } else if (c.id === 'status') {
        if (isAdmin) {
          h += `<td class="td" style="min-width:120px"><div data-src="${r.id}">${statusCellHtml(r.id)}</div></td>`;
        } else if (roleKey) {
          h += `<td class="td">${statusSel(r.id, roleKey)}</td>`;
        } else {
          h += `<td class="td">—</td>`;
        }
      } else if (c.id === 'actions') {
        h += `<td class="td" style="white-space:nowrap">
          <button onclick="startEdit('${r.id}')" style="background:none;border:none;cursor:pointer;color:#64748b;font-size:13px;padding:2px 4px" title="Редактировать">✏️</button>
          ${canDel ? `<button onclick="deleteRow('${r.id}')" style="background:none;border:none;cursor:pointer;color:#ff4757;font-size:13px;padding:2px 4px" title="Удалить">🗑️</button>` : ''}
          ${isAdmin ? `<button onclick="toggleVisibility('${r.id}')" style="background:none;border:none;cursor:pointer;font-size:13px;padding:2px 4px" title="${hasRestrict ? 'Ограничен: '+roleRestrict.map(k=>ROLES[k]?.l||k).join(', ') : 'Видимость по ролям'}">${hasRestrict ? '🔒' : (isHidden ? '👁️‍🗨️' : '👁️')}</button>` : ''}
        </td>`;
      } else if (c.id.startsWith('custom_') || c.custom) {
        const val = (customFields[r.id] || {})[c.id] || '';
        h += `<td class="td" style="font-size:12px;min-width:${c.w||100}px">${isAdmin ? `<span onclick="editCustomField('${r.id}','${c.id}',this)" style="cursor:pointer;display:block;min-height:20px" title="Нажмите для редактирования">${val || '<span style=color:#64748b>—</span>'}</span>` : (val || '—')}</td>`;
      } else {
        const val = r[c.id];
        h += `<td class="td" style="font-size:12px">${val !== undefined && val !== null && val !== '' ? val : '—'}</td>`;
      }
    });

    h += `</tr>`;

    if (expanded) {
      h += `<tr class="xrow"><td colspan="${cols.length}" style="padding:0">
        <div class="xpanel"><div class="xinner">
          ${canCosts() ? costsHtml(r, true) : (costs.length ? costsHtml(r, false) : '')}
          ${filesHtml(r.id, canManage(), canDelFile())}
          ${r.phone ? `<div style="font-size:11px;color:#64748b;margin-top:8px">📞 ${esc(r.phone)}</div>` : ''}
        </div></div>
      </td></tr>`;
    }
  });

  h += `</tbody></table>`;
  return h;
}

function editCustomField(contractId, fieldId, el) {
  const customFields = ls('kd_custom_fields', {});
  const cur = (customFields[contractId] || {})[fieldId] || '';
  const val = prompt('Значение:', cur);
  if (val === null) return;
  if (!customFields[contractId]) customFields[contractId] = {};
  customFields[contractId][fieldId] = val.trim();
  lsw('kd_custom_fields', customFields);
  el.innerHTML = val.trim() || '<span style="color:#64748b">—</span>';
}
