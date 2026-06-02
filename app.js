// ===== ГЛАВНАЯ ЛОГИКА ПРИЛОЖЕНИЯ =====

let currentPage = 'contracts';
let zoomLvl = parseFloat(ls('kd_zoom', '1'));

// ===== ZOOM =====
function zoom(d) {
  if (d === 0) zoomLvl = 1;
  else if (d > 0) zoomLvl = Math.min(2, +(zoomLvl + 0.1).toFixed(1));
  else zoomLvl = Math.max(0.4, +(zoomLvl - 0.1).toFixed(1));
  applyZoom();
}
function applyZoom() {
  document.getElementById('app').style.zoom = zoomLvl;
  document.getElementById('zlbl').textContent = Math.round(zoomLvl * 100) + '%';
  lsw('kd_zoom', zoomLvl);
}
document.addEventListener('wheel', e => {
  if (!e.ctrlKey) return;
  e.preventDefault();
  zoom(e.deltaY < 0 ? 1 : -1);
}, { passive: false });

// ===== NAVIGATION =====
function goPage(p) {
  currentPage = p;
  
  if (currentRole === 'admin') {
    document.getElementById('navtabs').innerHTML = `
      <span class="ntab ${p === 'contracts' ? 'active' : ''}" onclick="goPage('contracts')">📄 Договора</span>
      <span class="ntab ext" onclick="openTab('analytics')">📊 Аналитика ↗</span>
      <span class="ntab ext" onclick="openTab('finance')">💰 Финансы ↗</span>
      <span class="ntab ${p === 'expenses' ? 'active' : ''}" onclick="goPage('expenses')">🏢 Адм. расходы</span>`;
  }
  
  const m = document.getElementById('main');
  if (p === 'contracts') renderContractsPage(m);
  else if (p === 'analytics') renderAnalyticsPage(m);
  else if (p === 'finance') renderFinancePage(m);
  else if (p === 'expenses') renderExpensesPage(m);
}

function openTab(p) {
  lsw('kd_open', { p, r: currentRole });
  const loc = window.location.href.split('#')[0];
  window.open(loc + '#' + p, '_blank');
}

// Check if opened as analytics/finance tab
const _hash = window.location.hash.replace('#', '');
const _open = _hash ? ls('kd_open', null) : null;
if (_open && _open.p === _hash && _open.r) {
  lsw('kd_open', null);
  window.addEventListener('DOMContentLoaded', async () => {
    currentRole = _open.r;
    document.getElementById('loginWrap').style.display = 'none';
    document.getElementById('app').style.display = 'flex';
    document.getElementById('tbadge').textContent = ROLES[currentRole].l;
    document.getElementById('tbadge').style.cssText = BADGES[currentRole];
    document.getElementById('snav').style.display = 'flex';
    document.getElementById('navtabs').innerHTML = `
      <span class="ntab" onclick="window.close()" style="color:#f87171">← Назад</span>
      <span class="ntab active">${_open.p === 'analytics' ? '📊 Аналитика' : '💰 Финансы'}</span>
      <span class="ntab" onclick="location.reload()" style="color:#60a5fa">🔄 Обновить</span>`;
    document.getElementById('navtabs').style.display = 'flex';
    applyZoom();
    await loadAllData();
    const m = document.getElementById('main');
    if (_open.p === 'analytics') renderAnalyticsPage(m);
    else renderFinancePage(m);
  });
}

// ===== SCROLL =====
function scrollTbl(dy) {
  const el = document.querySelector('.tscroll');
  if (el) el.scrollBy({ top: dy, behavior: 'smooth' });
}

