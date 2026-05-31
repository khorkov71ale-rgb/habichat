import { api, showToast } from '../app.js';

let streaks = [];
let calendar = { year: new Date().getFullYear(), month: new Date().getMonth() + 1, days: [] };
let stats = {};

export async function loadProgress() {
  const y = calendar.year;
  const m = calendar.month;
  const [streakRes, calRes, statsRes] = await Promise.all([
    api('/analytics/streaks'),
    api(`/analytics/calendar?year=${y}&month=${m}`),
    api('/analytics/stats'),
  ]);
  streaks = streakRes.streaks || [];
  calendar = { ...calendar, ...calRes, days: calRes.days || [] };
  stats = statsRes;
}

export function renderProgress() {
  const el = document.getElementById('progress');
  const monthNames = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];

  el.innerHTML = `
    <header class="screen-header">
      <h1>Прогресс</h1>
      <button type="button" id="export-btn" title="Экспорт">📊</button>
    </header>
    <div class="stats-overview">
      <div class="quick-stats">
        <div class="stat-card">
          <span class="stat-number">${stats.totalCompletions || 0}</span>
          <span class="stat-label">Выполнений</span>
        </div>
        <div class="stat-card">
          <span class="stat-number">${stats.bestStreak || 0}</span>
          <span class="stat-label">Лучший стрик</span>
        </div>
      </div>
      <div class="streak-card">
        <h3 class="section-title">Лучшие стрики</h3>
        <div class="streak-list">
          ${streaks.slice(0, 5).map((s) => `
            <div class="habit-card">
              <div class="habit-icon">${s.icon}</div>
              <div class="habit-info">
                <h3>${escape(s.title)}</h3>
                <span class="streak">🔥 ${s.streak} дн.</span>
              </div>
            </div>
          `).join('') || '<p class="empty-state">Нет данных</p>'}
        </div>
      </div>
      <div class="calendar-view">
        <h3 class="section-title">Календарь</h3>
        <div class="month-picker">
          <button type="button" id="prev-month">←</button>
          <span id="current-month">${monthNames[calendar.month - 1]} ${calendar.year}</span>
          <button type="button" id="next-month">→</button>
        </div>
        <div class="calendar-grid">${renderCalendarGrid()}</div>
      </div>
    </div>
  `;

  const dayMap = {};
  (calendar.days || []).forEach((d) => {
    dayMap[d.completed_at] = d.count;
  });

  el.querySelector('#prev-month')?.addEventListener('click', async () => {
    calendar.month--;
    if (calendar.month < 1) { calendar.month = 12; calendar.year--; }
    await loadProgress();
    renderProgress();
  });

  el.querySelector('#next-month')?.addEventListener('click', async () => {
    calendar.month++;
    if (calendar.month > 12) { calendar.month = 1; calendar.year++; }
    await loadProgress();
    renderProgress();
  });

  el.querySelector('#export-btn')?.addEventListener('click', async () => {
    try {
      const data = await api('/analytics/export');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'habichat-export.json';
      a.click();
      showToast('Экспорт готов');
    } catch (e) {
      showToast(e.message);
    }
  });
}

function renderCalendarGrid() {
  const y = calendar.year;
  const m = calendar.month;
  const first = new Date(y, m - 1, 1);
  const daysInMonth = new Date(y, m, 0).getDate();
  const startDay = (first.getDay() + 6) % 7;
  const dayMap = {};
  (calendar.days || []).forEach((d) => { dayMap[d.completed_at] = d.count; });

  let html = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map((d) => `<div class="calendar-day header">${d}</div>`).join('');
  for (let i = 0; i < startDay; i++) html += '<div class="calendar-day"></div>';
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const has = dayMap[key];
    html += `<div class="calendar-day ${has ? 'has-completion' : ''}">${d}</div>`;
  }
  return html;
}

function escape(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}
