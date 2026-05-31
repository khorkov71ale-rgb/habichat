import { api, showToast } from '../app.js';

let feed = [];
let friends = [];

export async function loadSocial() {
  const [feedRes, friendsRes] = await Promise.all([
    api('/social/feed'),
    api('/social/friends'),
  ]);
  feed = feedRes.feed || [];
  friends = friendsRes.friends || [];
}

export function renderSocial() {
  const el = document.getElementById('social');
  el.innerHTML = `
    <header class="screen-header">
      <h1>Лента</h1>
      <button type="button" id="friends-btn" class="header-icon-btn" title="Друзья">👥</button>
    </header>
    <div id="friends-panel" class="friends-panel hidden">
      <h3 class="section-title">Друзья</h3>
      <div class="friends-list">
        ${
          friends.length
            ? friends
                .map(
                  (f) => `
          <div class="friend-card">
            <span class="friend-name">${escape(f.first_name || f.username || 'Пользователь')}</span>
            <span class="friend-status">${statusLabel(f.status)}</span>
            ${
              f.status === 'pending'
                ? `<button type="button" class="btn-secondary btn-sm accept-friend" data-id="${f.id}">Принять</button>`
                : ''
            }
          </div>
        `
                )
                .join('')
            : '<p class="empty-state">Пока нет друзей</p>'
        }
      </div>
      <div class="invite-block">
        <label class="field-label" for="invite-username">Пригласить друга</label>
        <div class="input-with-prefix">
          <span class="input-prefix" aria-hidden="true">@</span>
          <input
            type="text"
            id="invite-username"
            class="input-app"
            placeholder="username"
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
          />
        </div>
        <p class="field-hint">Пользователь должен хотя бы раз открыть бота</p>
        <button type="button" class="btn-primary btn-block" id="invite-btn">Отправить приглашение</button>
      </div>
    </div>
    <div class="feed">
      ${feed.length ? feed.map(renderActivity).join('') : '<p class="empty-state">Лента пуста. Добавь друзей!</p>'}
    </div>
  `;

  el.querySelector('#friends-btn')?.addEventListener('click', () => {
    el.querySelector('#friends-panel').classList.toggle('hidden');
  });

  const usernameInput = el.querySelector('#invite-username');
  el.querySelector('#invite-btn')?.addEventListener('click', async () => {
    const username = usernameInput?.value.trim().replace(/^@/, '');
    if (!username) {
      showToast('Введите username');
      usernameInput?.focus();
      return;
    }
    try {
      await api('/social/friends/invite', {
        method: 'POST',
        body: JSON.stringify({ username }),
      });
      showToast('Приглашение отправлено');
      if (usernameInput) usernameInput.value = '';
      await loadSocial();
      renderSocial();
    } catch (e) {
      showToast(e.message);
    }
  });

  el.querySelectorAll('.accept-friend').forEach((btn) => {
    btn.addEventListener('click', async () => {
      try {
        await api(`/social/friends/${btn.dataset.id}/accept`, { method: 'POST' });
        await loadSocial();
        renderSocial();
      } catch (e) {
        showToast(e.message);
      }
    });
  });

  el.querySelectorAll('.like-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      try {
        const res = await api(`/social/feed/${btn.dataset.id}/like`, { method: 'POST' });
        btn.classList.toggle('liked', res.liked !== false);
        await loadSocial();
        renderSocial();
      } catch (e) {
        showToast(e.message);
      }
    });
  });
}

function statusLabel(status) {
  return { pending: 'ожидает', accepted: 'друг', blocked: 'заблокирован' }[status] || status;
}

function renderActivity(a) {
  const data = a.data || {};
  const text = data.title
    ? `${data.icon || ''} ${data.title}${data.streak ? ` — ${data.streak} дней!` : ''}`
    : a.activity_type;
  const time = formatTime(a.created_at);
  return `
    <div class="activity-card">
      <div class="user-info">
        <span class="user-name">${escape(a.first_name || a.username || 'User')}</span>
        <span class="activity-time">${time}</span>
      </div>
      <div class="activity-content">
        <span class="activity-text">${escape(text)}</span>
        <div class="activity-stats">
          <button type="button" class="like-btn ${a.user_liked ? 'liked' : ''}" data-id="${a.id}">❤️ ${a.like_count || 0}</button>
        </div>
      </div>
    </div>
  `;
}

function formatTime(iso) {
  const d = new Date(iso);
  const diff = (Date.now() - d) / 3600000;
  if (diff < 1) return 'только что';
  if (diff < 24) return `${Math.floor(diff)} ч. назад`;
  return d.toLocaleDateString('ru');
}

function escape(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}
