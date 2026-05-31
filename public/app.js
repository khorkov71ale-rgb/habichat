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

let currentScreen = 'dashboard';

async function navigate(name) {
  if (!screens[name]) return;
  currentScreen = name;
  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
  document.getElementById(name).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.screen === name);
  });
  screens[name].render();
  try {
    setLoading(true);
    await screens[name].load();
    screens[name].render();
  } catch (e) {
    showToast(e.message || 'Ошибка загрузки');
  } finally {
    setLoading(false);
  }
  if (tg?.HapticFeedback) tg.HapticFeedback.selectionChanged();
}

document.querySelectorAll('.nav-btn').forEach((btn) => {
  btn.addEventListener('click', () => navigate(btn.dataset.screen));
});

Object.values(screens).forEach((s) => s.render());
navigate('dashboard');

export { navigate, tg };
