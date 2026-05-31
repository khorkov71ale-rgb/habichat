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
      <button type="button" id="friends-btn" title="Друзья">👥</button>
    </header>
    <div id="friends-panel" class="hidden">
      <h3 class="section-title">Друзья</h3>
      ${friends.map((f) => `
        <div class="friend-update">
          ${f.first_name || f.username} — ${f.status}
          ${f.status === 'pending' && f.friend_id ? `<button class="accept-friend" data-id="${f.id}">Принять</button>` : ''}
        </div>
      `).join('') || '<p class="empty-state">Нет друзей</p>'}
      <input type="text" id="invite-username" placeholder="@username">
      <button class="btn-primary" id="invite-btn" style="width:100%;margin-top:8px;padding:12px;border:none;border-radius:10px;">Пригласить</button>
    </div>
    <div class="feed">
      ${feed.length ? feed.map(renderActivity).join('') : '<p class="empty-state">Лента пуста. Добавь друзей!</p>'}
    </div>
  `;

  el.querySelector('#friends-btn')?.addEventListener('click', () => {
    el.querySelector('#friends-panel').classList.toggle('hidden');
  });

  el.querySelector('#invite-btn')?.addEventListener('click', async () => {
    const username = el.querySelector('#invite-username').value.trim();
    if (!username) return;
    try {
      await api('/social/friends/invite', {
        method: 'POST',
        body: JSON.stringify({ username }),
      });
      showToast('Приглашение отправлено');
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
          <button class="like-btn ${a.user_liked ? 'liked' : ''}" data-id="${a.id}">❤️ ${a.like_count || 0}</button>
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
