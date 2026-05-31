import { api, showToast } from '../app.js';

let challenges = [];
let tab = 'available';

export async function loadChallenges() {
  const res = await api(`/challenges?tab=${tab}`);
  challenges = res.challenges || [];
}

export function renderChallenges() {
  const el = document.getElementById('challenges');
  el.innerHTML = `
    <header class="screen-header">
      <h1>Челленджи</h1>
      <button type="button" id="create-challenge-btn">+</button>
    </header>
    <div class="challenge-tabs">
      <button class="tab-btn ${tab === 'available' ? 'active' : ''}" data-tab="available">Доступные</button>
      <button class="tab-btn ${tab === 'my' ? 'active' : ''}" data-tab="my">Мои</button>
    </div>
    <div class="challenges-list">
      ${challenges.length ? challenges.map(renderChallenge).join('') : '<p class="empty-state">Нет челленджей</p>'}
    </div>
    <div id="challenge-modal" class="modal hidden">
      <div class="modal-content">
        <h2>Новый челлендж</h2>
        <form id="challenge-form">
          <input name="title" placeholder="Название" required>
          <textarea name="description" placeholder="Описание" rows="2"></textarea>
          <input name="habit_title" placeholder="Привычка (название)" required>
          <input name="start_date" type="date" required>
          <input name="end_date" type="date" required>
          <div class="modal-actions">
            <button type="button" id="cancel-challenge">Отмена</button>
            <button type="submit">Создать</button>
          </div>
        </form>
      </div>
    </div>
  `;

  el.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      tab = btn.dataset.tab;
      await loadChallenges();
      renderChallenges();
    });
  });

  const modal = el.querySelector('#challenge-modal');
  el.querySelector('#create-challenge-btn')?.addEventListener('click', () => {
    const today = new Date().toISOString().slice(0, 10);
    const end = new Date();
    end.setDate(end.getDate() + 30);
    el.querySelector('[name=start_date]').value = today;
    el.querySelector('[name=end_date]').value = end.toISOString().slice(0, 10);
    modal.classList.remove('hidden');
  });
  el.querySelector('#cancel-challenge')?.addEventListener('click', () => modal.classList.add('hidden'));

  el.querySelector('#challenge-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await api('/challenges', {
        method: 'POST',
        body: JSON.stringify({
          title: fd.get('title'),
          description: fd.get('description'),
          start_date: fd.get('start_date'),
          end_date: fd.get('end_date'),
          habit_template: { title: fd.get('habit_title'), icon: '🏆' },
        }),
      });
      modal.classList.add('hidden');
      tab = 'my';
      await loadChallenges();
      renderChallenges();
      showToast('Челлендж создан');
    } catch (err) {
      showToast(err.message);
    }
  });

  el.querySelectorAll('.join-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      try {
        await api(`/challenges/${btn.dataset.id}/join`, { method: 'POST', body: '{}' });
        showToast('Вы в челлендже!');
        await loadChallenges();
        renderChallenges();
      } catch (e) {
        showToast(e.message);
      }
    });
  });
}

function renderChallenge(c) {
  const daysLeft = Math.max(0, Math.ceil((new Date(c.end_date) - new Date()) / 86400000));
  const joined = c.joined || tab === 'my';
  return `
    <div class="challenge-card">
      <h3>${escape(c.title)}</h3>
      <p>${escape(c.description || '')}</p>
      <div class="challenge-meta">
        <span>👥 ${c.participant_count || 0}</span>
        <span>⏰ ${daysLeft} дн.</span>
      </div>
      ${!joined ? `<button class="join-btn" data-id="${c.id}">Участвовать</button>` : '<span>✅ Участвуете</span>'}
    </div>
  `;
}

function escape(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}
