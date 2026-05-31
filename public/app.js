import { renderDashboard, loadDashboard } from './components/dashboard.js';
import { renderHabits, loadHabits } from './components/habits.js';
import { renderSocial, loadSocial } from './components/social.js';
import { renderChallenges, loadChallenges } from './components/challenges.js';
import { renderProgress, loadProgress } from './components/progress.js';
import { renderPremium, loadPremium } from './components/premium.js';

const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
  if (tg.themeParams) {
    const root = document.documentElement;
    Object.entries(tg.themeParams).forEach(([key, value]) => {
      if (value) root.style.setProperty(`--tg-theme-${key.replace(/_/g, '-')}`, value);
    });
  }
}

export function getInitData() {
  if (tg?.initData) return tg.initData;
  const params = new URLSearchParams(location.search);
  return params.get('initData') || '';
}

export async function api(path, options = {}) {
  const initData = getInitData();
  const headers = {
    'Content-Type': 'application/json',
    ...(initData ? { 'X-Telegram-Init-Data': initData } : {}),
    ...options.headers,
  };
  const res = await fetch(`/api${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

export function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 2500);
}

export function setLoading(on) {
  document.getElementById('loading').classList.toggle('hidden', !on);
}

const screens = {
  dashboard: { el: 'dashboard', render: renderDashboard, load: loadDashboard },
  habits: { el: 'habits', render: renderHabits, load: loadHabits },
  social: { el: 'social', render: renderSocial, load: loadSocial },
  challenges: { el: 'challenges', render: renderChallenges, load: loadChallenges },
  progress: { el: 'progress', render: renderProgress, load: loadProgress },
  premium: { el: 'premium', render: renderPremium, load: loadPremium },
};

const screenCache = new Set();
let currentScreen = 'dashboard';
let navToken = 0;
let firstLoad = true;

const SKELETONS = {
  dashboard: `
    <header class="screen-header"><h1>Сегодня</h1></header>
    <div class="skeleton skeleton-card"></div>
    <div class="skeleton skeleton-card"></div>
  `,
  habits: `
    <header class="screen-header"><h1>Мои привычки</h1><span class="header-placeholder"></span></header>
    <div class="skeleton skeleton-card"></div>
    <div class="skeleton skeleton-card"></div>
  `,
  social: `
    <header class="screen-header"><h1>Лента</h1></header>
    <div class="skeleton skeleton-card"></div>
  `,
  challenges: `
    <header class="screen-header"><h1>Челленджи</h1></header>
    <div class="skeleton skeleton-card"></div>
  `,
  progress: `
    <header class="screen-header"><h1>Прогресс</h1></header>
    <div class="skeleton skeleton-card"></div>
  `,
  premium: `
    <header class="screen-header"><h1>Premium</h1></header>
    <div class="skeleton skeleton-card"></div>
  `,
};

function showSkeleton(name) {
  const el = document.getElementById(name);
  if (!el) return;
  el.innerHTML = SKELETONS[name] || '<div class="screen-inline-loader"></div>';
}

function switchScreen(name) {
  document.querySelectorAll('.screen').forEach((s) => {
    const isActive = s.id === name;
    s.classList.toggle('active', isActive);
    s.setAttribute('aria-hidden', isActive ? 'false' : 'true');
  });
  document.querySelectorAll('.nav-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.screen === name);
  });
}

async function navigate(name) {
  if (!screens[name] || name === currentScreen) return;

  const token = ++navToken;
  currentScreen = name;

  switchScreen(name);

  const cached = screenCache.has(name);
  if (cached) {
    screens[name].render();
  } else {
    showSkeleton(name);
  }

  if (tg?.HapticFeedback) tg.HapticFeedback.selectionChanged();

  try {
    if (firstLoad) setLoading(true);
    await screens[name].load();
    if (token !== navToken) return;

    screenCache.add(name);
    screens[name].render();
  } catch (e) {
    if (token !== navToken) return;
    showToast(e.message || 'Ошибка загрузки');
    if (!cached) {
      showSkeleton(name);
      const el = document.getElementById(name);
      if (el) {
        el.insertAdjacentHTML(
          'beforeend',
          '<p class="empty-state">Не удалось загрузить. Попробуйте ещё раз.</p>'
        );
      }
    } else if (screenCache.has(name)) {
      screens[name].render();
    }
  } finally {
    if (firstLoad) {
      setLoading(false);
      firstLoad = false;
    }
  }
}

/** Сбросить кэш экрана после изменения данных */
export function invalidateScreen(name) {
  screenCache.delete(name);
  if (name === 'dashboard') {
    screenCache.delete('habits');
  }
}

document.querySelectorAll('.nav-btn').forEach((btn) => {
  btn.addEventListener('click', () => navigate(btn.dataset.screen));
});

navigate('dashboard');

export { navigate, tg };
