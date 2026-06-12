// === grok.js ===
// ===== ИИ АССИСТЕНТ КазДемеу (офлайн, без внешних API) =====

let aiHistory = [];

function toggleGrok() {
  document.getElementById('grokPanel').classList.toggle('open');
}

function getContractsContext() {
  const all = (typeof contracts !== 'undefined' ? contracts : []);
  const paid = all.filter(r => r.payment_status === 'paid');
  const unpaid = all.filter(r => r.payment_status !== 'paid');
  const totalSum = all.reduce((s, r) => s + Number(r.total || 0), 0);
  const paidSum = paid.reduce((s, r) => s + Number(r.total || 0), 0);
  const debitorSum = totalSum - paidSum;
  const allCosts = typeof contractCosts !== 'undefined' ? contractCosts : {};
  const costsTotal = all.reduce((s, r) => {
    return s + (allCosts[r.id] || []).reduce((ss, c) => ss + Number(c.amount || 0), 0);
  }, 0);
  const byFirm = {};
  all.forEach(r => { byFirm[r.firm || 'Не указана'] = (byFirm[r.firm || 'Не указана'] || 0) + Number(r.total || 0); });
  return { all, paid, unpaid, totalSum, paidSum, debitorSum, costsTotal, byFirm };
}

function aiAnalyze(question) {
  const q = question.toLowerCase().trim();
  const ctx = getContractsContext();
  const { all, paid, unpaid, totalSum, paidSum, debitorSum, costsTotal, byFirm } = ctx;

  if (!all.length) return 'Договоров пока нет в системе.';

  if (/итог|сколько|всего|общ|сумм/.test(q)) {
    let ans = 'Итоги по договорам:\n\n';
    ans += 'Всего: ' + all.length + ' договоров\n';
    ans += 'Сумма: ' + fmtN(totalSum) + '\n';
    ans += 'Оплачено: ' + paid.length + ' — ' + fmtN(paidSum) + '\n';
    ans += 'Дебиторка: ' + fmtN(debitorSum);
    if (costsTotal > 0) ans += '\nЗатраты: ' + fmtN(costsTotal) + '\nПрибыль: ' + fmtN(totalSum - costsTotal);
    return ans;
  }

  if (/неопла|дебитор|долг/.test(q)) {
    if (!unpaid.length) return 'Все договора оплачены!';
    let ans = 'Неоплаченные (' + unpaid.length + ' шт.):\n\n';
    unpaid.slice(0, 10).forEach((r, i) => { ans += (i+1) + '. ' + (r.org || '—') + ' — ' + fmtN(r.total) + '\n'; });
    ans += '\nИтого: ' + fmtN(debitorSum);
    return ans;
  }

  if (/топ|дорог|крупн|большой/.test(q)) {
    const top = [...all].sort((a,b) => Number(b.total||0) - Number(a.total||0)).slice(0,5);
    let ans = 'Топ-5 по сумме:\n\n';
    top.forEach((r, i) => { ans += (i+1) + '. ' + (r.org || '—') + ' — ' + fmtN(r.total) + '\n'; });
    return ans;
  }

  if (/финанс|анализ|прибыл|рентабел|маржа/.test(q)) {
    const margin = totalSum > 0 ? ((totalSum - costsTotal) / totalSum * 100).toFixed(1) : 0;
    const payRate = all.length > 0 ? (paid.length / all.length * 100).toFixed(0) : 0;
    let ans = 'Финансовый анализ:\n\n';
    ans += 'Портфель: ' + all.length + ' договоров\n';
    ans += 'Объём: ' + fmtN(totalSum) + '\n';
    ans += 'Оплата: ' + payRate + '%\n';
    if (costsTotal > 0) ans += 'Затраты: ' + fmtN(costsTotal) + '\nМаржа: ' + margin + '%';
    return ans;
  }

  if (/риск|проблем|критич/.test(q)) {
    const risks = [];
    const dPct = totalSum > 0 ? (debitorSum / totalSum * 100) : 0;
    if (dPct > 40) risks.push('Критическая дебиторка: ' + dPct.toFixed(0) + '% (' + fmtN(debitorSum) + ')');
    else if (dPct > 20) risks.push('Высокая дебиторка: ' + dPct.toFixed(0) + '% (' + fmtN(debitorSum) + ')');
    if (costsTotal > totalSum * 0.85) risks.push('Затраты >85% — риск убытков');
    const noOrg = all.filter(r => !r.org);
    if (noOrg.length) risks.push(noOrg.length + ' договоров без организации');
    if (!risks.length) return 'Критических рисков не обнаружено.';
    return 'Выявленные риски:\n\n' + risks.join('\n');
  }

  if (/статус|этап|выполн/.test(q)) {
    const sts = typeof contractStatuses !== 'undefined' ? contractStatuses : {};
    const st = { start: 0, plan: 0, finish: 0, none: 0 };
    all.forEach(r => {
      const v = Object.values(sts[r.id] || {}).find(s => s) || '';
      if (v === 'start') st.start++;
      else if (v === 'plan') st.plan++;
      else if (v === 'finish') st.finish++;
      else st.none++;
    });
    return 'Статусы:\n\nСтарт: ' + st.start + '\nВ плане: ' + st.plan + '\nФиниш: ' + st.finish + '\nБез статуса: ' + st.none;
  }

  if (/оплачен/.test(q)) {
    let ans = 'Оплаченные (' + paid.length + ' — ' + fmtN(paidSum) + '):\n\n';
    paid.slice(0,8).forEach((r,i) => { ans += (i+1) + '. ' + (r.org||'—') + ' — ' + fmtN(r.total) + '\n'; });
    return ans;
  }

  return 'ИИ-Ассистент КазДемеу. Спросите:\n\n"Итоги" — статистика\n"Дебиторка" — неоплаченные\n"Топ" — крупные договора\n"Анализ" — финансы\n"Риски" — проблемы\n"Статусы" — этапы';
}

function grokSend() {
  const inp = document.getElementById('grokInput');
  const msg = (inp?.value || '').trim();
  if (!msg) return;
  inp.value = '';
  grokAsk(msg);
}

function grokAsk(msg) {
  const msgs = document.getElementById('grokMessages');
  const btn = document.getElementById('grokSendBtn');
  if (!msgs) return;
  msgs.innerHTML += '<div class="grok-msg user">' + esc(msg) + '</div>';
  msgs.scrollTop = msgs.scrollHeight;
  btn.disabled = true;
  btn.textContent = '...';
  setTimeout(() => {
    try {
      const reply = aiAnalyze(msg).replace(/\n/g, '<br>');
      msgs.innerHTML += '<div class="grok-msg ai">' + reply + '</div>';
    } catch(e) {
      msgs.innerHTML += '<div class="grok-msg ai" style="color:#ff4757">Ошибка: ' + e.message + '</div>';
    }
    msgs.scrollTop = msgs.scrollHeight;
    btn.disabled = false;
    btn.textContent = 'Отправить';
  }, 120);
                                }
