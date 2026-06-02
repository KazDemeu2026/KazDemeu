// ===== ДОГОВОРА =====

// Local state (cache from Supabase)
let contracts = [];
let contractCosts = {};
let contractFiles = {};
let contractStatuses = {};
let hiddenContracts = new Set(ls('kd_hidden', []));

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
    const [c, costs, files, statuses] = await Promise.all([
      supabase.query('contracts', { select: '*', order: 'sort_order.asc,created_at.desc' }),
      supabase.query('contract_costs', { select: '*', order: 'created_at.asc' }),
      supabase.query('contract_files', { select: '*', order: 'created_at.asc' }),
      supabase.query('contract_statuses', { select: '*' })
    ]);
    
    contracts = c || [];
    
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

function startRealtimeSync() {
  syncInterval = setInterval(async () => {
    try {
      const updated = await supabase.query('contracts', { 
        select: 'id,updated_at',
        order: 'updated_at.desc',
        limit: 1
      });
      // Simple check - reload if there are new updates
    } catch(e) {}
  }, 10000);
}

function stopRealtimeSync() {
  if (syncInterval) clearInterval(syncInterval);
}

// ===== FILTER =====
function filtered() {
  return contracts.filter(r => {
    if (!hiddenContracts.has(r.id) === false && currentRole !== 'admin') return false;
    if (!r.is_visible && currentRole !== 'admin') return false;
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
        <span style="color:${rem >= 0 ? '#15803d' : '#dc2626'};font-weight:600">${rem >= 0 ? 'Остаток' : 'Перерасход'}: ${fmtN(Math.abs(rem))}</span>
      </div>`;
  } else {
    h += `<div style="color:#9ca3af;font-size:12px;margin-bottom:8px">Затрат нет</div>`;
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
    h += `<div style="color:#9ca3af;font-size:12px;margin-bottom:6px">Файлов нет</div>`;
  }
  if (canAdd) {
    h += `<button class="fup" onclick="addFileLink('${id}')">🔗 Добавить ссылку</button>`;
  }
  return h;
}

// ===== CONTRACT CRUD =====
const FORM_FIELDS = [
  { id: 'nf-code', l: 'Номер закупки', ph: '16999999-1' },
  { id: 'nf-firm', l: 'Фирма', ph: 'Каз Демеу' },
  { id: 'nf-org', l: 'Организация *', ph: 'МВД' },
  { id: 'nf-item', l: 'Предмет закупки', ph: 'Костюм...' },
  { id: 'nf-qty', l: 'Кол-во', ph: '100', t: 'number' },
  { id: 'nf-price', l: 'Цена', ph: '15000', t: 'number' },
  { id: 'nf-total', l: 'Сумма (без НДС)', ph: '1500000', t: 'number' },
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
  const newVis = !r.is_visible;
  try {
    await supabase.update('contracts', id, { is_visible: newVis });
    r.is_visible = newVis;
    renderContractsPage();
  } catch(e) { alert('Ошибка: ' + e.message); }
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

function toggleExp(id) {
  if (expandedRows.has(id)) expandedRows.delete(id);
  else expandedRows.add(id);
  renderTable();
}
