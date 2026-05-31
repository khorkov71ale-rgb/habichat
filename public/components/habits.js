import { api, showToast, invalidateScreen } from '../app.js';

let habits = [];
const ICONS = ['⭐', '💪', '📚', '🧘', '💧', '🏃', '😴', '🥗', '✍️', '🎯'];

export async function loadHabits() {
  const res = await api('/habits');
  habits = res.habits || [];
}

function openHabitModal(modal) {
  modal.classList.remove('hidden');
  document.body.classList.add('modal-open');
  requestAnimationFrame(() => {
    modal.querySelector('.modal-sheet')?.scrollTo(0, 0);
  });
}

function closeHabitModal(modal) {
  modal.classList.add('hidden');
  document.body.classList.remove('modal-open');
}

export function renderHabits() {
  const el = document.getElementById('habits');
  el.innerHTML = `
    <header class="screen-header">
      <h1>Мои привычки</h1>
      <button type="button" id="add-habit-btn" class="btn-add" aria-label="Добавить привычку">+</button>
    </header>
    <div class="habits-list">
      ${
        habits.length
          ? habits
              .map(
                (h) => `
        <div class="habit-card" data-id="${h.id}">
          <div class="habit-icon">${h.icon}</div>
          <div class="habit-info">
            <h3>${escape(h.title)}</h3>
            <span class="streak">🔥 ${h.streak} · ${freqLabel(h.frequency)}</span>
          </div>
          <button type="button" class="edit-habit" data-id="${h.id}" aria-label="Редактировать">✏️</button>
        </div>
      `
              )
              .join('')
          : '<p class="empty-state">Создай первую привычку</p>'
      }
    </div>
    <div id="habit-modal" class="modal hidden" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <button type="button" class="modal-backdrop" id="habit-modal-backdrop" aria-label="Закрыть"></button>
      <div class="modal-sheet">
        <div class="modal-handle" aria-hidden="true"></div>
        <h2 id="modal-title">Новая привычка</h2>
        <form id="habit-form" class="modal-form">
          <input type="hidden" name="id" id="habit-id">
          <div class="form-field">
            <label class="field-label" for="habit-title">Название</label>
            <input type="text" id="habit-title" name="title" class="field-input" placeholder="Например: Зарядка" required>
          </div>
          <div class="form-field">
            <label class="field-label" for="habit-description">Описание <span class="optional">(необязательно)</span></label>
            <textarea id="habit-description" name="description" class="field-input field-textarea" placeholder="Заметка для себя" rows="2"></textarea>
          </div>
          <div class="form-field">
            <span class="field-label" id="icon-label">Эмодзи</span>
            <div class="icon-picker" id="icon-picker" role="group" aria-labelledby="icon-label">
              ${ICONS.map((ic) => `<button type="button" class="icon-option" data-icon="${ic}" aria-label="${ic}">${ic}</button>`).join('')}
            </div>
            <input type="hidden" name="icon" id="habit-icon" value="⭐">
          </div>
          <div class="form-field">
            <label class="field-label" for="habit-frequency">Как часто?</label>
            <select id="habit-frequency" name="frequency" class="field-input field-select">
              <option value="daily">Каждый день</option>
              <option value="weekly">Несколько раз в неделю</option>
              <option value="custom">Выборочные дни</option>
            </select>
          </div>
          <label class="checkbox-row">
            <input type="checkbox" name="is_public" id="habit-public">
            <span class="checkbox-text">Показывать друзьям</span>
          </label>
          <div class="modal-actions">
            <button type="button" class="btn-cancel" id="cancel-habit">Отмена</button>
            <button type="submit" class="btn-submit">Сохранить</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const modal = el.querySelector('#habit-modal');
  let selectedIcon = '⭐';

  const syncIconSelection = () => {
    el.querySelectorAll('.icon-option').forEach((b) => {
      b.classList.toggle('selected', b.dataset.icon === selectedIcon);
    });
    const iconInput = el.querySelector('#habit-icon');
    if (iconInput) iconInput.value = selectedIcon;
  };

  el.querySelector('#add-habit-btn')?.addEventListener('click', () => {
    el.querySelector('#habit-form').reset();
    el.querySelector('#habit-id').value = '';
    el.querySelector('#modal-title').textContent = 'Новая привычка';
    selectedIcon = '⭐';
    syncIconSelection();
    openHabitModal(modal);
  });

  const close = () => closeHabitModal(modal);
  el.querySelector('#cancel-habit')?.addEventListener('click', close);
  el.querySelector('#habit-modal-backdrop')?.addEventListener('click', close);

  el.querySelectorAll('.icon-option').forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedIcon = btn.dataset.icon;
      syncIconSelection();
    });
  });

  el.querySelectorAll('.edit-habit').forEach((btn) => {
    btn.addEventListener('click', () => {
      const h = habits.find((x) => x.id == btn.dataset.id);
      if (!h) return;
      el.querySelector('#habit-id').value = h.id;
      el.querySelector('#habit-title').value = h.title;
      el.querySelector('[name=description]').value = h.description || '';
      el.querySelector('[name=frequency]').value = h.frequency;
      el.querySelector('#habit-public').checked = !!h.is_public;
      selectedIcon = h.icon;
      syncIconSelection();
      el.querySelector('#modal-title').textContent = 'Редактировать';
      openHabitModal(modal);
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
      closeHabitModal(modal);
      await loadHabits();
      invalidateScreen('dashboard');
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
