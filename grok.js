const GROK_PROXY_URL = 'https://your-grok-proxy.workers.dev';
let grokHistory = [];

function toggleGrok() {
  const panel = document.getElementById('grokPanel');
  if (!panel) return;
  panel.classList.toggle('open');
}

function getDataContext() {
  const contractsList = window.contracts || [];
  const totalAmount = contractsList.reduce((sum, item) => sum + Number(item.total || 0), 0);
  const paidCount = contractsList.filter(item => item.payment_status === 'paid').length;
  const unpaidCount = contractsList.length - paidCount;
  return `Общая статистика договоров:
  Договоров: ${contractsList.length}
  Оплачено: ${paidCount}
  Не оплачено: ${unpaidCount}
  Общая сумма: ${fmtN(totalAmount)}`;
}

async function grokSend() {
  const input = document.getElementById('grokInput');
  if (!input) return;
  const message = input.value.trim();
  if (!message) return;
  input.value = '';
  await grokAsk(message);
}

async function grokAsk(message) {
  const messages = document.getElementById('grokMessages');
  const button = document.getElementById('grokSendBtn');
  if (!messages || !button) return;

  messages.innerHTML += `<div class="grok-msg user">${esc(message)}</div>`;
  messages.scrollTop = messages.scrollHeight;
  button.disabled = true;
  button.textContent = '...';

  grokHistory.push({ role: 'user', content: message });
  const systemPrompt = `Ты AI-ассистент системы КазДемеу. Отвечай кратко на русском языке.\n\n${getDataContext()}`;

  try {
    const response = await fetch(GROK_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'grok-3-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          ...grokHistory.slice(-10)
        ],
        max_tokens: 500
      })
    });
    const json = await response.json();
    const reply = json.choices?.[0]?.message?.content || json.response || 'Нет ответа';
    grokHistory.push({ role: 'assistant', content: reply });
    messages.innerHTML += `<div class="grok-msg ai">${esc(reply).replace(/\n/g, '<br>')}</div>`;
    messages.scrollTop = messages.scrollHeight;
  } catch (error) {
    messages.innerHTML += `<div class="grok-msg ai" style="color:#ff4757">Ошибка: ${esc(error.message)}</div>`;
    messages.scrollTop = messages.scrollHeight;
  } finally {
    button.disabled = false;
    button.textContent = 'Отправить';
  }
}

window.toggleGrok = toggleGrok;
window.grokAsk = grokAsk;
window.grokSend = grokSend;