// ===== RENDER CONTRACTS PAGE =====
function renderContractsPage(m) {
  if (!m) m = document.getElementById('main');
  const rows = filtered();
  const all = contracts;
  const paid = all.filter(r => r.payment_status === 'paid');
  const tot = all.reduce((s, r) => s + Number(r.total || 0), 0);

  const BNR = {
    admin:       ['b-blue',   '👑 Полный доступ'],
    manager:     ['b-green',  '💼 Менеджер — цены скрыты'],
    constructor: ['b-purple', '🔧 Конструктор — цены скрыты'],
    technolog:   ['b-teal',   '⚙️ Технолог — цены скрыты'],
    logist:      ['b-orange', '🚚 Логист — цены скрыты'],
    goszakup:    ['b-red',    '📋 Госзакупщик']
  };
  const [bc, bt] = BNR[currentRole];

  m.innerHTML = `
    <div class="stats">
      <div class="sc"><div class="sl">Всего</div><div class="sv">${all.length}</div><div class="ss">показано: ${rows.length}</div></div>
      <div class="sc"><div class="sl">Оплачено</div><div class="sv" style="color:#15803d">${paid.length}</div></div>
      <div class="sc"><div class="sl">Не оплачено</div><div class="sv" style="color:#dc2626">${all.length - paid.length}</div></div>
      ${canPrice() ? `<div class="sc"><div class="sl">Общая сумма</div><div class="sv" style="font-size:13px">${fmtN(tot)}</div></div>` : ''}
    </div>
    <div class="banner ${bc}">${bt}</div>
    ${showForm ? formHtml(!!editId) : ''}
    <div class="toolbar">
      ${canManage() ? `<button class="btn btn-p" onclick="startAdd()">+ Добавить</button>` : ''}
      <div class="sbox"><span class="si">🔍</span><input id="sinp" placeholder="Поиск..." value="${searchQ}" oninput="onSearch(this.value)"></div>
      <select class="fsel" onchange="filterFirm=this.value;renderContractsPage()">
        <option value="">Все фирмы</option>
        ${firms().map(f => `<option value="${f}" ${filterFirm === f ? 'selected' : ''}>${f}</option>`).join('')}
      </select>
    </div>
    <div class="twrap">
      <div class="thead-bar">
        <span class="th-title">Договора</span>
        <span class="cnt">${rows.length} записей</span>
      </div>
      <div class="tscroll" id="tscroll"><div id="tbody"></div></div>
    </div>`;
  
  renderTable();
  requestAnimationFrame(initResizers);
}

