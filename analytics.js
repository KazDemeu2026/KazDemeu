// === analytics.js ===
// ===== АНАЛИТИКА =====
function renderAnalyticsPage(m) {
  if (!m) m = document.getElementById('main');
  const data = contracts;
  const paid = data.filter(r => r.payment_status === 'paid');
  const tot = data.reduce((s, r) => s + Number(r.total || 0), 0);
  const ptot = paid.reduce((s, r) => s + Number(r.total || 0), 0);
  const avg = data.length ? tot / data.length : 0;

  const byFirm = {}, byOrg = {}, byItem = {}, byRegion = {};
  data.forEach(r => {
    byFirm[r.firm || '—'] = (byFirm[r.firm || '—'] || 0) + Number(r.total || 0);
    byOrg[r.org || '—'] = (byOrg[r.org || '—'] || 0) + Number(r.total || 0);
    const qty = parseInt(r.qty) || 0;
    byItem[r.item || '—'] = (byItem[r.item || '—'] || 0) + qty;

    const loc = r.location || '';
    let region = 'Не указан';
    if (loc.includes('Астана')) region = 'Астана';
    else if (loc.includes('Алматы')) region = 'Алматы';
    else if (loc.includes('Костанай')) region = 'Костанайская обл.';
    else if (loc.includes('Павлодар')) region = 'Павлодарская обл.';
    else if (loc.includes('Уральск') || loc.includes('ЗКО')) region = 'ЗКО';
    else if (loc.includes('Атырау')) region = 'Атырау';
    else if (loc) region = 'Другие';
    byRegion[region] = (byRegion[region] || 0) + 1;
  });

  const fs = Object.entries(byFirm).sort((a, b) => b[1] - a[1]);
  const os = Object.entries(byOrg).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const items = Object.entries(byItem).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const regions = Object.entries(byRegion).sort((a, b) => b[1] - a[1]);
  const mf = fs[0]?.[1] || 1, mo = os[0]?.[1] || 1, mi = items[0]?.[1] || 1, mr2 = regions[0]?.[1] || 1;

  const sc = { start: 0, plan: 0, finish: 0, none: 0 };
  data.forEach(r => {
    const all_statuses = Object.values(contractStatuses[r.id] || {});
    const v = all_statuses.find(s => s) || '';
    if (v === 'start') sc.start++;
    else if (v === 'plan') sc.plan++;
    else if (v === 'finish') sc.finish++;
    else sc.none++;
  });

  m.style.cssText = 'display:flex;flex-direction:column;height:100%;overflow:hidden;min-height:0';
  m.innerHTML = `
    <div class="stats">
      <div class="sc"><div class="sl">Договоров</div><div class="sv">${data.length}</div></div>
      <div class="sc"><div class="sl">Общая сумма</div><div class="sv" style="font-size:13px">${fmtN(tot)}</div></div>
      <div class="sc"><div class="sl">Оплачено</div><div class="sv" style="color:#00ff88;font-size:13px">${fmtN(ptot)}</div></div>
      <div class="sc"><div class="sl">Не оплачено</div><div class="sv" style="color:#ff4757;font-size:13px">${fmtN(tot - ptot)}</div></div>
      <div class="sc"><div class="sl">Средний чек</div><div class="sv" style="font-size:13px">${fmtN(avg)}</div></div>
    </div>
    <div class="apage"><div class="agrid">
      <div class="acard"><div class="actitle">📦 По фирмам</div>
        ${fs.map(([k, v]) => `<div class="brow"><div class="blabel" title="${k}">${k}</div><div class="btrack"><div class="bfill" style="width:${Math.round(v/mf*100)}%"></div></div><div class="bval">${fmtN(v)}</div></div>`).join('')}
      </div>
      <div class="acard"><div class="actitle">🏢 Топ организаций</div>
        ${os.map(([k, v]) => `<div class="brow"><div class="blabel" title="${k}">${k}</div><div class="btrack"><div class="bfill" style="width:${Math.round(v/mo*100)}%;background:#7c3aed"></div></div><div class="bval">${fmtN(v)}</div></div>`).join('')}
      </div>
      <div class="acard"><div class="actitle">🎯 Топ товаров</div>
        ${items.map(([k, v]) => `<div class="brow"><div class="blabel" title="${k}">${k}</div><div class="btrack"><div class="bfill" style="width:${Math.round(v/mi*100)}%;background:#0891b2"></div></div><div class="bval">${v.toLocaleString('ru')} шт.</div></div>`).join('')}
      </div>
      <div class="acard"><div class="actitle">🗺️ По регионам</div>
        ${regions.map(([k, v]) => `<div class="brow"><div class="blabel" title="${k}">${k}</div><div class="btrack"><div class="bfill" style="width:${Math.round(v/mr2*100)}%;background:#059669"></div></div><div class="bval">${v} дог.</div></div>`).join('')}
      </div>
      <div class="acard"><div class="actitle">📋 Статусы выполнения</div>
        ${[['🟡 Старт', sc.start, '#854d0e'], ['🔵 Плановая', sc.plan, '#1e40af'], ['🟢 Финиш', sc.finish, '#15803d'], ['— Не задан', sc.none, '#9ca3af']].map(([l, v, c]) => `
          <div class="brow"><div class="blabel">${l}</div><div class="btrack"><div class="bfill" style="width:${data.length ? Math.round(v/data.length*100) : 0}%;background:${c}"></div></div><div class="bval">${v} (${data.length ? Math.round(v/data.length*100) : 0}%)</div></div>`).join('')}
      </div>
      <div class="acard"><div class="actitle">💳 Оплата договоров</div>
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
          <div style="position:relative;width:80px;height:80px;flex-shrink:0">
            <svg viewBox="0 0 36 36" style="width:80px;height:80px;transform:rotate(-90deg)">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(0,212,255,0.1)" stroke-width="3"/>
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#00ff88" stroke-width="3"
                stroke-dasharray="${data.length ? Math.round(paid.length/data.length*100) : 0} 100" stroke-linecap="round"/>
            </svg>
            <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#00ff88">${data.length ? Math.round(paid.length/data.length*100) : 0}%</div>
          </div>
          <div>
            <div style="color:#00ff88;font-weight:600;font-size:12px">✅ ${paid.length} оплачено</div>
            <div style="color:#ff4757;font-weight:600;font-size:12px;margin-top:4px">❌ ${data.length - paid.length} не оплачено</div>
          </div>
        </div>
      </div>
    </div></div>`;
}

