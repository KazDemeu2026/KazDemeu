const contracts = [];
let contractCosts = {};
let contractFiles = {};
let contractStatuses = {};
let contractComments = {};
let hiddenContracts = new Set(storageGet('kd_hidden', []));
let rowRoleVisibility = storageGet('kd_row_visibility', {});
let customFields = storageGet('kd_custom_fields', {});
let searchQ = '';
let filterFirm = '';
let expandedRows = new Set();
let editId = null;

const STATUS_OPTS = [
  { v: '', l: '— нет —', c: 'sn' },
  { v: 'start', l: '🟡 Старт', c: 'ss2' },
  { v: 'plan', l: '🔵 Плановая', c: 'sp' },
  { v: 'finish', l: '🟢 Финиш', c: 'sf' }
];

function getStatus(contractId, role) {
  return (contractStatuses[contractId] || {})[role] || '';
}

function safeRoleLabel(role) {
  return { manager: 'Мен.', constructor: 'Кон.', technolog: 'Тех.', logist: 'Лог.' }[role] || role;
}

function statusClass(status) {
  if (status === 'start') return 'by';
  if (status === 'plan') return 'bb';
  if (status === 'finish') return 'bg';
  return 'sn';
}

function statusBadge(status) {
  const option = STATUS_OPTS.find(item => item.v === status);
  if (!option || !option.v) return '<span style="color:#9ca3af;font-size:11px">—</span>';
  return `<span class="bdg ${statusClass(status)}">${esc(option.l)}</span>`;
}

function statusCellHtml(contractId) {
  return ['manager', 'constructor', 'technolog', 'logist'].map(role => `
    <div class="status-pill">
      <span>${esc(safeRoleLabel(role))}</span> ${statusBadge(getStatus(contractId, role))}
    </div>
  `).join('');
}

function statusSelect(contractId, role) {
  const current = getStatus(contractId, role);
  return `
    <select class="ssel ${statusClass(current)}" onchange="setStatus(${JSON.stringify(contractId)}, ${JSON.stringify(role)}, this.value)">
      ${STATUS_OPTS.map(item => `<option value="${esc(item.v)}"${item.v === current ? ' selected' : ''}>${esc(item.l)}</option>`).join('')}
    </select>
  `;
}

async function setStatus(contractId, role, value) {
  contractStatuses[contractId] = Object.assign(contractStatuses[contractId] || {}, { [role]: value });
  try {
    await supabase.upsert('contract_statuses', { contract_id: contractId, role, status: value }, 'contract_id,role');
    renderContractsPage();
  } catch (error) {
    showToast('Ошибка сохранения статуса: ' + error.message, 'danger');
  }
}

function getCosts(contractId) {
  return contractCosts[contractId] || [];
}

async function addCost(contractId) {
  const sumInput = document.getElementById(`cost-sum-${contractId}`);
  const commentInput = document.getElementById(`cost-comment-${contractId}`);
  const amount = parseFloat((sumInput?.value || '').replace(/,/g, '.'));
  const comment = commentInput?.value?.trim() || '';
  if (!amount || amount <= 0) {
    if (sumInput) sumInput.style.borderColor = '#ff4757';
    return;
  }
  try {
    const result = await supabase.insert('contract_costs', { contract_id: contractId, amount, comment });
    contractCosts[contractId] = contractCosts[contractId] || [];
    contractCosts[contractId].push(result[0] || result);
    expandedRows.add(contractId);
    renderContractsPage();
  } catch (error) {
    showToast('Ошибка добавления затрат: ' + error.message, 'danger');
  }
}

async function delCost(contractId, costId) {
  try {
    await supabase.delete('contract_costs', costId);
    contractCosts[contractId] = (contractCosts[contractId] || []).filter(item => item.id !== costId);
    renderContractsPage();
  } catch (error) {
    showToast('Ошибка удаления затрат: ' + error.message, 'danger');
  }
}

