const APP_PAGES = [
  { id: 'contracts', label: '📋 Договора' },
  { id: 'analytics', label: '📊 Аналитика' },
  { id: 'finance', label: '💰 Финансы' },
  { id: 'expenses', label: '🏢 Расходы' }
];

let currentPage = 'contracts';
let zoomLevel = 100;

function initNavTabs() {
  const navtabs = document.getElementById('navtabs');
  if (!navtabs) return;
  navtabs.innerHTML = APP_PAGES.map(page => `
    <div class="ntab ${page.id === currentPage ? 'active' : ''}" onclick="goPage('${page.id}')">${page.label}</div>
  `).join('');
}

function goPage(page) {
  currentPage = page;
  initNavTabs();
  const main = document.getElementById('main');
  if (!main) return;
  if (page === 'contracts') renderContractsPage(main);
  else if (page === 'analytics') renderAnalyticsPage(main);
  else if (page === 'finance') renderFinancePage(main);
  else if (page === 'expenses') renderExpensesPage(main);
}

function zoom(value) {
  if (value === 0) zoomLevel = 100;
  else zoomLevel = Math.max(60, Math.min(140, zoomLevel + value * 10));
  const inner = document.getElementById('app-inner');
  if (inner) inner.style.fontSize = `${zoomLevel}%`;
  const label = document.getElementById('zlbl');
  if (label) label.textContent = `${zoomLevel}%`;
}

function scrollTbl(delta) {
  const scrollContainer = document.querySelector('.tscroll');
  if (scrollContainer) scrollContainer.scrollBy({ top: delta, behavior: 'smooth' });
}

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
  const link = document.createElement('a');
  link.href = url;
  link.download = `kazdemeu_export_${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function importData(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  event.target.value = '';
  const reader = new FileReader();
  reader.onload = async e => {
    try {
      const data = JSON.parse(e.target.result);
      if (Array.isArray(data.contracts)) contracts = data.contracts;
      if (data.contractCosts) contractCosts = data.contractCosts;
      if (data.contractFiles) contractFiles = data.contractFiles;
      if (data.contractStatuses) contractStatuses = data.contractStatuses;
      if (Array.isArray(data.expenseCategories)) expenseCategories = data.expenseCategories;
      if (data.expenseRecords) expenseRecords = data.expenseRecords;
      goPage(currentPage);
      showToast('✅ Данные успешно импортированы', 'info');
    } catch (error) {
      showToast('❌ Ошибка импорта: ' + error.message, 'danger');
    }
  };
  reader.readAsText(file);
}

async function initApp() {
  initLogin();
  const restored = await restoreSession();
  if (!restored) {
    document.getElementById('app').style.display = 'none';
    document.getElementById('loginWrap').style.display = 'flex';
  }
}

window.goPage = goPage;
window.zoom = zoom;
window.scrollTbl = scrollTbl;
window.exportData = exportData;
window.importData = importData;
window.initApp = initApp;

window.addEventListener('DOMContentLoaded', initApp);