// ===== ФИНАНСЫ =====
function renderFinancePage(m) {
  if (!m) m = document.getElementById('main');
  const rows = contracts.map(r => {
    const cl = getCosts(r.id);
    const ct = cl.reduce((s, c) => s + Number(c.amount), 0);
    return { ...r, ct, profit: Number(r.total || 0) - ct, hasCosts: cl.length > 0 };
  });
  const gt = rows.reduce((s, r) => s + Number(r.total || 0), 0);
  const gc = rows.reduce((s, r) => s + r.ct, 0);
  const gp = gt - gc;
  const paid = rows.filter(r => r.payment_status === 'paid');
  const unpaid = rows.filter(r => r.payment_status !== 'paid');
  const paidSum = paid.reduce((s, r) => s + Number(r.total || 0), 0);
  const paidCosts = paid.reduce((s, r) => s + r.ct, 0);
  const realProfit = paidSum - paidCosts;
  const unpaidSum = unpaid.reduce((s, r) => s + Number(r.total || 0), 0);
  const pct = gt > 0 ? Math.round(paidSum/gt*100) : 0;
  const top5 = rows.filter(r => r.hasCosts).sort((a, b) => b.profit - a.profit).slice(0, 5);
  const firmProfit = {};
  rows.forEach(r => {
    if (!firmProfit[r.firm]) firmProfit[r.firm] = { sum: 0, costs: 0 };
    firmProfit[r.firm].sum += Number(r.total || 0);
    firmProfit[r.firm].costs += r.ct;
  });

  m.style.cssText = 'display:flex;flex-direction:column;height:100%;overflow:hidden;min-height:0';
  m.innerHTML = `
    <div class="stats">
      <div class="sc"><div class="sl">Общая сумма</div><div class="sv" style="font-size:13px">${fmtN(gt)}</div></div>
      <div class="sc"><div class="sl">Всего затрат</div><div class="sv" style="color:#ff4757;font-size:13px">${fmtN(gc)}</div></div>
      <div class="sc"><div class="sl">Прибыль</div><div class="sv" style="color:${gp>=0?'#00ff88':'#ff4757'};font-size:13px">${fmtN(gp)}</div></div>
      <div class="sc"><div class="sl">Дебиторка</div><div class="sv" style="color:#ffa502;font-size:13px">${fmtN(unpaidSum)}</div><div class="ss">${unpaid.length} дог.</div></div>
      <div class="sc"><div class="sl">Рентабельность</div><div class="sv" style="color:${gp>=0?'#00ff88':'#ff4757'}">${gc>0?Math.round(gp/gt*100):0}%</div></div>
    </div>
    <div class="fpage">
      <!-- ЂИВЫЕ ДЕНЬГј -->
      <div style="background:linear-gradient(135deg,rgba(5,13,26,0.9),rgba(10,22,40,0.95));border:1px solid rgba(0,212,255,0.2);border-radius:12px;padding:20px;margin-bottom:14px;color:#e2e8f0;box-shadow:0 0 20px rgba(0,212,255,0.1)">
        <div style="font-size:13px;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:.08em;margin-bottom:16px;font-family:'Orbitron',sans-serif">💵 Живые деньги</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;margin-bottom:16px">
          <div style="background:rgba(0,212,255,0.06);border:1px solid rgba(0,212,255,0.15);border-radius:8px;padding:14px">
            <div style="font-size:11px;color:#64748b;margin-bottom:4px">✅ Получено</div>
            <div style="font-size:20px;font-weight:700;color:#00ff88">${fmtN(paidSum)}</div>
            <div style="font-size:11px;color:#00ff88;opacity:0.7;margin-top:2px">${paid.length} договоров</div>
          </div>
          <div style="background:rgba(255,71,87,0.06);border:1px solid rgba(255,71,87,0.15);border-radius:8px;padding:14px">
            <div style="font-size:11px;color:#64748b;margin-bottom:4px">📤 Затраты</div>
            <div style="font-size:20px;font-weight:700;color:#ff4757">${fmtN(paidCosts)}</div>
            <div style="font-size:11px;color:#ff4757;opacity:0.7;margin-top:2px">${paidSum?Math.round(paidCosts/paidSum*100):0}%</div>
          </div>
          <div style="background:rgba(0,255,136,0.08);border:1px solid rgba(0,255,136,0.25);border-radius:8px;padding:14px">
            <div style="font-size:11px;color:#00ff88;margin-bottom:4px">🟢 Чистая прибыль</div>
            <div style="font-size:22px;font-weight:700;color:${realProfit>=0?'#00ff88':'#ff4757'}">${fmtN(realProfit)}</div>
            <div style="font-size:11px;color:#00ff88;opacity:0.7;margin-top:2px">${paidSum>0?Math.round(realProfit/paidSum*100):0}% маржа</div>
          </div>
          <div style="background:rgba(255,165,2,0.06);border:1px solid rgba(255,165,2,0.15);border-radius:8px;padding:14px">
            <div style="font-size:11px;color:#64748b;margin-bottom:4px">⏳ Ожидается</div>
            <div style="font-size:20px;font-weight:700;color:#ffa502">${fmtN(unpaidSum)}</div>
            <div style="font-size:11px;color:#ffa502;opacity:0.7;margin-top:2px">${unpaid.length} договоров</div>
          </div>
          <div style="background:rgba(124,58,237,0.1);border:1px solid rgba(124,58,237,0.25);border-radius:8px;padding:14px">
            <div style="font-size:11px;color:#c4b5fd;margin-bottom:4px">🚀 Потенциал</div>
            <div style="font-size:20px;font-weight:700;color:#c4b5fd">${fmtN(gp)}</div>
          </div>
        </div>
        <div>
          <div style="display:flex;justify-content:space-between;font-size:11px;color:#64748b;margin-bottom:5px">
            <span>Оплачено ${pct}%</span><span>${fmtN(paidSum)} из ${fmtN(gt)}</span>
          </div>
          <div style="height:8px;background:rgba(0,212,255,0.08);border-radius:4px;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#00d4ff,#00ff88);border-radius:4px;box-shadow:0 0 8px rgba(0,212,255,0.4)"></div>
          </div>
        </div>
      </div>

      <!-- ТОП-5 И РЕНТАБЕЛЬНОСТЬ -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
        <div class="acard"><div class="actitle">🏆 Топ-5 прибыльных</div>
          ${top5.length ? top5.map((r, i) => `
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;font-size:12px">
              <span style="font-weight:700;color:#64748b;min-width:16px">${i+1}</span>
              <div style="flex:1;min-width:0"><div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#e2e8f0">${esc(r.org)}</div><div style="font-size:10px;color:#64748b">${escOr(r.item)}</div></div>
              <span class="pp">${fmtN(r.profit)}</span>
            </div>`).join('') : '<div style="color:#64748b;font-size:12px">Нет данных о затратах</div>'}
        </div>
        <div class="acard"><div class="actitle">🏢 Рентабельность по фирмам</div>
          ${Object.entries(firmProfit).map(([k, v]) => {
            const pct2 = v.sum ? Math.round((v.sum - v.costs)/v.sum*100) : 0;
            return `<div style="margin-bottom:8px;font-size:12px">
              <div style="display:flex;justify-content:space-between;margin-bottom:3px"><span style="color:#e2e8f0">${k}</span><span style="font-weight:700;color:${pct2>=0?'#00ff88':'#ff4757'}">${pct2}%</span></div>
              <div style="height:6px;background:rgba(0,212,255,0.08);border-radius:3px;overflow:hidden"><div style="height:100%;width:${Math.min(100,Math.max(0,pct2))}%;background:${pct2>=0?'#00ff88':'#ff4757'};border-radius:3px"></div></div>
            </div>`;
          }).join('')}
        </div>
      </div>

      <!-- ЂЕБИТОРКА -->
      <div class="acard" style="margin-bottom:12px"><div class="actitle">⚠️ Дебиторская задолженность</div>
        <table class="ftable" style="margin-top:8px">
          <thead><tr><th>№</th><th>Организация</th><th>Предмет</th><th>Сумма</th></tr></thead>
          <tbody>
            ${unpaid.slice(0, 10).map((r, i) => `<tr><td>${i+1}</td><td style="font-size:12px">${esc(r.org)}</td><td style="font-size:12px">${escOr(r.item)}</td><td style="font-weight:600;color:#ffa502">${fmtN(r.total)}</td></tr>`).join('')}
            <tr style="font-weight:700;background:rgba(255,165,2,0.05)"><td colspan="3" style="text-align:right;padding-right:12px;color:#e2e8f0">ИТОГО:</td><td style="color:#ffa502">${fmtN(unpaidSum)}</td></tr>
          </tbody>
        </table>
      </div>

      <!-- ПОЛНАЯ ТАБЛИЦА -->
      <div class="acard"><div class="actitle">📆 Все договора (план vs факт)</div>
        <table class="ftable" style="margin-top:8px">
          <thead><tr><th>№</th><th>Закупка</th><th>Организация</th><th>Предмет</th><th>Сумма</th><th>Затраты</th><th>Прибыль</th><th>Оплата</th></tr></thead>
          <tbody>
            ${rows.map((r, i) => `<tr>
              <td>${i+1}</td>
              <td style="font-size:11px;font-family:monospace">${escOr(r.code)}</td>
              <td style="font-size:11px;max-width:140px">${esc(r.org)}</td>
              <td style="font-size:11px;max-width:150px">${escOr(r.item)}</td>
              <td style="font-weight:600">${fmtN(r.total)}</td>
              <td style="color:#ff4757">${r.ct ? fmtN(r.ct) : '—'}</td>
              <td class="${r.hasCosts?(r.profit>=0?'pp':'pn'):''}">${r.hasCosts?fmtN(r.profit):'—'}</td>
              <td>${r.payment_status==='paid'?'<span class="bdg bg">Оплачено</span>':'<span class="bdg br">Не опл.</span>'}</td>
            </tr>`).join('')}
            <tr style="background:rgba(0,212,255,0.04);font-weight:700">
              <td colspan="4" style="text-align:right;padding-right:12px;color:#e2e8f0">ИТОГО:</td>
              <td>${fmtN(gt)}</td>
              <td class="pn">${fmtN(gc)}</td>
              <td class="${gp>=0?'pp':'pn'}">${fmtN(gp)}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>`;
}
