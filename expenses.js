// === expenses.js ===
// ===== АДМИНИСТРАТИВНЫЕ РАСХОДЫ =====

let expenseCategories = [];
let expenseRecords = {};
let admDragSrcId = null;
let admResizing = null;
let admColWidths = JSON.parse(localStorage.getItem('kd_adm_cw') || '{}');

async function loadExpenses() {
  try {
    const [cats, records] = await Promise.all([
      supabase.query('expense_categories', { select: '*', order: 'sort_order.asc' }),
      supabase.query('expense_records', { select: '*', order: 'created_at.asc' })
    ]);
    expenseCategories = cats || [];
    expenseRecords = {};
    (records || []).forEach(r => {
      if (!expenseRecords[r.category_id]) expenseRecords[r.category_id] = [];
      expenseRecords[r.category_id].push(r);
    });
  } catch(e) { console.error('Load expenses error:', e); }
}

async function admAddCat() {
  const name = prompt('Название категории:');
  if (!name?.trim()) return;
  try {
    const result = await supabase.insert('expense_categories', {
      name: name.trim(),
      sort_order: expenseCategories.length
    });
    expenseCategories.push(result[0]);
    renderExpensesPage();
  } catch(e) { alert('Ошибка: ' + e.message); }
}

async function admDelCat(id) {
  if (!confirm('Удалить категорию и все записи?')) return;
  try {
    await supabase.delete('expense_categories', id);
    expenseCategories = expenseCategories.filter(c => c.id !== id);
    delete expenseRecords[id];
    renderExpensesPage();
  } catch(e) { alert('Ошибка: ' + e.message); }
}

async function admEditCat(id) {
  const cat = expenseCategories.find(c => c.id === id);
  if (!cat) return;
  const name = prompt('Новое название:', cat.name);
  if (!name?.trim()) return;
  try {
    await supabase.update('expense_categories', id, { name: name.trim() });
    cat.name = name.trim();
    renderExpensesPage();
  } catch(e) { alert('Ошибка: ' + e.message); }
}

async function admAddCell(catId) {
  const sEl = document.getElementById('adm-s-' + catId);
  const cEl = document.getElementById('adm-c-' + catId);
  const s = parseFloat((sEl?.value || '').replace(/\s/g, '').replace(',', '.'));
  const c = cEl?.value?.trim() || '';
  if (!s || s <= 0) { if (sEl) sEl.style.borderColor = 'red'; return; }
  try {
    const result = await supabase.insert('expense_records', {
      category_id: catId, amount: s, comment: c
    });
    if (!expenseRecords[catId]) expenseRecords[catId] = [];
    expenseRecords[catId].push(result[0]);
    if (sEl) sEl.value = '';
    if (cEl) cEl.value = '';
    renderExpensesPage();
  } catch(e) { alert('Ошибка: ' + e.message); }
}

