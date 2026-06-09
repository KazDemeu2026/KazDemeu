function renderAnalyticsPage(container) {
  if (!container) container = document.getElementById('main');
  const data = window.contracts || [];
  const paid = data.filter(item => item.payment_status === 'paid');
  const total = data.reduce((sum, item) => sum + Number(item.total || 0), 0);
  const paidSum = paid.reduce((sum, item) => sum + Number(item.total || 0), 0);
  const average = data.length ? total / data.length : 0;

  const byFirm = {};
  const byRegion = {};
  data.forEach(item => {
    const firm = item.firm || '—';
    byFirm[firm] = (byFirm[firm] || 0) + Number(item.total || 0);
    const region = item.location || 'Не указан';
    byRegion[region] = (byRegion[region] || 0) + 1;
  });

  const topFirms = Object.entries(byFirm).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const regions = Object.entries(byRegion).sort((a, b) => b[1] - a[1]).slice(0, 6);

  const statusCounts = data.reduce((acc, item) => {
    const statuses = Object.values(contractStatuses[item.id] || {});
    const value = statuses.find(Boolean) || 'none';
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});

  container.innerHTML = `
    <div class="stats">
      <div class="sc"><div class="sl">Договоров</div><div class="sv">${data.length}</div></div>
      <div class="sc"><div class="sl">Общая сумма</div><div class="sv" style="font-size:13px">${fmtN(total)}</div></div>
      <div class="sc"><div class="sl">Оплачено</div><div class="sv" style="color:#00ff88;font-size:13px">${fmtN(paidSum)}</div></div>
      <div class="sc"><div class="sl">Средний чек</div><div class="sv" style="font-size:13px">${fmtN(average)}</div></div>
    </div>
    <div class="apage">
      <div class="acard">
        <div class="actitle">📦 Топ фирм</div>
        ${topFirms.map(([name, value]) => `
          <div class="brow"><div class="blabel" title="${esc(name)}">${esc(name)}</div><div class="btrack"><div class="bfill" style="width:${Math.round(value / (topFirms[0]?.[1] || 1) * 100)}%"></div></div><div class="bval">${fmtN(value)}</div></div>
        `).join('')}
      </div>
      <div class="acard">
        <div class="actitle">🗺️ По регионам</div>
        ${regions.map(([name, count]) => `
          <div class="brow"><div class="blabel" title="${esc(name)}">${esc(name)}</div><div class="btrack"><div class="bfill" style="width:${Math.round(count / (regions[0]?.[1] || 1) * 100)}%;background:#059669"></div></div><div class="bval">${count} дог.</div></div>
        `).join('')}
      </div>
      <div class="acard">
        <div class="actitle">📋 Статусы</div>
        ${['start', 'plan', 'finish', 'none'].map(status => `
          <div class="brow"><div class="blabel">${status === 'none' ? 'Не задан' : STATUS_OPTS.find(item => item.v === status)?.l || status}</div><div class="btrack"><div class="bfill" style="width:${Math.round((statusCounts[status] || 0) / (data.length || 1) * 100)}%;background:${status === 'start' ? '#854d0e' : status === 'plan' ? '#1e40af' : status === 'finish' ? '#15803d' : '#9ca3af'}"></div></div><div class="bval">${statusCounts[status] || 0}</div></div>
        `).join('')}
      </div>
    </div>
  `;
}

window.renderAnalyticsPage = renderAnalyticsPage;
