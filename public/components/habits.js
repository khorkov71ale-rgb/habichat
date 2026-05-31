import { api, showToast } from '../app.js';

let habits = [];
const ICONS = ['⭐', '💪', '📚', '🧘', '💧', '🏃', '😴', '🥗', '✍️', '🎯'];

export async function loadHabits() {
  const res = await api('/habits');
  habits = res.habits || [];
}

export function renderHabits() {
  const el = document.getElementById('habits');
  el.innerHTML = `
    <header class="screen-header">
      <h1>Мои привычки</h1>
      <button type="button" id="add-habit-btn">+</button>
    </header>
    <div class="habits-list">
      ${habits.length ? habits.map((h) => `
        <div class="habit-card" data-id="${h.id}">
          <div class="habit-icon">${h.icon}</div>
          <div class="habit-info">
            <h3>${escape(h.title)}</h3>
            <span class="streak">🔥 ${h.streak} · ${freqLabel(h.frequency)}</span>
          </div>
          <button class="edit-habit" data-id="${h.id}">✏️</button>
        </div>
      `).join('') : '<p class="empty-state">Создай первую привычку</p>'}
    </div>
    <div id="habit-modal" class="modal hidden">
      <div class="modal-content">
        <h2 id="modal-title">Новая привычка</h2>
        <form id="habit-form">
          <input type="hidden" name="id" id="habit-id">
          <input type="text" name="title" placeholder="Название" required>
          <textarea name="description" placeholder="Описание (опционально)" rows="2"></textarea>
          <div class="icon-picker" id="icon-picker">
            ${ICONS.map((ic) => `<button type="button" class="icon-option" data-icon="${ic}">${ic}</button>`).join('')}
          </div>
          <input type="hidden" name="icon" id="habit-icon" value="⭐">
          <label>Как часто?</label>
          <select name="frequency">
            <option value="daily">Каждый день</option>
            <option value="weekly">Несколько раз в неделю</option>
            <option value="custom">Выборочные дни</option>
          </select>
          <label><input type="checkbox" name="is_public"> Показывать друзьям</label>
          <div class="modal-actions">
            <button type="button" id="cancel-habit">Отмена</button>
            <button type="submit">Сохранить</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const modal = el.querySelector('#habit-modal');
  let selectedIcon = '⭐';

  el.querySelector('#add-habit-btn')?.addEventListener('click', () => {
    el.querySelector('#habit-form').reset();
    el.querySelector('#habit-id').value = '';
    el.querySelector('#modal-title').textContent = 'Новая привычка';
    modal.classList.remove('hidden');
  });

  el.querySelector('#cancel-habit')?.addEventListener('click', () => modal.classList.add('hidden'));

  el.querySelectorAll('.icon-option').forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedIcon = btn.dataset.icon;
      el.querySelector('#habit-icon').value = selectedIcon;
      el.querySelectorAll('.icon-option').forEach((b) => b.classList.toggle('selected', b === btn));
      btn.classList.add('selected');
    });
  });

  el.querySelectorAll('.edit-habit').forEach((btn) => {
    btn.addEventListener('click', () => {
      const h = habits.find((x) => x.id == btn.dataset.id);
      if (!h) return;
      el.querySelector('#habit-id').value = h.id;
      el.querySelector('[name=title]').value = h.title;
      el.querySelector('[name=description]').value = h.description || '';
      el.querySelector('[name=frequency]').value = h.frequency;
      el.querySelector('[name=is_public]').checked = !!h.is_public;
      el.querySelector('#habit-icon').value = h.icon;
      selectedIcon = h.icon;
      el.querySelector('#modal-title').textContent = 'Редактировать';
      modal.classList.remove('hidden');
    });
  });

  el.querySelector('#habit-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = {
      title: fd.get('title'),
      description: fd.get('description'),
      icon: fd.get('icon') || selectedIcon,
      frequency: fd.get('frequency'),
      is_public: fd.get('is_public') === 'on',
    };
    const id = fd.get('id');
    try {
      if (id) {
        await api(`/habits/${id}`, { method: 'PUT', body: JSON.stringify(body) });
      } else {
        await api('/habits', { method: 'POST', body: JSON.stringify(body) });
      }
      modal.classList.add('hidden');
      await loadHabits();
      renderHabits();
      showToast('Сохранено');
    } catch (err) {
      showToast(err.message);
    }
  });
}

function freqLabel(f) {
  return { daily: 'ежедневно', weekly: 'еженедельно', custom: 'выборочно' }[f] || f;
}

function escape(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}
