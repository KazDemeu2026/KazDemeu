// === main.js ===
// ===== NAVIGATION & PAGE RENDERING =====

let currentPage = 'contracts';
let zoomLevel = ls('kd_zoom', 100);

const PAGES = {
  admin: [
    { id: 'contracts', l: '📋 Договора' },
    { id: 'analytics', l: '📊 Аналитика' },
    { id: 'finance',   l: '💰 Финансы' },
    { id: 'expenses',  l: '🗂️ Расходы' },
    { id: 'warehouse', l: '🏪 Склад' },
    { id: 'workshop',  l: '🧵 Швейный цех' }
  ]
};

function goPage(page) {
  currentPage = page;
  const m = document.getElementById('main');
  if (!m) return;

  // Update nav tabs
  document.querySelectorAll('.ntab').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });

  if (page === 'contracts') renderContractsPage(m);
  else if (page === 'analytics') renderAnalyticsPage(m);
  else if (page === 'finance') renderFinancePage(m);
  else if (page === 'expenses') renderExpensesPage(m);
  else if (page === 'warehouse') renderWarehousePage(m);
  else if (page === 'workshop') renderWorkshopPage(m);
}

function initNavTabs() {
  const tabs = document.getElementById('navtabs');
  if (!tabs) return;
  const pages = PAGES.admin;
  tabs.innerHTML = pages.map(p =>
    `<div class="ntab${p.id === currentPage ? ' active' : ''}" data-page="${p.id}" onclick="goPage('${p.id}')">${p.l}</div>`
  ).join('');
}

// ===== ZOOM =====
function applyZoom() {
  const inner = document.getElementById('app-inner');
  if (inner) inner.style.fontSize = zoomLevel + '%';
  const lbl = document.getElementById('zlbl');
  if (lbl) lbl.textContent = zoomLevel + '%';
}

function zoom(dir) {
  if (dir === 0) {
    zoomLevel = 100;
  } else {
    zoomLevel = Math.max(60, Math.min(150, zoomLevel + dir * 10));
  }
  lsw('kd_zoom', zoomLevel);
  applyZoom();
}

// ===== SCROLL =====
function scrollTbl(delta) {
  const sc = document.querySelector('.tscroll');
  if (sc) sc.scrollBy({ top: delta, behavior: 'smooth' });
}

