import { api, showToast } from '../app.js';

let data = { todayHabits: [], stats: {}, friendsToday: [] };

export async function loadDashboard() {
  data = await api('/dashboard');
}

export function renderDashboard() {
  const el = document.getElementById('dashboard');
  const habits = data.todayHabits || [];
  const stats = data.stats || {};
  const friends = data.friendsToday || [];

  el.innerHTML = `
    <header class="screen-header">
      <h1>Сегодня</h1>
      <button type="button" id="dash-refresh" title="Обновить">🔄</button>
    </header>
    <div class="today-habits">
      ${habits.length ? habits.map(renderHabitCard).join('') : '<p class="empty-state">Нет привычек на сегодня. Добавь в «Мои привычки».</p>'}
    </div>
    <div class="quick-stats">
      <div class="stat-card">
        <span class="stat-number">${stats.activeHabits || 0}</span>
        <span class="stat-label">Активных привычек</span>
      </div>
      <div class="stat-card">
        <span class="stat-number">${stats.bestStreak || 0}</span>
        <span class="stat-label">Лучший стрик</span>
      </div>
    </div>
    <div class="friends-activity">
      <h3>Друзья сегодня</h3>
      <div class="friend-updates">
        ${friends.length ? friends.map((f) => `
          <div class="friend-update">${f.first_name || f.username}: ${f.icon} ${f.title} ✅</div>
        `).join('') : '<p class="empty-state">Пока тихо</p>'}
      </div>
    </div>
  `;

  el.querySelector('#dash-refresh')?.addEventListener('click', async () => {
    await loadDashboard();
    renderDashboard();
  });

  el.querySelectorAll('.complete-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.habitId;
      const done = btn.classList.contains('done');
      try {
        if (done) {
          await api(`/habits/${id}/complete`, { method: 'DELETE' });
        } else {
          await api(`/habits/${id}/complete`, { method: 'POST', body: '{}' });
          showToast('Отлично! 🔥');
        }
        await loadDashboard();
        renderDashboard();
      } catch (e) {
        showToast(e.message);
      }
    });
  });
}

function renderHabitCard(h) {
  const done = h.completedToday;
  return `
    <div class="habit-card ${done ? 'done' : ''}" data-habit-id="${h.id}">
      <div class="habit-icon">${h.icon || '⭐'}</div>
      <div class="habit-info">
        <h3>${escapeHtml(h.title)}</h3>
        <span class="streak">🔥 ${h.streak || 0} дн.</span>
      </div>
      <button class="complete-btn ${done ? 'done' : ''}" data-habit-id="${h.id}">${done ? '✓' : '✅'}</button>
    </div>
  `;
}

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}
