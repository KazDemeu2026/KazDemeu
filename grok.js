// ===== GROK AI =====
const GROK_KEY = 'xai-ZYQCQn0x8Nof5NOFw1H58tpcjAwgjOOns8rFiVhXbAbNSmoTo87V3z2V44nXTmNs4tJxscvRVXYR1Uq9';
let grokHistory = [];

function toggleGrok() {
  document.getElementById('grokPanel').classList.toggle('open');
}

function getDataContext() {
  const paid = contracts.filter(r => r.payment_status === 'paid');
  const tot = contracts.reduce((s, r) => s + Number(r.total || 0), 0);
  const paidSum = paid.reduce((s, r) => s + Number(r.total || 0), 0);
  const costsTotal = contracts.reduce((s, r) => s + getCosts(r.id).reduce((ss, c) => ss + Number(c.amount), 0), 0);
  const admTotal = expenseCategories.reduce((s, cat) =>
    s + (expenseRecords[cat.id] || []).reduce((ss, r) => ss + Number(r.amount), 0), 0);

  return 'Данные КазДемеу:\n' +
    'Договоров: ' + contracts.length + '\n' +
    'Оплачено: ' + paid.length + ' на ' + fmtN(paidSum) + '\n' +
    'Не оплачено: ' + (contracts.length - paid.length) + ' на ' + fmtN(tot - paidSum) + '\n' +
    'Общая сумма: ' + fmtN(tot) + '\n' +
    'Затраты: ' + fmtN(costsTotal) + '\n' +
    'Прибыль: ' + fmtN(paidSum - costsTotal) + '\n' +
    'Адм. расходы: ' + fmtN(admTotal) + '\n\n' +
    'Договора (первые 15):\n' +
    contracts.slice(0, 15).map(r =>
      '- ' + (r.code || '—') + ': ' + r.org + ', ' + (r.item || '—') + ', ' +
      r.qty + ' шт, ' + fmtN(r.total) + ', ' +
      (r.payment_status === 'paid' ? 'ОПЛАЧЕНО' : 'НЕ ОПЛАЧЕНО')
    ).join('\n');
}

async function grokSend() {
  const inp = document.getElementById('grokInput');
  const msg = (inp.value || '').trim();
  if (!msg) return;
  inp.value = '';
  await grokAsk(msg);
}

async function grokAsk(question) {
  const msgs = document.getElementById('grokMessages');
  const btn = document.getElementById('grokSendBtn');

  // Add user message
  const uDiv = document.createElement('div');
  uDiv.className = 'grok-msg user';
  uDiv.textContent = question;
  msgs.appendChild(uDiv);

  // Loading
  const lDiv = document.createElement('div');
  lDiv.className = 'grok-msg ai';
  lDiv.id = 'grokLoading';
  lDiv.innerHTML = '<span style="color:#9ca3af;font-style:italic">⏳ Думаю...</span>';
  msgs.appendChild(lDiv);
  msgs.scrollTop = msgs.scrollHeight;
  btn.disabled = true;

  grokHistory.push({ role: 'user', content: question });

  try {
    const systemPrompt = 'Ты AI-ассистент системы КазДемеу. Отвечай кратко на русском языке.\n\n' + getDataContext();

    const resp = await fetch('https://corsproxy.io/?url=https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + GROK_KEY
      },
      body: JSON.stringify({
        model: 'grok-3-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          ...grokHistory.slice(-10)
        ],
        max_tokens: 1200,
        temperature: 0.7
      })
    });

    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const data = await resp.json();
    const answer = data.choices?.[0]?.message?.content || 'Нет ответа';
    grokHistory.push({ role: 'assistant', content: answer });

    const formatted = answer
      .split('\n').join('<br>')
      .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
      .replace(/\*(.*?)\*/g, '<i>$1</i>');

    lDiv.innerHTML = formatted;
  } catch(e) {
    lDiv.innerHTML = '<span style="color:#dc2626">❌ Ошибка: ' + e.message + '</span>';
  }

  msgs.scrollTop = msgs.scrollHeight;
  btn.disabled = false;
}