function renderTable() {
  const rows = filtered();
  const mr = myRoleKey();
  const canDrag = canManage();
  
  const cols = [];
  if (canDrag) cols.push({ k: 'drag', l: '' });
  cols.push({ k: 'num', l: '№' });
  if (canCosts()) cols.push({ k: 'costs', l: 'Затраты' });
  if (currentRole === 'admin') cols.push({ k: 'stat', l: 'Статусы' });
  if (mr) cols.push({ k: 'mystat', l: 'Статус' });
  cols.push({ k: 'files', l: 'Файлы' });
  cols.push({ k: 'code', l: 'Номер закупки' });
  cols.push({ k: 'firm', l: 'Фирма' });
  cols.push({ k: 'org', l: 'Организация' });
  cols.push({ k: 'item', l: 'Предмет' });
  cols.push({ k: 'qty', l: 'Кол-во' });
  if (canPrice()) {
    cols.push({ k: 'price', l: 'Цена' });
    cols.push({ k: 'total', l: 'Сумма' });
  }
  if (currentRole === 'admin' || currentRole === 'manager') cols.push({ k: 'pay', l: 'Оплата' });
  cols.push({ k: 'loc', l: 'Место поставки' });
  cols.push({ k: 'dl', l: 'Срок' });
  cols.push({ k: 'con', l: '№ договора' });
  cols.push({ k: 'ph', l: 'Телефон' });
  cols.push({ k: 'sig', l: 'Подписан' });
  cols.push({ k: 'dev', l: 'Исполнение' });
  if (canManage()) cols.push({ k: 'act', l: 'Действия' });

  let h = `<table><thead><tr>${cols.map(c => `<th>${c.l}</th>`).join('')}</tr></thead><tbody>`;

  rows.forEach((r, i) => {
    const isNew = (new Date() - new Date(r.created_at)) < 86400000 * 3;
    const isEdit = editId === r.id;
    const exp = expandedRows.has(r.id);
    const cl = getCosts(r.id);
    const cs = cl.reduce((s, c) => s + Number(c.amount), 0);
    const fl = getFiles(r.id);
    const pay = r.payment_status === 'paid'
      ? '<span class="bdg bg">Оплачено</span>'
      : '<span class="bdg br">Не оплачено</span>';

    const tds = cols.map(c => {
      switch(c.k) {
        case 'drag':   return `<td><div class="td"><span class="dh" draggable="false">⠿</span></div></td>`;
        case 'num':    return `<td><div class="td" style="color:#9ca3af;font-weight:600">${i+1}</div></td>`;
        case 'costs':  return `<td><div class="td"><button class="btn btn-g" style="font-size:11px;padding:2px 7px" onclick="toggleExp('${r.id}')">${exp?'▾':'▸'} ${cl.length ? `💸${cl.length}·${fmtN(cs)}` : '+'}</button></div></td>`;
        case 'stat':   return `<td><div class="td" style="min-width:120px" data-src="${r.id}">${statusCellHtml(r.id)}</div></td>`;
        case 'mystat': return `<td><div class="td">${statusSel(r.id, mr)}</div></td>`;
        case 'files':  return `<td><div class="td" style="display:flex;align-items:center;gap:4px">
          ${fl.length ? `<button class="btn btn-g" style="font-size:11px;padding:2px 6px" onclick="toggleExp('${r.id}')">📎${fl.length}</button>` : ''}
          <button onclick="addFileLink('${r.id}')" title="Добавить файл" style="width:22px;height:22px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:5px;cursor:pointer;color:#1a56db;font-size:14px;font-weight:700;display:inline-flex;align-items:center;justify-content:center">+</button>
        </div></td>`;
        case 'code':   return `<td><div class="td" style="font-size:11px;font-family:monospace;max-width:150px">${r.code || '—'}${isNew ? '<span class="bdg bnew" style="margin-left:4px">new</span>' : ''}</div></td>`;
        case 'firm':   return `<td><div class="td"><span class="bdg bfirm">${r.firm || '—'}</span></div></td>`;
        case 'org':    return `<td><div class="td" style="max-width:170px;font-size:12px">${r.org || '—'}</div></td>`;
        case 'item':   return `<td><div class="td" style="max-width:190px">${r.item || '—'}</div></td>`;
        case 'qty':    return `<td><div class="td" style="font-weight:700;font-size:14px">${r.qty || '—'}</div></td>`;
        case 'price':  return `<td><div class="td" style="color:#1d4ed8;font-weight:600;white-space:nowrap">${r.price ? fmtN(r.price) : '—'}</div></td>`;
        case 'total':  return `<td><div class="td" style="font-weight:600;white-space:nowrap">${r.total ? fmtN(r.total) : '—'}</div></td>`;
        case 'pay':
          if (currentRole === 'admin')
            return `<td><div class="td"><button onclick="togglePay('${r.id}')" style="border:none;background:none;cursor:pointer;padding:0">${pay}</button></div></td>`;
          return `<td><div class="td">${pay}</div></td>`;
        case 'loc':    return `<td><div class="td" style="max-width:140px;font-size:11px">${r.location || '—'}</div></td>`;
        case 'dl':     return `<td><div class="td" style="max-width:150px;font-size:11px">${r.deadline || '—'}</div></td>`;
        case 'con':    return `<td><div class="td" style="font-size:11px;font-family:monospace">${r.contract_number || '—'}</div></td>`;
        case 'ph':     return `<td><div class="td" style="font-size:11px">${r.phone || '—'}</div></td>`;
        case 'sig':    return `<td><div class="td" style="font-size:11px">${r.signed_date || '—'}</div></td>`;
        case 'dev':    return `<td><div class="td" style="font-size:11px">${r.delivery_date || '—'}</div></td>`;
        case 'act':    return `<td><div class="td" style="display:flex;gap:3px;align-items:center">
          <button class="cdel" style="color:#1d4ed8;opacity:.7" onclick="startEdit('${r.id}')" title="Редактировать">✏️</button>
          <button class="cdel" onclick="deleteRow('${r.id}')" title="Удалить">🗑</button>
          <button onclick="toggleVisibility('${r.id}')" title="${r.is_visible ? 'Скрыть' : 'Показать'}" style="background:none;border:none;cursor:pointer;font-size:13px;opacity:.7">${r.is_visible ? '👁' : '🙈'}</button>
        </div></td>`;
        default: return '<td></td>';
      }
    }).join('');

    h += `<tr data-id="${r.id}" class="${exp ? 'xrow' : ''}" style="${isEdit ? 'outline:2px solid #1a56db;background:#eff6ff' : ''}"
      ${canDrag ? `draggable="true" ondragstart="onDS(event,'${r.id}')" ondragend="onDE()" ondragover="onDO(event,'${r.id}')" ondrop="onDrop(event,'${r.id}')"` : ''}>
      ${tds}</tr>`;

    if (exp) {
      h += `<tr><td colspan="${cols.length}" style="padding:0"><div class="xpanel"><div class="xinner">
        ${canCosts() ? costsHtml(r, currentRole === 'admin') : ''}
        ${filesHtml(r.id, true, canDelFile())}
      </div></div></td></tr>`;
    }
  });

  h += `</tbody></table>${!rows.length ? '<div class="nodata">🔍 Ничего не найдено</div>' : ''}`;
  const tb = document.getElementById('tbody');
  if (tb) tb.innerHTML = h;
  requestAnimationFrame(initResizers);
}

// ===== EXPORT/IMPORT =====
function exportData() {
  const data = {
    contracts,
    contractCosts,
    contractFiles,
    contractStatuses,
    exported: new Date().toLocaleString('ru-RU')
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `КазДемеу_${new Date().toLocaleDateString('ru-RU').replace(/\./g, '-')}.json`;
  a.click();
}

function importData(e) {
  const file = e.target.files[0];
  if (!file) return;
  const r = new FileReader();
  r.onload = ev => {
    try {
      const d = JSON.parse(ev.target.result);
      alert(`✅ Данные загружены!\nДоговоров: ${d.contracts?.length || 0}`);
      e.target.value = '';
    } catch { alert('❌ Неверный формат файла'); }
  };
  r.readAsText(file);
}