function costsHtml(contract) {
  const costs = getCosts(contract.id);
  return `
    <div class="panel">
      <div class="panel-title">💸 Затраты</div>
      ${costs.length ? costs.map(cost => `
        <div class="cost-row">
          <span>${fmtN(cost.amount)}</span>
          <span>${escOr(cost.comment)}</span>
          <span>${fmtDate(cost.created_at)}</span>
          <button class="btn-link" onclick="delCost(${JSON.stringify(contract.id)}, ${JSON.stringify(cost.id)})">✕</button>
        </div>
      `).join('') : '<div class="empty-row">Нет затрат</div>'}
      <div class="cost-add">
        <input id="cost-sum-${contract.id}" type="number" placeholder="Сумма" />
        <input id="cost-comment-${contract.id}" placeholder="Комментарий" />
        <button class="btn btn-p" onclick="addCost(${JSON.stringify(contract.id)})">Добавить</button>
      </div>
    </div>
  `;
}

function toggleExpanded(contractId) {
  if (expandedRows.has(contractId)) expandedRows.delete(contractId);
  else expandedRows.add(contractId);
  renderContractsPage();
}

function togglePay(contractId) {
  const row = contracts.find(item => item.id === contractId);
  if (!row) return;
  const nextStatus = row.payment_status === 'paid' ? 'unpaid' : 'paid';
  row.payment_status = nextStatus;
  supabase.update('contracts', contractId, { payment_status: nextStatus })
    .then(() => renderContractsPage())
    .catch(error => showToast('Ошибка обновления оплаты: ' + error.message, 'danger'));
}

function toggleVisibility(contractId) {
  const row = contracts.find(item => item.id === contractId);
  if (!row) return;
  row.is_visible = !row.is_visible;
  supabase.update('contracts', contractId, { is_visible: row.is_visible })
    .then(() => renderContractsPage())
    .catch(error => showToast('Ошибка обновления видимости: ' + error.message, 'danger'));
}

function filteredContracts() {
  return contracts.filter(contract => {
    if (hiddenContracts.has(contract.id) && currentRole !== 'admin') return false;
    if (!contract.is_visible && currentRole !== 'admin') return false;
    const allowedRoles = rowRoleVisibility[contract.id];
    if (allowedRoles && allowedRoles.length > 0 && currentRole !== 'admin') {
      if (!allowedRoles.includes(currentRole)) return false;
    }
    const query = normalizeString(searchQ);
    return (!query || [contract.item, contract.org, contract.code, contract.contract_number]
      .some(value => normalizeString(value).includes(query))) && (!filterFirm || contract.firm === filterFirm);
  });
}

function firms() {
  return [...new Set(contracts.map(contract => contract.firm).filter(Boolean))];
}

function renderContractsPage(container) {
  if (!container) container = document.getElementById('main');
  const rows = filteredContracts();
  const totalValue = contracts.reduce((sum, item) => sum + Number(item.total || 0), 0);
  const paidCount = contracts.filter(item => item.payment_status === 'paid').length;

  container.innerHTML = `
    <div class="stats">
      <div class="sc"><div class="sl">Всего договоров</div><div class="sv">${rows.length}</div></div>
      <div class="sc"><div class="sl">Оплачено</div><div class="sv" style="color:#15803d">${paidCount}</div></div>
      <div class="sc"><div class="sl">Не оплачено</div><div class="sv" style="color:#dc2626">${rows.length - paidCount}</div></div>
      <div class="sc"><div class="sl">Общая сумма</div><div class="sv" style="font-size:13px">${fmtN(totalValue)}</div></div>
    </div>
    <div class="toolbar">
      <div class="sbox"><span class="si">🔍</span><input id="searchInput" placeholder="Поиск..." value="${esc(searchQ)}" oninput="onContractSearch(this.value)"></div>
      <select onchange="onFirmFilter(this.value)">
        <option value="">Все фирмы</option>
        ${firms().map(firm => `<option value="${esc(firm)}" ${filterFirm === firm ? 'selected' : ''}>${esc(firm)}</option>`).join('')}
      </select>
    </div>
    <div class="twrap">
      <div class="thead-bar"><span class="th-title">Договора</span><span class="cnt">${rows.length} записей</span></div>
      <div class="tscroll"><div id="tbody"></div></div>
    </div>
  `;
  renderContractsTable();
}