// ===== EXPORT / IMPORT =====
function exportData() {
  const data = {
    contracts,
    contractCosts,
    contractFiles,
    contractStatuses,
    expenseCategories,
    expenseRecords,
    exportedAt: new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `kazdemeu_export_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (data.contracts) contracts = data.contracts;
      if (data.contractCosts) contractCosts = data.contractCosts;
      if (data.contractFiles) contractFiles = data.contractFiles;
      if (data.contractStatuses) contractStatuses = data.contractStatuses;
      if (data.expenseCategories) expenseCategories = data.expenseCategories;
      if (data.expenseRecords) expenseRecords = data.expenseRecords;
      goPage(currentPage);
      alert('✅ Данные импортированы');
    } catch(err) {
      alert('❌ Ошибка импорта: ' + err.message);
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

// ===== COLUMN CONFIG (Feature 2) =====
const DEFAULT_COLS = [
  {id:'num',    l:'№',          w:40,  locked:true},
  {id:'drag',   l:'',           w:24,  locked:true},
  {id:'name',   l:'Наименование',w:180, locked:true},
  {id:'firm',   l:'Фирма',      w:130},
  {id:'region', l:'Регион',     w:100},
  {id:'item',   l:'Изделие',    w:110},
  {id:'qty',    l:'Кол-во',     w:70},
  {id:'date',   l:'Дата',       w:85},
  {id:'deadline',l:'Срок сдачи',w:85},
  {id:'price',      l:'Цена',           w:100},
  {id:'cost_price', l:'Себестоимость',  w:110},
  {id:'paid',       l:'Оплата',         w:70},
  {id:'comments',l:'Комментарии',w:180},
  {id:'status', l:'Статус',     w:110},
  {id:'actions',l:'',           w:60,  locked:true}
];

let colConfig = ls('kd_cols', null); // null = use default mapping

function getColConfig() {
  return colConfig || DEFAULT_COLS;
}

function openColSettings() {
  if (currentRole !== 'admin') return;
  const cols = getColConfig();
  const overlay = document.getElementById('colMgmtOverlay') || (() => {
    const el = document.createElement('div');
    el.id = 'colMgmtOverlay';
    el.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9000;display:flex;align-items:center;justify-content:center';
    document.body.appendChild(el);
    return el;
  })();

  overlay.innerHTML = `
  <div style="background:#0d1a2e;border:1px solid rgba(0,212,255,0.3);border-radius:12px;width:520px;max-width:95vw;max-height:90vh;overflow-y:auto;padding:24px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
      <h2 style="font-size:15px;font-weight:700;color:#00d4ff;font-family:Orbitron,sans-serif">⚙️ Колонки таблицы</h2>
      <button onclick="document.getElementById('colMgmtOverlay').remove()" style="background:none;border:none;color:#64748b;font-size:20px;cursor:pointer">✕</button>
    </div>
    <div id="colsList" style="margin-bottom:14px">
      ${cols.map((col, i) => `
        <div id="colrow-${i}" draggable="true" ondragstart="colDragStart(event,${i})" ondragover="colDragOver(event,${i})" ondrop="colDrop(event,${i})"
          style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:rgba(7,15,29,0.6);border:1px solid rgba(0,212,255,0.1);border-radius:7px;margin-bottom:5px;cursor:grab" data-ci="${i}">
          <span style="color:#64748b;font-size:14px;cursor:grab">⠿</span>
          ${col.locked ? `<span style="flex:1;color:#e2e8f0;font-size:13px">${col.l || '(системная)'}</span>` : `<input type="text" value="${col.l}" onchange="updateColLabel(${i},this.value)" style="flex:1;padding:5px 8px;background:#0a1628;border:1px solid rgba(0,212,255,0.2);border-radius:5px;color:#e2e8f0;font-size:12px;outline:none">`}
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
  // Insert before actions
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

  // Stats bar
  html += `<div class="stats">
    <div class="sc"><div class="sl">Договоров</div><div class="sv">${rows.length}</div></div>
    ${canSeePrice ? `
    <div class="sc"><div class="sl">Общая сумма</div><div class="sv" style="font-size:13px">${fmtN(totalSum)}</div></div>
    <div class="sc"><div class="sl">Оплачено</div><div class="sv" style="color:#00ff88;font-size:13px">${fmtN(paidSum)}</div><div class="ss">${paidCount} дог.</div></div>
    <div class="sc"><div class="sl">Дебиторка</div><div class="sv" style="color:#ffa502;font-size:13px">${fmtN(totalSum - paidSum)}</div></div>
    ` : ''}
  </div>`;

  // Form
  if (showForm) {
    html += formHtml(editId !== null);
  }

  // Toolbar
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

  // Table wrapper
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
  // Update count
  const cnt = document.querySelector('.cnt');
  if (cnt) cnt.textContent = rows.length;
}

function buildTable(rows, isAdmin, canAdd, canDel, canSeePrice) {
  const roleKey = myRoleKey();

  // Build column list based on config + role permissions
  // Always use the legacy column set for non-admin for simplicity; admin uses config
  let cols;
  if (isAdmin) {
    cols = getColConfig().map(c => ({ ...c }));
    // Filter price columns if not admin (should always be admin here but safety)
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

  // Custom fields data
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
      } else if (c.id === 'cost_price') {
        if (canCostPrice()) {
          const margin = r.cost_price && r.price ? ((r.price - r.cost_price) / r.price * 100).toFixed(1) : null;
          h += `<td class="td" style="text-align:right;white-space:nowrap;font-size:12px">
            ${r.cost_price ? `<span style="color:#ffa502;font-weight:600">${fmtN(r.cost_price)}</span>` : '—'}
            ${margin ? `<div style="font-size:10px;color:#00ff88">М: ${margin}%</div>` : ''}
          </td>`;
        } else {
          h += `<td class="td" style="text-align:center;color:#64748b;font-size:12px">—</td>`;
        }
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
        // Custom column - read from kd_custom_fields
        const val = (customFields[r.id] || {})[c.id] || '';
        h += `<td class="td" style="font-size:12px;min-width:${c.w||100}px">${isAdmin ? `<span onclick="editCustomField('${r.id}','${c.id}',this)" style="cursor:pointer;display:block;min-height:20px" title="Нажмите для редактирования">${val || '<span style=color:#64748b>—</span>'}</span>` : (val || '—')}</td>`;
      } else {
        // Generic fallback for any other col id matching a contract field
        const val = r[c.id];
        h += `<td class="td" style="font-size:12px">${val !== undefined && val !== null && val !== '' ? val : '—'}</td>`;
      }
    });

    h += `</tr>`;

    // Expanded panel
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

// ===== WAREHOUSE PAGE (Feature 3) =====
function renderWarehousePage(m) {
  if (!m) m = document.getElementById('main');
  warehouseMaterials = ls('kd_warehouse_materials', []);
  warehouseGoods = ls('kd_warehouse_goods', []);
  const isAdmin = currentRole === 'admin';

  const matStatusOpts = [
    { v: 'available', l: 'В наличии', cls: 'bg' },
    { v: 'low',       l: 'Заканчивается', cls: 'by' },
    { v: 'none',      l: 'Нет', cls: 'br' }
  ];
  const goodStatusOpts = [
    { v: 'stored',    l: 'На складе', cls: 'bb' },
    { v: 'shipped',   l: 'Отправлен', cls: 'bg' },
    { v: 'written',   l: 'Списан', cls: 'bfirm' }
  ];

  function tblHtml(items, statusOpts, storageKey, title, icon) {
    let h = `<div style="margin-bottom:20px">
      <div style="font-size:12px;font-weight:700;color:#00d4ff;text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px">${icon} ${title}</div>
      <table style="width:100%;border-collapse:collapse;background:#0d1a2e;border:1px solid rgba(0,212,255,0.15);border-radius:8px;overflow:hidden">
        <thead><tr style="background:#050d1a">
          <th style="padding:8px 10px;font-size:10px;font-weight:600;color:#00d4ff;text-align:left;text-transform:uppercase;letter-spacing:.07em;border-bottom:1px solid rgba(0,212,255,0.15)">Наименование</th>
          <th style="padding:8px 10px;font-size:10px;font-weight:600;color:#00d4ff;text-align:right;text-transform:uppercase;letter-spacing:.07em;border-bottom:1px solid rgba(0,212,255,0.15)">Кол-во</th>
          <th style="padding:8px 10px;font-size:10px;font-weight:600;color:#00d4ff;text-align:left;text-transform:uppercase;letter-spacing:.07em;border-bottom:1px solid rgba(0,212,255,0.15)">Ед.изм</th>
          <th style="padding:8px 10px;font-size:10px;font-weight:600;color:#00d4ff;text-align:left;text-transform:uppercase;letter-spacing:.07em;border-bottom:1px solid rgba(0,212,255,0.15)">Статус</th>
          <th style="padding:8px 10px;font-size:10px;font-weight:600;color:#00d4ff;text-align:left;text-transform:uppercase;letter-spacing:.07em;border-bottom:1px solid rgba(0,212,255,0.15)">Дата</th>
          <th style="padding:8px 10px;font-size:10px;font-weight:600;color:#00d4ff;text-align:left;text-transform:uppercase;letter-spacing:.07em;border-bottom:1px solid rgba(0,212,255,0.15)">Комментарий</th>
          ${isAdmin ? `<th style="padding:8px 10px;font-size:10px;font-weight:600;color:#00d4ff;text-align:center;border-bottom:1px solid rgba(0,212,255,0.15)">Действия</th>` : ''}
        </tr></thead>
        <tbody>`;
    if (!items.length) {
      h += `<tr><td colspan="${isAdmin?7:6}" style="padding:16px;text-align:center;color:#64748b;font-size:12px">Нет записей</td></tr>`;
    }
    items.forEach((item, i) => {
      const so = statusOpts.find(o => o.v === item.status) || statusOpts[0];
      h += `<tr style="border-bottom:1px solid rgba(0,212,255,0.06)">
        <td style="padding:9px 10px;font-size:12px;color:#e2e8f0">${item.name || '—'}</td>
        <td style="padding:9px 10px;font-size:12px;text-align:right;color:#00d4ff;font-weight:600">${item.qty || '—'}</td>
        <td style="padding:9px 10px;font-size:12px;color:#94a3b8">${item.unit || '—'}</td>
        <td style="padding:9px 10px">
          ${isAdmin ? `<select onchange="setWarehouseStatus('${storageKey}',${i},this.value)" style="border:1px solid rgba(0,212,255,0.2);border-radius:10px;font-size:11px;padding:2px 6px;background:#0a1628;color:#e2e8f0;cursor:pointer;outline:none">
            ${statusOpts.map(o => `<option value="${o.v}"${o.v===item.status?' selected':''}>${o.l}</option>`).join('')}
          </select>` : `<span class="bdg ${so.cls}">${so.l}</span>`}
        </td>
        <td style="padding:9px 10px;font-size:11px;color:#64748b">${item.date || '—'}</td>
        <td style="padding:9px 10px;font-size:11px;color:#94a3b8">${item.comment || '—'}</td>
        ${isAdmin ? `<td style="padding:9px 10px;text-align:center">
          <button onclick="deleteWarehouseItem('${storageKey}',${i})" style="background:none;border:none;cursor:pointer;color:#ff4757;font-size:13px" title="Удалить">🗑️</button>
        </td>` : ''}
      </tr>`;
    });
    h += `</tbody></table>`;
    if (isAdmin) {
      h += `<button onclick="openAddWarehouseItem('${storageKey}')" style="margin-top:8px;padding:6px 14px;background:rgba(0,212,255,0.08);border:1px dashed rgba(0,212,255,0.3);border-radius:6px;color:#00d4ff;font-size:12px;cursor:pointer">+ Добавить</button>`;
    }
    h += `</div>`;
    return h;
  }

  m.style.cssText = 'display:flex;flex-direction:column;height:100%;overflow:hidden;min-height:0';
  m.innerHTML = `
    <div style="padding:10px 14px 6px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0">
      <div style="font-size:16px;font-weight:700;color:#00d4ff;font-family:Orbitron,sans-serif">🏪 Склад</div>
      ${isAdmin ? `<button onclick="openWarehouseAccess()" style="padding:5px 12px;background:rgba(0,212,255,0.08);border:1px solid rgba(0,212,255,0.25);border-radius:6px;color:#00d4ff;font-size:12px;cursor:pointer">👁 Доступ</button>` : ''}
    </div>
    <div style="flex:1;overflow:auto;padding:0 14px 14px">
      ${tblHtml(warehouseMaterials, matStatusOpts, 'kd_warehouse_materials', 'Материалы', '📦')}
      ${tblHtml(warehouseGoods, goodStatusOpts, 'kd_warehouse_goods', 'Готовая продукция', '🏷️')}
    </div>`;
}

function setWarehouseStatus(storageKey, idx, val) {
  const items = ls(storageKey, []);
  if (items[idx]) { items[idx].status = val; lsw(storageKey, items); }
  if (storageKey === 'kd_warehouse_materials') warehouseMaterials = items;
  else warehouseGoods = items;
}

function deleteWarehouseItem(storageKey, idx) {
  if (!confirm('Удалить запись?')) return;
  const items = ls(storageKey, []);
  items.splice(idx, 1);
  lsw(storageKey, items);
  if (storageKey === 'kd_warehouse_materials') warehouseMaterials = items;
  else warehouseGoods = items;
  renderWarehousePage();
}

function openAddWarehouseItem(storageKey) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center';
  const isMat = storageKey === 'kd_warehouse_materials';
  const statusOpts = isMat
    ? [{v:'available',l:'В наличии'},{v:'low',l:'Заканчивается'},{v:'none',l:'Нет'}]
    : [{v:'stored',l:'На складе'},{v:'shipped',l:'Отправлен'},{v:'written',l:'Списан'}];
  overlay.innerHTML = `<div style="background:#0d1a2e;border:1px solid rgba(0,212,255,0.3);border-radius:12px;width:420px;max-width:95vw;padding:24px">
    <h3 style="color:#00d4ff;font-size:14px;margin-bottom:16px">+ Добавить запись</h3>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
      <div><label style="font-size:10px;color:#64748b;display:block;margin-bottom:3px">Наименование</label><input id="wh-name" type="text" style="width:100%;padding:7px 9px;background:#0a1628;border:1px solid rgba(0,212,255,0.25);border-radius:6px;color:#e2e8f0;font-size:12px;outline:none"></div>
      <div><label style="font-size:10px;color:#64748b;display:block;margin-bottom:3px">Кол-во</label><input id="wh-qty" type="text" style="width:100%;padding:7px 9px;background:#0a1628;border:1px solid rgba(0,212,255,0.25);border-radius:6px;color:#e2e8f0;font-size:12px;outline:none"></div>
      <div><label style="font-size:10px;color:#64748b;display:block;margin-bottom:3px">Ед.изм</label><input id="wh-unit" type="text" placeholder="шт, м, кг" style="width:100%;padding:7px 9px;background:#0a1628;border:1px solid rgba(0,212,255,0.25);border-radius:6px;color:#e2e8f0;font-size:12px;outline:none"></div>
      <div><label style="font-size:10px;color:#64748b;display:block;margin-bottom:3px">Статус</label><select id="wh-status" style="width:100%;padding:7px 9px;background:#0a1628;border:1px solid rgba(0,212,255,0.25);border-radius:6px;color:#e2e8f0;font-size:12px;outline:none">${statusOpts.map(o=>`<option value="${o.v}">${o.l}</option>`).join('')}</select></div>
      <div><label style="font-size:10px;color:#64748b;display:block;margin-bottom:3px">Дата</label><input id="wh-date" type="date" style="width:100%;padding:7px 9px;background:#0a1628;border:1px solid rgba(0,212,255,0.25);border-radius:6px;color:#e2e8f0;font-size:12px;outline:none"></div>
      <div><label style="font-size:10px;color:#64748b;display:block;margin-bottom:3px">Комментарий</label><input id="wh-comment" type="text" style="width:100%;padding:7px 9px;background:#0a1628;border:1px solid rgba(0,212,255,0.25);border-radius:6px;color:#e2e8f0;font-size:12px;outline:none"></div>
    </div>
    <div style="display:flex;gap:8px">
      <button onclick="saveWarehouseItem('${storageKey}',this)" style="padding:8px 16px;background:rgba(0,212,255,0.12);border:1px solid rgba(0,212,255,0.3);border-radius:6px;color:#00d4ff;font-size:12px;cursor:pointer;font-weight:600">✓ Сохранить</button>
      <button onclick="this.closest('[style*=fixed]').remove()" style="padding:8px 12px;background:transparent;border:1px solid rgba(100,116,139,0.3);border-radius:6px;color:#64748b;font-size:12px;cursor:pointer">Отмена</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);
}

function saveWarehouseItem(storageKey, btn) {
  const name = document.getElementById('wh-name')?.value?.trim();
  if (!name) { alert('Введите наименование'); return; }
  const item = {
    name,
    qty: document.getElementById('wh-qty')?.value?.trim() || '',
    unit: document.getElementById('wh-unit')?.value?.trim() || '',
    status: document.getElementById('wh-status')?.value || 'available',
    date: document.getElementById('wh-date')?.value || '',
    comment: document.getElementById('wh-comment')?.value?.trim() || ''
  };
  const items = ls(storageKey, []);
  items.push(item);
  lsw(storageKey, items);
  if (storageKey === 'kd_warehouse_materials') warehouseMaterials = items;
  else warehouseGoods = items;
  btn.closest('[style*=fixed]').remove();
  renderWarehousePage();
}

function openWarehouseAccess() {
  const allRoles = [...Object.keys(ROLES), ...customUsers.map(u=>u.key)];
  const access = ls('kd_warehouse_access', ['admin']);
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center';
  overlay.innerHTML = `<div style="background:#0d1a2e;border:1px solid rgba(0,212,255,0.3);border-radius:12px;width:380px;max-width:95vw;padding:24px">
    <h3 style="color:#00d4ff;font-size:14px;margin-bottom:14px">👁 Доступ к складу</h3>
    <div style="margin-bottom:14px">
      ${Object.entries(ROLES).map(([k,v])=>`<label style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid rgba(0,212,255,0.06);cursor:pointer">
        <input type="checkbox" id="whacc-${k}" ${access.includes(k)?'checked':''} style="accent-color:#00d4ff">
        <span style="font-size:13px;color:#e2e8f0">${v.i} ${v.l}</span>
      </label>`).join('')}
    </div>
    <div style="display:flex;gap:8px">
      <button onclick="saveWarehouseAccess(this)" style="padding:8px 16px;background:rgba(0,212,255,0.12);border:1px solid rgba(0,212,255,0.3);border-radius:6px;color:#00d4ff;font-size:12px;cursor:pointer;font-weight:600">✓ Сохранить</button>
      <button onclick="this.closest('[style*=fixed]').remove()" style="padding:8px 12px;background:transparent;border:1px solid rgba(100,116,139,0.3);border-radius:6px;color:#64748b;font-size:12px;cursor:pointer">Отмена</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);
}

function saveWarehouseAccess(btn) {
  const newAccess = Object.keys(ROLES).filter(k => document.getElementById('whacc-'+k)?.checked);
  if (!newAccess.includes('admin')) newAccess.push('admin');
  lsw('kd_warehouse_access', newAccess);
  btn.closest('[style*=fixed]').remove();
  updateNavVisibility();
  showToast('Доступ обновлён');
}

// ===== SEWING WORKSHOP PAGE (Feature 3) =====
const WORKSHOP_STAGES = ['Раскрой','Пошив','ОТК','Упаковка','Готово'];

function renderWorkshopPage(m) {
  if (!m) m = document.getElementById('main');
  workshopItems = ls('kd_workshop_items', []);
  const isAdmin = currentRole === 'admin';

  function stageProgress(stage) {
    const idx = WORKSHOP_STAGES.indexOf(stage);
    return WORKSHOP_STAGES.map((s, i) => `<div style="display:flex;align-items:center;gap:0">
      <div style="width:${i===idx?14:10}px;height:${i===idx?14:10}px;border-radius:50%;background:${i===idx?'#00d4ff':i<idx?'rgba(0,212,255,0.4)':'rgba(100,116,139,0.3)'};border:${i===idx?'2px solid #00d4ff':'2px solid transparent'};box-shadow:${i===idx?'0 0 8px rgba(0,212,255,0.6)':'none'};transition:all.2s;flex-shrink:0" title="${s}"></div>
      ${i<WORKSHOP_STAGES.length-1?`<div style="width:12px;height:2px;background:${i<idx?'rgba(0,212,255,0.4)':'rgba(100,116,139,0.2)'}"></div>`:''}
    </div>`).join('');
  }

  m.style.cssText = 'display:flex;flex-direction:column;height:100%;overflow:hidden;min-height:0';
  m.innerHTML = `
    <div style="padding:10px 14px 6px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0">
      <div style="font-size:16px;font-weight:700;color:#00d4ff;font-family:Orbitron,sans-serif">🧵 Швейный цех</div>
      <div style="display:flex;gap:8px">
        ${isAdmin ? `<button onclick="openAddWorkshopItem()" style="padding:5px 12px;background:rgba(0,255,136,0.1);border:1px solid rgba(0,255,136,0.3);border-radius:6px;color:#00ff88;font-size:12px;cursor:pointer;font-weight:600">+ Добавить</button>` : ''}
        ${isAdmin ? `<button onclick="openWorkshopAccess()" style="padding:5px 12px;background:rgba(0,212,255,0.08);border:1px solid rgba(0,212,255,0.25);border-radius:6px;color:#00d4ff;font-size:12px;cursor:pointer">👁 Доступ</button>` : ''}
      </div>
    </div>
    <div style="flex:1;overflow:auto;padding:0 14px 14px">
      <table style="width:100%;border-collapse:collapse;background:#0d1a2e;border:1px solid rgba(0,212,255,0.15);border-radius:8px;overflow:hidden">
        <thead><tr style="background:#050d1a">
          ${['Договор','Изделие','Кол-во','Этап','Исполнитель','Начало','Готовность','Статус',isAdmin?'Действия':''].filter(Boolean).map(h=>`<th style="padding:8px 10px;font-size:10px;font-weight:600;color:#00d4ff;text-align:left;text-transform:uppercase;letter-spacing:.07em;border-bottom:1px solid rgba(0,212,255,0.15)">${h}</th>`).join('')}
        </tr></thead>
        <tbody>
          ${!workshopItems.length ? `<tr><td colspan="${isAdmin?9:8}" style="padding:20px;text-align:center;color:#64748b;font-size:12px">Нет записей</td></tr>` : workshopItems.map((item, i) => {
            const contract = contracts.find(c => c.id === item.contract_id);
            const stageIdx = WORKSHOP_STAGES.indexOf(item.stage);
            const statusColors = { 'В работе': '#00d4ff', 'Готово': '#00ff88', 'Задержка': '#ff4757', 'На паузе': '#ffa502' };
            const statusColor = statusColors[item.status] || '#64748b';
            return `<tr style="border-bottom:1px solid rgba(0,212,255,0.06)">
              <td style="padding:9px 10px;font-size:12px">
                ${contract ? `<span style="color:#00d4ff;font-size:11px;font-family:monospace">${contract.code||contract.id.substr(0,8)}</span><div style="font-size:10px;color:#94a3b8">${(contract.org||'').substr(0,20)}</div>` : `<span style="color:#64748b">—</span>`}
              </td>
              <td style="padding:9px 10px;font-size:12px;color:#e2e8f0">${escOr(item.item)}</td>
              <td style="padding:9px 10px;font-size:12px;color:#00d4ff;text-align:right">${item.qty || '—'}</td>
              <td style="padding:9px 10px">
                <div style="display:flex;align-items:center;gap:4px">${stageProgress(item.stage)}</div>
                <div style="font-size:10px;color:#00d4ff;margin-top:3px">${item.stage || '—'}</div>
              </td>
              <td style="padding:9px 10px;font-size:12px;color:#94a3b8">${escOr(item.executor)}</td>
              <td style="padding:9px 10px;font-size:11px;color:#64748b">${item.start_date || '—'}</td>
              <td style="padding:9px 10px;font-size:11px;color:#64748b">${item.ready_date || '—'}</td>
              <td style="padding:9px 10px"><span style="color:${statusColor};font-size:11px;font-weight:600">${item.status || '—'}</span></td>
              ${isAdmin ? `<td style="padding:9px 10px;white-space:nowrap">
                <button onclick="openEditWorkshopItem(${i})" style="background:none;border:none;cursor:pointer;color:#64748b;font-size:13px" title="Редактировать">✏️</button>
                <button onclick="deleteWorkshopItem(${i})" style="background:none;border:none;cursor:pointer;color:#ff4757;font-size:13px" title="Удалить">🗑️</button>
              </td>` : ''}
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
}

function workshopItemForm(idx) {
  const item = idx !== undefined ? (ls('kd_workshop_items', []))[idx] : {};
  const editing = idx !== undefined;
  return `<div style="background:#0d1a2e;border:1px solid rgba(0,212,255,0.3);border-radius:12px;width:480px;max-width:95vw;padding:24px">
    <h3 style="color:#00d4ff;font-size:14px;margin-bottom:16px">${editing ? '✏️ Редактировать' : '+ Добавить в цех'}</h3>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
      <div><label style="font-size:10px;color:#64748b;display:block;margin-bottom:3px">Договор</label>
        <select id="ws-contract" style="width:100%;padding:7px 9px;background:#0a1628;border:1px solid rgba(0,212,255,0.25);border-radius:6px;color:#e2e8f0;font-size:12px;outline:none">
          <option value="">— выбрать —</option>
          ${contracts.map(c=>`<option value="${c.id}" ${c.id===(item.contract_id||'')?'selected':''}>${c.code||c.id.substr(0,8)} — ${(c.org||'').substr(0,20)}</option>`).join('')}
        </select>
      </div>
      <div><label style="font-size:10px;color:#64748b;display:block;margin-bottom:3px">Изделие</label><input id="ws-item" type="text" value="${esc(item.item)}" style="width:100%;padding:7px 9px;background:#0a1628;border:1px solid rgba(0,212,255,0.25);border-radius:6px;color:#e2e8f0;font-size:12px;outline:none"></div>
      <div><label style="font-size:10px;color:#64748b;display:block;margin-bottom:3px">Кол-во</label><input id="ws-qty" type="text" value="${item.qty||''}" style="width:100%;padding:7px 9px;background:#0a1628;border:1px solid rgba(0,212,255,0.25);border-radius:6px;color:#e2e8f0;font-size:12px;outline:none"></div>
      <div><label style="font-size:10px;color:#64748b;display:block;margin-bottom:3px">Этап</label>
        <select id="ws-stage" style="width:100%;padding:7px 9px;background:#0a1628;border:1px solid rgba(0,212,255,0.25);border-radius:6px;color:#e2e8f0;font-size:12px;outline:none">
          ${WORKSHOP_STAGES.map(s=>`<option value="${s}" ${s===(item.stage||'')?'selected':''}>${s}</option>`).join('')}
        </select>
      </div>
      <div><label style="font-size:10px;color:#64748b;display:block;margin-bottom:3px">Исполнитель</label><input id="ws-exec" type="text" value="${esc(item.executor)}" style="width:100%;padding:7px 9px;background:#0a1628;border:1px solid rgba(0,212,255,0.25);border-radius:6px;color:#e2e8f0;font-size:12px;outline:none"></div>
      <div><label style="font-size:10px;color:#64748b;display:block;margin-bottom:3px">Статус</label>
        <select id="ws-status" style="width:100%;padding:7px 9px;background:#0a1628;border:1px solid rgba(0,212,255,0.25);border-radius:6px;color:#e2e8f0;font-size:12px;outline:none">
          ${['В работе','Готово','Задержка','На паузе'].map(s=>`<option value="${s}" ${s===(item.status||'')?'selected':''}>${s}</option>`).join('')}
        </select>
      </div>
      <div><label style="font-size:10px;color:#64748b;display:block;margin-bottom:3px">Дата начала</label><input id="ws-start" type="date" value="${item.start_date||''}" style="width:100%;padding:7px 9px;background:#0a1628;border:1px solid rgba(0,212,255,0.25);border-radius:6px;color:#e2e8f0;font-size:12px;outline:none"></div>
      <div><label style="font-size:10px;color:#64748b;display:block;margin-bottom:3px">Дата готовности</label><input id="ws-ready" type="date" value="${item.ready_date||''}" style="width:100%;padding:7px 9px;background:#0a1628;border:1px solid rgba(0,212,255,0.25);border-radius:6px;color:#e2e8f0;font-size:12px;outline:none"></div>
    </div>
    <div style="display:flex;gap:8px">
lid solid rgba(0,212,255,0.3);border-radius:6px;color:#00d4ff;font-size:12px;cursor:pointer;font-weight:600">✓ Сохранить</button>
      <button onclick="this.closest('[style*=fixed]').remove()" style="padding:8px 14px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:#94a3b8;border-radius:6px;cursor:pointer;font-size:12px">Отмена</button>
    </div>
  `;
}

function saveWorkshopItem(idx, btn) {
  const newItem = {
    contract_id: document.getElementById('ws-contract')?.value || '',
    item: document.getElementById('ws-item')?.value?.trim() || '',
    qty: document.getElementById('ws-qty')?.value?.trim() || '',
    stage: document.getElementById('ws-stage')?.value || WORKSHOP_STAGES[0],
    executor: document.getElementById('ws-exec')?.value?.trim() || '',
    status: document.getElementById('ws-status')?.value || 'В работе',
    start_date: document.getElementById('ws-start')?.value || '',
    ready_date: document.getElementById('ws-ready')?.value || '',
  };
  if (idx !== undefined && idx !== null && !isNaN(idx)) {
    workshopItems[idx] = newItem;
  } else {
    workshopItems.push(newItem);
  }
  lsw('kd_workshop_items', workshopItems);
  btn.closest('[style*=fixed]').remove();
  renderWorkshopPage();
  showToast('Сохранено');
}

function deleteWorkshopItem(idx) {
  if (!confirm('Удалить из цеха?')) return;
  workshopItems.splice(idx, 1);
  lsw('kd_workshop_items', workshopItems);
  renderWorkshopPage();
}

function openWorkshopAccess() {
  const current = ls('kd_workshop_access', ['admin']);
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9000;display:flex;align-items:center;justify-content:center';
  overlay.innerHTML = `
    <div style="background:#0d1a2e;border:1px solid rgba(0,212,255,0.3);border-radius:12px;padding:24px;width:340px">
      <div style="font-size:14px;font-weight:700;color:#e2e8f0;margin-bottom:14px">👁 Доступ к швейному цеху</div>
      <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:18px">
        ${Object.entries(ROLES).filter(([k])=>k!=='admin').map(([k,v])=>`
          <label style="display:flex;align-items:center;gap:10px;cursor:pointer;padding:8px 10px;border:1px solid rgba(0,212,255,0.12);border-radius:7px">
            <input type="checkbox" id="wsacc-${k}" ${current.includes(k)?'checked':''} style="accent-color:#00d4ff">
            <span>${v.i} ${v.l}</span>
          </label>`).join('')}
      </div>
      <div style="display:flex;gap:8px">
        <button onclick="saveWorkshopAccess(this)" style="flex:1;padding:9px;background:rgba(0,212,255,0.15);border:1px solid rgba(0,212,255,0.4);color:#00d4ff;border-radius:7px;cursor:pointer;font-weight:600">✓ Сохранить</button>
        <button onclick="this.closest('[style*=fixed]').remove()" style="padding:9px 14px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:#94a3b8;border-radius:7px;cursor:pointer">Отмена</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
}

function saveWorkshopAccess(btn) {
  const newAccess = Object.keys(ROLES).filter(k => document.getElementById('wsacc-'+k)?.checked);
  if (!newAccess.includes('admin')) newAccess.push('admin');
  lsw('kd_workshop_access', newAccess);
  btn.closest('[style*=fixed]').remove();
  updateNavVisibility();
  showToast('Доступ обновлён');
}

// ===== NAVIGATION UPDATE =====
function updateNavVisibility() {
  const tabs = document.getElementById('navtabs');
  if (!tabs) return;
  if (currentRole === 'admin') {
    tabs.style.display = 'flex';
    tabs.innerHTML = PAGES.admin.map(p =>
      `<div class="ntab${currentPage===p.id?' active':''}" data-page="${p.id}" onclick="goPage('${p.id}')">${p.l}</div>`
    ).join('');
  } else {
    const whAccess = ls('kd_warehouse_access', ['admin']);
    const wsAccess = ls('kd_workshop_access', ['admin']);
    const hasWh = whAccess.includes(currentRole);
    const hasWs = wsAccess.includes(currentRole);
    tabs.style.display = (hasWh || hasWs) ? 'flex' : 'none';
    let tabHtml = `<div class="ntab${currentPage==='contracts'?' active':''}" data-page="contracts" onclick="goPage('contracts')">📋 Договора</div>`;
    if (hasWh) tabHtml += `<div class="ntab${currentPage==='warehouse'?' active':''}" data-page="warehouse" onclick="goPage('warehouse')">🏪 Склад</div>`;
    if (hasWs) tabHtml += `<div class="ntab${currentPage==='workshop'?' active':''}" data-page="workshop" onclick="goPage('workshop')">🧵 Швейный цех</div>`;
    tabs.innerHTML = tabHtml;
  }
}

// ===== INIT =====
initLogin();
initNavTabs();
applyZoom();
// Migrate plain-text passwords to SHA-256 hashes
migratePasswords();
migrateCustomUsers();
