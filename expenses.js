function renderExpensesPage(container) {
  if (!container) container = document.getElementById('main');
  if (currentRole !== 'admin') {
    container.innerHTML = '<div class="nodata">Доступно только администратору</div>';
    return;
  }

  const totalExpenses = (expenseCategories || []).reduce((sum, category) => {
    return sum + (expenseRecords[category.id] || []).reduce((inner, item) => inner + Number(item.amount || 0), 0);
  }, 0);

  container.innerHTML = `
    <div class="stats">
      <div class="sc"><div class="sl">Категорий</div><div class="sv">${(expenseCategories || []).length}</div></div>
      <div class="sc"><div class="sl">Всего расходов</div><div class="sv" style="color:#ff4757;font-size:13px">${fmtN(totalExpenses)}</div></div>
    </div>
    <div class="toolbar"><button class="btn btn-p" onclick="addExpenseCategory()">+ Добавить категорию</button></div>
    <div class="expenses-grid">
      ${(expenseCategories || []).map(category => {
        const records = expenseRecords[category.id] || [];
        return `
          <div class="expense-card">
            <div class="expense-card-header">
              <div>
                <strong>${esc(category.name)}</strong>
                <div class="expense-small">Итого: ${fmtN(records.reduce((sum, item) => sum + Number(item.amount || 0), 0))}</div>
              </div>
              <div>
                <button class="btn-link" onclick="editExpenseCategory(${JSON.stringify(category.id)})">✏️</button>
                <button class="btn-link" onclick="deleteExpenseCategory(${JSON.stringify(category.id)})">✕</button>
              </div>
            </div>
            <div class="expense-records">
              ${records.map(record => `
                <div class="expense-record">
                  <div>${fmtN(record.amount)}</div>
                  <div>${escOr(record.comment)}</div>
                  <div>${fmtDate(record.created_at)}</div>
                  <div><button class="btn-link" onclick="deleteExpenseRecord(${JSON.stringify(category.id)}, ${JSON.stringify(record.id)})">✕</button></div>
                </div>
              `).join('')}
            </div>
            <div class="expense-add">
              <input id="expense-amount-${category.id}" type="number" placeholder="Сумма" />
              <input id="expense-comment-${category.id}" placeholder="Комментарий" />
              <button class="btn btn-p" onclick="addExpenseRecord(${JSON.stringify(category.id)})">Добавить</button>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

async function addExpenseCategory() {
  const name = prompt('Название категории:');
  if (!name?.trim()) return;
  try {
    const result = await supabase.insert('expense_categories', { name: name.trim(), sort_order: (expenseCategories || []).length });
    expenseCategories = expenseCategories || [];
    expenseCategories.push(result[0] || result);
    renderExpensesPage();
  } catch (error) {
    showToast('Ошибка создания категории: ' + error.message, 'danger');
  }
}

async function editExpenseCategory(categoryId) {
  const category = (expenseCategories || []).find(item => item.id === categoryId);
  if (!category) return;
  const name = prompt('Новое название:', category.name || '');
  if (!name?.trim()) return;
  try {
    await supabase.update('expense_categories', categoryId, { name: name.trim() });
    category.name = name.trim();
    renderExpensesPage();
  } catch (error) {
    showToast('Ошибка редактирования категории: ' + error.message, 'danger');
  }
}

async function deleteExpenseCategory(categoryId) {
  if (!confirm('Удалить категорию и все её записи?')) return;
  try {
    await supabase.delete('expense_categories', categoryId);
    expenseCategories = (expenseCategories || []).filter(item => item.id !== categoryId);
    delete expenseRecords[categoryId];
    renderExpensesPage();
  } catch (error) {
    showToast('Ошибка удаления категории: ' + error.message, 'danger');
  }
}

async function addExpenseRecord(categoryId) {
  const amountInput = document.getElementById(`expense-amount-${categoryId}`);
  const commentInput = document.getElementById(`expense-comment-${categoryId}`);
  const amount = parseFloat((amountInput?.value || '').replace(/,/g, '.'));
  const comment = commentInput?.value?.trim() || '';
  if (!amount || amount <= 0) {
    if (amountInput) amountInput.style.borderColor = '#ff4757';
    return;
  }
  try {
    const result = await supabase.insert('expense_records', { category_id: categoryId, amount, comment });
    expenseRecords[categoryId] = expenseRecords[categoryId] || [];
    expenseRecords[categoryId].push(result[0] || result);
    amountInput.value = '';
    commentInput.value = '';
    renderExpensesPage();
  } catch (error) {
    showToast('Ошибка добавления записи: ' + error.message, 'danger');
  }
}

async function deleteExpenseRecord(categoryId, recordId) {
  try {
    await supabase.delete('expense_records', recordId);
    expenseRecords[categoryId] = (expenseRecords[categoryId] || []).filter(item => item.id !== recordId);
    renderExpensesPage();
  } catch (error) {
    showToast('Ошибка удаления записи: ' + error.message, 'danger');
  }
}

window.renderExpensesPage = renderExpensesPage;
window.addExpenseCategory = addExpenseCategory;
window.editExpenseCategory = editExpenseCategory;
window.deleteExpenseCategory = deleteExpenseCategory;
window.addExpenseRecord = addExpenseRecord;
window.deleteExpenseRecord = deleteExpenseRecord;
