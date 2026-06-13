// === grok.js ===
// ===== ИИ АССИСТЕНТ КазДемеу (работает офлайн, без внешних API) =====

let aiHistory = [];

function toggleGrok() {
  document.getElementById('grokPanel').classList.toggle('open');
}

// ── Данные для AI-контекста ───────────────────────────────────────────────────
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

// ── Интеллектуальный анализ запроса ──────────────────────────────────────────
function aiAnalyze(question) {
  const q = question.toLowerCase().trim();
  const ctx = getContractsContext();
  const { all, paid, unpaid, totalSum, paidSum, debitorSum, costsTotal, byFirm } = ctx;

  // Нет данных
  if (!all.length) {
    return '📭 Договоров пока нет в системе. Добавьте первый договор через кнопку «+ Добавить».';
  }

  // ── Итоги / сколько / общая сумма ────────────────────────────────────────
  if (/итог|сколько|всего|общ|сумм/.test(q)) {
    const profitEst = totalSum - costsTotal;
    let ans = `📊 **Итоги по договорам:**\n\n`;
    ans += `• Всего договоров: **${all.length}**\n`;
    ans += `• Общая сумма: **${fmtN(totalSum)}**\n`;
    ans += `• Оплачено: **${paid.length} дог. — ${fmtN(paidSum)}**\n`;
    ans += `• Дебиторка: **${fmtN(debitorSum)}**\n`;
    if (costsTotal > 0) {
      ans += `• Затраты: **${fmtN(costsTotal)}**\n`;
      ans += `• Расчётная прибыль: **${fmtN(profitEst)}**\n`;
    }
    if (Object.keys(byFirm).length > 1) {
      ans += `\n📦 **По фирмам:**\n`;
      Object.entries(byFirm).sort((a,b)=>b[1]-a[1]).forEach(([k,v]) => {
        ans += `• ${k}: ${fmtN(v)}\n`;
      });
    }
    return ans;
  }

  // ── Неоплаченные / дебиторка ─────────────────────────────────────────────
  if (/неопла|дебитор|долг/.test(q)) {
    if (!unpaid.length) return '✅ Все договоры оплачены! Дебиторки нет.';
    let ans = `💰 **Неоплаченные договора (${unpaid.length}):**\n\n`;
    unpaid.forEach(r => {
      ans += `• ${r.org || r.firm || 'Б/н'} — ${fmtN(r.total)} (${r.code || '—'})\n`;
    });
    ans += `\n📊 Итого дебиторка: **${fmtN(debitorSum)}**`;
    return ans;
  }

  // ── Топ / самые дорогие ───────────────────────────────────────────────────
  if (/топ|дорог|самый|крупн/.test(q)) {
    const top = [...all].sort((a, b) => Number(b.total || 0) - Number(a.total || 0)).slice(0, 5);
    let ans = `🏆 **Топ-5 договоров по сумме:**\n\n`;
    top.forEach((r, i) => {
      ans += `${i + 1}. ${r.org || r.firm || 'Б/н'} — **${fmtN(r.total)}**\n`;
      if (r.item) ans += `   ${r.item.substring(0, 60)}\n`;
    });
    return ans;
  }

  // ── Финансовый анализ ─────────────────────────────────────────────────────
  if (/финанс|анализ|прибыл|рентаб/.test(q)) {
    const profit = totalSum - costsTotal;
    const margin = totalSum > 0 ? (profit / totalSum * 100).toFixed(1) : 0;
    let ans = `📈 **Финансовый анализ:**\n\n`;
    ans += `• Выручка: **${fmtN(totalSum)}**\n`;
    ans += `• Затраты: **${fmtN(costsTotal)}**\n`;
    ans += `• Прибыль: **${fmtN(profit)}** (маржа ${margin}%)\n`;
    ans += `• Дебиторка: **${fmtN(debitorSum)}**\n`;
    ans += `• Оплачено: **${fmtN(paidSum)}** (${paid.length} дог.)\n`;
    return ans;
  }

  // ── Риски / проблемы ──────────────────────────────────────────────────────
  if (/риск|проблем|опасн|тревог/.test(q)) {
    const risks = [];
    if (unpaid.length > 0) risks.push(`⚠️ Неоплаченных договоров: ${unpaid.length} на сумму ${fmtN(debitorSum)}`);
    const overdue = all.filter(r => {
      if (!r.delivery_date && !r.deadline) return false;
      const d = new Date(r.delivery_date || r.deadline);
      return d < new Date() && r.payment_status !== 'paid';
    });
    if (overdue.length) risks.push(`🔴 Просроченных: ${overdue.length} договоров`);
    if (costsTotal > totalSum * 0.8) risks.push(`📉 Высокие затраты: ${fmtN(costsTotal)} (${(costsTotal/totalSum*100).toFixed(0)}% от выручки)`);
    if (!risks.length) return '✅ Критических рисков не обнаружено. Показатели в норме.';
    return `🚨 **Обнаруженные риски:**\n\n` + risks.join('\n');
  }

  // ── Статус / этапы ────────────────────────────────────────────────────────
  if (/статус|этап|выполн|ход/.test(q)) {
    const byStatus = {};
    all.forEach(r => {
      const s = r.payment_status === 'paid' ? 'Оплачен' : 'Не оплачен';
      byStatus[s] = (byStatus[s] || 0) + 1;
    });
    let ans = `📋 **Статус договоров:**\n\n`;
    Object.entries(byStatus).forEach(([k, v]) => { ans += `• ${k}: **${v}** дог.\n`; });
    return ans;
  }

  // ── Оплачен(ные) договора ─────────────────────────────────────────────────
  if (/оплачен/.test(q)) {
    if (!paid.length) return '❌ Оплаченных договоров пока нет.';
    let ans = `✅ **Оплаченные договора (${paid.length}):**\n\n`;
    paid.slice(0, 10).forEach(r => {
      ans += `• ${r.org || r.firm || 'Б/н'} — ${fmtN(r.total)}\n`;
    });
    if (paid.length > 10) ans += `\n...и ещё ${paid.length - 10} договоров`;
    return ans;
  }

  // ── Общий ответ ───────────────────────────────────────────────────────────
  return `🤖 Я — ИИ-ассистент КазДемеу. Могу помочь с:\n
• **"Итоги"** — общая сумма и статистика
• **"Неоплаченные"** — дебиторская задолженность
• **"Топ договоров"** — самые крупные
• **"Финансовый анализ"** — прибыль и затраты
• **"Риски"** — проблемные договора
• **"Статус"** — ход выполнения\n
Задайте любой из этих вопросов.`;
}

// ── Отправка сообщения ────────────────────────────────────────────────────────
async function grokSend() {
  const inp = document.getElementById('grokInput');
  const msg = (inp?.value || '').trim();
  if (!msg) return;
  inp.value = '';
  grokAsk(msg);
}

function grokAsk(msg) {
  const box = document.getElementById('grokMessages');
  if (!box) return;

  // User bubble
  box.innerHTML += `<div class="grok-msg user">${esc(msg)}</div>`;
  box.scrollTop = box.scrollHeight;

  // Thinking indicator
  const thinkId = 'gt_' + Date.now();
  box.innerHTML += `<div class="grok-msg ai" id="${thinkId}">⏳ Анализирую...</div>`;
  box.scrollTop = box.scrollHeight;

  // Analyze
  setTimeout(() => {
    const answer = aiAnalyze(msg);
    const el = document.getElementById(thinkId);
    if (el) el.innerHTML = answer.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
    box.scrollTop = box.scrollHeight;
  }, 300);
}
