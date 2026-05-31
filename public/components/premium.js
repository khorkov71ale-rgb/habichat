import { api, showToast, tg } from '../app.js';

let premiumData = {};

export async function loadPremium() {
  premiumData = await api('/premium/features');
}

export function renderPremium() {
  const el = document.getElementById('premium');
  const features = premiumData.features || [];
  const isPremium = premiumData.isPremium;

  el.innerHTML = `
    <header class="screen-header">
      <h1>Premium</h1>
      ${isPremium ? '<span>✅ Активен</span>' : ''}
    </header>
    <div class="premium-features">
      ${features.map((f) => `
        <div class="feature-card">
          <h3>${f.icon} ${f.title}</h3>
        </div>
      `).join('')}
    </div>
    <div class="pricing">
      <div class="price-card">
        <div class="price">⭐ ${premiumData.price || 99} Stars / месяц</div>
        ${!isPremium ? '<button type="button" id="buy-premium-btn" class="premium-btn">Приобрести Premium</button>' : `<p class="premium-until">Активен до: ${formatDate(premiumData.premiumUntil)}</p>`}
      </div>
    </div>
  `;

  el.querySelector('#buy-premium-btn')?.addEventListener('click', async () => {
    if (tg?.openInvoice) {
      showToast('Настройте Stars в BotFather');
      return;
    }
    try {
      const res = await api('/premium/purchase', {
        method: 'POST',
        body: JSON.stringify({ paymentId: 'demo_' + Date.now(), months: 1 }),
      });
      showToast('Premium активирован! 🎉');
      await loadPremium();
      renderPremium();
    } catch (e) {
      showToast(e.message);
    }
  });
}

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('ru');
}