function admShowInput(catId, btn) {
  const td = btn.closest('td');
  td.innerHTML = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:3px 4px">
    <input placeholder="Сумма" type="number" id="adm-s-${catId}" style="width:100%;padding:4px 6px;border:1px solid rgba(0,212,255,0.3);border-radius:4px;font-size:12px;font-family:inherit;outline:none;text-align:right;background:#0a1628;color:#e2e8f0" onkeydown="if(event.key==='Enter')admAddCell('${catId}')">
    <input placeholder="Комментарий" type="text" id="adm-c-${catId}" style="width:100%;padding:4px 6px;border:1px solid rgba(0,212,255,0.3);border-radius:4px;font-size:12px;font-family:inherit;outline:none;background:#0a1628;color:#e2e8f0" onkeydown="if(event.key==='Enter')admAddCell('${catId}')">
  </div>`;
  document.getElementById('adm-s-' + catId)?.focus();
}

async function admEditCell(catId, recordId, field) {
  const records = expenseRecords[catId] || [];
  const r = records.find(x => x.id === recordId);
  if (!r) return;
  const cur = field === 'amount' ? r.amount : r.comment;
  const val = prompt(field === 'amount' ? 'Новая сумма:' : 'Новый комментарий:', cur || '');
  if (val === null) return;
  const update = {};
  if (field === 'amount') {
    const n = parseFloat(val.replace(/\s/g, '').replace(',', '.'));
    if (!n || n <= 0) return;
    update.amount = n;
  } else {
    update.comment = val.trim();
  }
  try {
    await supabase.update('expense_records', recordId, update);
    Object.assign(r, update);
    renderExpensesPage();
  } catch(e) { alert('Ошибка: ' + e.message); }
}

async function admDelRow(catId, recordId) {
  try {
    await supabase.delete('expense_records', recordId);
    expenseRecords[catId] = (expenseRecords[catId] || []).filter(r => r.id !== recordId);
    renderExpensesPage();
  } catch(e) { alert('Ошибка: ' + e.message); }
}

// Column drag
function admColDragStart(e, catId) {
  admDragSrcId = catId;
  e.dataTransfer.effectAllowed = 'move';
  e.currentTarget.style.opacity = '.5';
}
function admColDragOver(e, catId) {
  e.preventDefault();
  document.querySelectorAll('.adm-th-drag').forEach(el => el.classList.remove('adm-th-drag-over'));
  if (catId !== admDragSrcId) e.currentTarget.classList.add('adm-th-drag-over');
}
async function admColDrop(e, targetId) {
  e.preventDefault();
  document.querySelectorAll('.adm-th-drag').forEach(el => el.classList.remove('adm-th-drag-over'));
  if (!admDragSrcId || admDragSrcId === targetId) return;
  const si = expenseCategories.findIndex(c => c.id === admDragSrcId);
  const ti = expenseCategories.findIndex(c => c.id === targetId);
  if (si < 0 || ti < 0) return;
  const [moved] = expenseCategories.splice(si, 1);
  expenseCategories.splice(ti, 0, moved);
  admDragSrcId = null;
  renderExpensesPage();
  // Save sort orders
  await Promise.all(expenseCategories.map((c, i) => supabase.update('expense_categories', c.id, { sort_order: i })));
}
function admColDragEnd() {
  admDragSrcId = null;
  document.querySelectorAll('.adm-th-drag').forEach(el => { el.style.opacity = ''; el.classList.remove('adm-th-drag-over'); });
}

// Column resize
function admResizerStart(e, catId) {
  e.preventDefault(); e.stopPropagation();
  const th = e.target.closest('th');
  admResizing = { catId, th, startX: e.clientX, startW: th.getBoundingClientRect().width };
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
}
document.addEventListener('mousemove', e => {
  if (!admResizing) return;
  const w = Math.max(140, admResizing.startW + (e.clientX - admResizing.startX));
  admResizing.th.style.minWidth = w + 'px';
});
document.addEventListener('mouseup', () => {
  if (!admResizing) return;
  admColWidths[admResizing.catId] = admResizing.th.getBoundingClientRect().width;
  localStorage.setItem('kd_adm_cw', JSON.stringify(admColWidths));
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
  admResizing = null;
});

async function renderExpensesPage(m) {
  if (!m) m = document.getElementById('main');
  if (currentRole !== 'admin') {
    m.innerHTML = '<div class="nodata">Доступно только администратору</div>';
    return;
  }
  
  if (expenseCategories.length === 0) await loadExpenses();
  
  const totalAll = expenseCategories.reduce((s, cat) =>
    s + (expenseRecords[cat.id] || []).reduce((ss, r) => ss + Number(r.amount), 0), 0);
  const maxRows = Math.max(...expenseCategories.map(cat => (expenseRecords[cat.id] || []).length), 0);

  m.style.cssText = 'display:flex;flex-direction:column;height:100%;overflow:hidden;min-height:0';
  m.innerHTML = `
    <div class="stats">
      <div class="sc"><div class="sl">Категорий</div><div class="sv">${expenseCategories.length}</div></div>
      <div class="sc"><div class="sl">Всего расходов</div><div class="sv" style="color:#ff4757;font-size:13px">${fmtN(totalAll)}</div></div>
    </div>
    <div style="padding:0 14px 6px;display:flex;gap:8px;flex-shrink:0;align-items:center">
      <button class="btn btn-p" onclick="admAddCat()">+ Добавить колонку</button>
      <button onclick="document.getElementById('admScroll').scrollBy({left:-300,behavior:'smooth'})" style="padding:4px 12px;background:rgba(0,212,255,0.1);color:var(--accent);border:1px solid rgba(0,212,255,0.25);border-radius:5px;cursor:pointer;font-size:14px">◀</button>
      <button onclick="document.getElementById('admScroll').scrollBy({left:300,behavior:'smooth'})" style="padding:4px 12px;background:rgba(0,212,255,0.1);color:var(--accent);border:1px solid rgba(0,212,255,0.25);border-radius:5px;cursor:pointer;font-size:14px">▶</button>
    </div>
    <div id="admScroll" style="flex:1;overflow:auto;padding:0 14px 14px">
      <table id="admTable" style="border-collapse:collapse;min-width:max-content;width:auto">
        <thead>
          <tr style="background:#050d1a;color:#e2e8f0;position:sticky;top:0;z-index:10">
            <th style="padding:8px 12px;font-size:11px;font-weight:600;border:1px solid rgba(0,212,255,0.15);min-width:40px;background:#050d1a;color:var(--accent)">#</th>
            ${expenseCategories.map(cat => {
              const catTotal = (expenseRecords[cat.id] || []).reduce((s, r) => s + Number(r.amount), 0);
              const w = admColWidths[cat.id] ? `min-width:${admColWidths[cat.id]}px;width:${admColWidths[cat.id]}px` : 'min-width:220px';
              return `<th draggable="true" data-catid="${cat.id}" class="adm-th-drag" style="padding:0;border:1px solid rgba(0,212,255,0.15);${w};background:#050d1a;position:relative"
                ondragstart="admColDragStart(event,'${cat.id}')"
                ondragover="admColDragOver(event,'${cat.id}')"
                ondrop="admColDrop(event,'${cat.id}')"
                ondragend="admColDragEnd()">
                <div style="display:flex;flex-direction:column;gap:2px;padding:6px 10px">
                  <div style="display:flex;align-items:center;justify-content:space-between;gap:6px">
                    <span style="font-size:12px;font-weight:700;white-space:nowrap;color:var(--accent)">⠿ ${cat.name}</span>
                    <div style="display:flex;gap:3px;flex-shrink:0">
                      <button onclick="admEditCat('${cat.id}')" style="background:rgba(0,212,255,0.1);border:1px solid rgba(0,212,255,0.2);border-radius:3px;padding:1px 5px;font-size:10px;cursor:pointer;color:var(--accent)">✏️</button>
                      <button onclick="admDelCat('${cat.id}')" style="background:rgba(255,71,87,0.15);border:1px solid rgba(255,71,87,0.3);border-radius:3px;padding:1px 5px;font-size:10px;cursor:pointer;color:#ff4757">✕</button>
                    </div>
                  </div>
                  <div style="font-size:11px;color:#ff4757;font-weight:600">Итого: ${fmtN(catTotal)}</div>
                </div>
                <div class="adm-col-resizer" onmousedown="admResizerStart(event,'${cat.id}')"></div>
              </th>`;
            }).join('')}
            <th style="padding:8px;border:1px solid rgba(0,212,255,0.15);min-width:44px;background:#050d1a">
              <button onclick="admAddCat()" style="background:rgba(0,212,255,0.1);border:1px solid rgba(0,212,255,0.25);border-radius:4px;padding:3px 8px;color:var(--accent);cursor:pointer;font-size:14px;font-weight:700">+</button>
            </th>
          </tr>
          <tr style="background:#0a1628;position:sticky;top:41px;z-index:9">
            <th style="padding:5px 12px;font-size:9px;color:#64748b;border:1px solid rgba(0,212,255,0.1)">#</th>
            ${expenseCategories.map(() => `
              <th style="padding:4px 8px;border:1px solid rgba(0,212,255,0.1)">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">
                  <span style="font-size:9px;color:var(--accent);font-weight:600;text-align:right">СУММА</span>
                  <span style="font-size:9px;color:#64748b;font-weight:600">КОММЕНТАРИЙ</span>
                </div>
              </th>`).join('')}
            <th style="border:1px solid rgba(0,212,255,0.1)"></th>
          </tr>
        </thead>
        <tbody>
          ${Array.from({ length: maxRows + 3 }, (_, rowIdx) => {
            return `<tr style="${rowIdx % 2 === 0 ? 'background:#070f1d' : 'background:#0a1628'}">
              <td style="padding:6px 10px;font-size:11px;color:#64748b;text-align:center;border:1px solid rgba(0,212,255,0.08);background:#0a1628;font-weight:600">${rowIdx < maxRows ? rowIdx + 1 : ''}</td>
              ${expenseCategories.map(cat => {
                const records = expenseRecords[cat.id] || [];
                const r = records[rowIdx];
                if (r) {
                  return `<td style="padding:0;border:1px solid rgba(0,212,255,0.08);position:relative" class="adm-data-cell">
                    <div style="display:grid;grid-template-columns:1fr 1fr;min-height:32px">
                      <div onclick="admEditCell('${cat.id}','${r.id}','amount')" style="padding:6px 8px;text-align:right;font-weight:600;color:#00d4ff;font-size:12px;cursor:pointer;border-right:1px solid rgba(0,212,255,0.08)" title="Нажмите для изменения">${fmtN(r.amount)}</div>
                      <div onclick="admEditCell('${cat.id}','${r.id}','comment')" style="padding:6px 8px;font-size:12px;color:#e2e8f0;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:150px" title="${esc(r.comment)}">${escOr(r.comment)}</div>
                    </div>
                    <button onclick="admDelRow('${cat.id}','${r.id}')" class="adm-del-cell-btn" title="Удалить">✕</button>
                  </td>`;
                } else {
                  return `<td style="padding:2px 6px;border:1px solid rgba(0,212,255,0.08);background:#070f1d" class="adm-empty-cell">
                    <div style="display:flex;align-items:center;justify-content:center;min-height:28px">
                      <button onclick="admShowInput('${cat.id}',this)" style="opacity:0;background:rgba(0,212,255,0.07);border:1px dashed rgba(0,212,255,0.25);border-radius:4px;padding:2px 10px;font-size:13px;color:var(--accent);cursor:pointer" class="adm-plus-btn" title="Добавить">+</button>
                    </div>
                  </td>`;
                }
              }).join('')}
              <td style="border:1px solid rgba(0,212,255,0.08)"></td>
            </tr>`;
          }).join('')}
          <tr style="background:#050d1a;color:#e2e8f0;position:sticky;bottom:0">
            <td style="padding:8px 10px;font-size:11px;font-weight:700;border:1px solid rgba(0,212,255,0.15);text-align:center;color:var(--accent)">∑</td>
            ${expenseCategories.map(cat => {
              const catTotal = (expenseRecords[cat.id] || []).reduce((s, r) => s + Number(r.amount), 0);
              return `<td style="padding:8px 10px;border:1px solid rgba(0,212,255,0.15)">
                <div style="display:grid;grid-template-columns:1fr 1fr">
                  <div style="text-align:right;font-weight:700;color:#ff4757;font-size:13px">${fmtN(catTotal)}</div>
                  <div></div>
                </div>
              </td>`;
            }).join('')}
            <td style="border:1px solid rgba(0,212,255,0.15)"></td>
          </tr>
        </tbody>
      </table>
    </div>`;
}
