// === grok.js ===
// ===== GROK AI =====
// GROK_KEY перенесён в Cloudflare Worker (grok-proxy/worker.js)
// После деплоя воркера замените URL ниже на ваш workers.dev адрес
const GROK_PROXY_URL = 'https://api.x.ai/v1/chat/completions'; // <-- временно прямой, заменить на proxy URL
const GROK_KEY = 'xai-ZYQCQn0x8Nof5NOFw1H58tpcjAwgjOOns8rFiVhXbAbNSmoTo87V3z2V44nXTmNs4tJxscvRVXYR1Uq9'; // удалить после деплоя proxy
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
    'Опла' + 'чено: ' + paid.length + ' (' + fmtN(paidSum) + ')\n' +
    'Общая сумма договоров: ' + fmtN(tot) + '\n' +
    'Затраты по договорам: ' + fmtN(costsTotal) + '\n' +
    'Административные расходы: ' + fmtN(admTotal) + '\n' +
    'Договора: ' + contracts.slice(0, 20).map(r =>
      `${esc(r.org)}|${esc(r.item)}|${fmtN(r.total)}|${r.payment_status === 'paid' ? 'оплачен' : 'не оплачен'}`
    ).join('; ');
}

async function grokSend() {
  const inp = document.getElementById('grokInput');
  const msg = inp.value.trim();
  if (!msg) return;
  inp.value = '';
  await grokAsk(msg);
}

async function grokAsk(msg) {
  const msgs = document.getElementById('grokMessages');
  const btn = document.getElementById('grokSendBtn');
  
  // Add user message
  msgs.innerHTML += `<div class="grok-msg user">${msg}</div>`;
  msgs.scrollTop = msgs.scrollHeight;
  
  btn.disabled = true;
  btn.textContent = '...';
  
  grokHistory.push({ role: 'user', content: msg });
  
  const systemPrompt = `Ты AI-ассистент системы КазДемеу — управление договорами. Отвечай кратко и по делу на русском языке.\n\n${getDataContext()}`;
  
  try {
    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROK_KEY}`
      },
      body: JSON.stringify({
        model: 'grok-3-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          ...grokHistory.slice(-10)
        ],
        max_tokens: 500
      })
    });
    
    if (!res.ok) throw new Error('API error: ' + res.status);
    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content || 'Нет ответа';
    
    grokHistory.push({ role: 'assistant', content: reply });
    msgs.innerHTML += `<div class="grok-msg ai">${reply.replace(/\n/g, '<br>')}</div>`;
    msgs.scrollTop = msgs.scrollHeight;
  } catch(e) {
    msgs.innerHTML += `<div class="grok-msg ai" style="color:#ff4757">Ошибка: ${e.message}</div>`;
    msgs.scrollTop = msgs.scrollHeight;
  }
  
  btn.disabled = false;
  btn.textContent = 'Отправить';
}