function renderContractsTable() {
  const rows = filteredContracts();
  const tbody = document.getElementById('tbody');
  if (!tbody) return;
  if (!rows.length) {
    tbody.innerHTML = '<div class="nodata">🔍 Ничего не найдено</div>';
    return;
  }

  tbody.innerHTML = rows.map((contract, index) => {
    const costs = getCosts(contract.id);
    const expanded = expandedRows.has(contract.id);
    const totalCosts = costs.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const paymentLabel = contract.payment_status === 'paid'
      ? '<span class="bdg bg">Оплачено</span>'
      : '<span class="bdg br">Не оплачено</span>';

    return `
      <div class="contract-row">
        <div class="contract-main">
          <div class="contract-cell number">${index + 1}</div>
          <div class="contract-cell firm">${escOr(contract.firm)}</div>
          <div class="contract-cell org">${escOr(contract.org)}</div>
          <div class="contract-cell item">${escOr(contract.item)}</div>
          <div class="contract-cell total">${fmtN(contract.total)}</div>
          <div class="contract-cell status">${paymentLabel}</div>
          <div class="contract-cell action">
            <button class="btn-link" onclick="toggleExpanded(${JSON.stringify(contract.id)})">${expanded ? '▲' : '▼'}</button>
            <button class="btn-link" onclick="togglePay(${JSON.stringify(contract.id)})">💲</button>
            <button class="btn-link" onclick="toggleVisibility(${JSON.stringify(contract.id)})">${contract.is_visible ? '👁' : '🙈'}</button>
          </div>
        </div>
        ${expanded ? `<div class="contract-expand">
          <div class="contract-detail"><strong>Код:</strong> ${escOr(contract.code)}</div>
          <div class="contract-detail"><strong>Договор №:</strong> ${escOr(contract.contract_number)}</div>
          <div class="contract-detail"><strong>Срок:</strong> ${escOr(contract.deadline)}</div>
          <div class="contract-detail"><strong>Телефон:</strong> ${escOr(contract.phone)}</div>
          <div class="contract-detail status-grid">${statusCellHtml(contract.id)}</div>
          ${costsHtml(contract)}
        </div>` : ''}
      </div>
    `;
  }).join('');
}

function onContractSearch(value) {
  searchQ = value;
  renderContractsPage();
}

function onFirmFilter(value) {
  filterFirm = value;
  renderContractsPage();
}

window.toggleExpanded = toggleExpanded;
window.togglePay = togglePay;
window.toggleVisibility = toggleVisibility;
window.setStatus = setStatus;
window.onContractSearch = onContractSearch;
window.onFirmFilter = onFirmFilter;
window.loadAllData = async function() {
  setLoading('Загружаю данные...');
  try {
    const [contractRows, costRows, fileRows, statusRows, categoryRows, recordRows] = await Promise.all([
      supabase.query('contracts', { select: '*', order: 'sort_order.asc,created_at.desc' }),
      supabase.query('contract_costs', { select: '*', order: 'created_at.asc' }),
      supabase.query('contract_files', { select: '*', order: 'created_at.asc' }),
      supabase.query('contract_statuses', { select: '*' }),
      supabase.query('expense_categories', { select: '*', order: 'sort_order.asc' }),
      supabase.query('expense_records', { select: '*', order: 'created_at.asc' })
    ]);

    contracts.length = 0;
    (contractRows || []).forEach(item => contracts.push(item));
    contractCosts = {};
    (costRows || []).forEach(cost => {
      contractCosts[cost.contract_id] = contractCosts[cost.contract_id] || [];
      contractCosts[cost.contract_id].push(cost);
    });
    contractFiles = {};
    (fileRows || []).forEach(file => {
      contractFiles[file.contract_id] = contractFiles[file.contract_id] || [];
      contractFiles[file.contract_id].push(file);
    });
    contractStatuses = {};
    (statusRows || []).forEach(status => {
      contractStatuses[status.contract_id] = contractStatuses[status.contract_id] || {};
      contractStatuses[status.contract_id][status.role] = status.status;
    });
    expenseCategories = categoryRows || [];
    expenseRecords = {};
    (recordRows || []).forEach(record => {
      expenseRecords[record.category_id] = expenseRecords[record.category_id] || [];
      expenseRecords[record.category_id].push(record);
    });
    hideLoading();
  } catch (error) {
    hideLoading();
    showToast('Ошибка загрузки данных: ' + error.message, 'danger');
  }
};
