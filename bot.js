const TelegramBot = require('node-telegram-bot-api');
const config = require('./config');
const { findOrCreateUser, db } = require('./database/db');
const { getTodayHabitsForUser } = require('./utils/notifications');
const { getUserStreaks } = require('./utils/gamification');
const { calculateStreak } = require('./utils/gamification');

let bot = null;

function getBot() {
  return bot;
}

function webAppKeyboard() {
  return {
    inline_keyboard: [
      [{ text: '📱 Открыть HABICHAT', web_app: { url: config.webappUrl } }],
    ],
  };
}

function initBot() {
  if (!config.botToken) return;

  const useWebhook =
    config.isVercel ||
    (config.nodeEnv === 'production' && config.webappUrl.startsWith('https'));
  bot = new TelegramBot(config.botToken, { polling: !useWebhook });

  if (useWebhook) {
    const webhookUrl = `${config.webappUrl.replace(/\/$/, '')}/webhook`;
    bot.setWebHook(webhookUrl).catch(console.error);
  }

  bot.onText(/\/start/, async (msg) => {
    findOrCreateUser(msg.from);
    await bot.sendMessage(
      msg.chat.id,
      `👋 Добро пожаловать в *HABICHAT*!\n\nОтслеживай привычки, соревнуйся с друзьями и участвуй в челленджах.`,
      { parse_mode: 'Markdown', reply_markup: webAppKeyboard() }
    );
  });

  bot.onText(/\/today/, async (msg) => {
    const user = findOrCreateUser(msg.from);
    const habits = getTodayHabitsForUser(user.id);
    if (!habits.length) {
      return bot.sendMessage(msg.chat.id, '✅ Все привычки на сегодня выполнены!', {
        reply_markup: webAppKeyboard(),
      });
    }
    const lines = habits.map((h, i) => `${i + 1}. ${h.icon} ${h.title}`).join('\n');
    const keyboard = {
      inline_keyboard: habits.slice(0, 8).map((h) => [
        { text: `✅ ${h.icon} ${h.title}`, callback_data: `complete_${h.id}` },
      ]),
    };
    keyboard.inline_keyboard.push([{ text: '📱 Mini App', web_app: { url: config.webappUrl } }]);
    await bot.sendMessage(msg.chat.id, `📋 *Сегодня:*\n\n${lines}`, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  });

  bot.onText(/\/streaks/, async (msg) => {
    const user = findOrCreateUser(msg.from);
    const streaks = getUserStreaks(user.id).filter((s) => s.streak > 0);
    if (!streaks.length) {
      return bot.sendMessage(msg.chat.id, 'Пока нет активных стриков. Начни сегодня! 🔥');
    }
    const text = streaks.map((s) => `${s.icon} ${s.title} — 🔥 ${s.streak} дн.`).join('\n');
    await bot.sendMessage(msg.chat.id, `🔥 *Твои стрики:*\n\n${text}`, {
      parse_mode: 'Markdown',
      reply_markup: webAppKeyboard(),
    });
  });

  bot.onText(/\/friends/, async (msg) => {
    await bot.sendMessage(
      msg.chat.id,
      'Управление друзьями — в Mini App → Лента → 👥',
      { reply_markup: webAppKeyboard() }
    );
  });

  bot.onText(/\/settings/, async (msg) => {
    const user = findOrCreateUser(msg.from);
    await bot.sendMessage(
      msg.chat.id,
      `⚙️ *Настройки*\nЧасовой пояс: ${user.timezone}\nНапоминания: ${user.notification_time}`,
      { parse_mode: 'Markdown', reply_markup: webAppKeyboard() }
    );
  });

  bot.onText(/\/challenge/, async (msg) => {
    await bot.sendMessage(msg.chat.id, '🏆 Челленджи — открой Mini App', {
      reply_markup: webAppKeyboard(),
    });
  });

  bot.on('callback_query', async (query) => {
    const data = query.data;
    if (data?.startsWith('complete_')) {
      const habitId = parseInt(data.replace('complete_', ''), 10);
      const user = findOrCreateUser(query.from);
      const habit = db
        .prepare('SELECT * FROM habits WHERE id = ? AND user_id = ?')
        .get(habitId, user.id);
      if (!habit) {
        return bot.answerCallbackQuery(query.id, { text: 'Привычка не найдена' });
      }
      const today = new Date().toISOString().slice(0, 10);
      try {
        db.prepare(
          `INSERT INTO habit_completions (habit_id, completed_at) VALUES (?, ?)`
        ).run(habitId, today);
        const streak = calculateStreak(habitId);
        await bot.answerCallbackQuery(query.id, { text: `✅ ${habit.title} — 🔥 ${streak} дн.` });
        await bot.editMessageReplyMarkup(
          { inline_keyboard: [[{ text: '✅ Выполнено', callback_data: 'done' }]] },
          { chat_id: query.message.chat.id, message_id: query.message.message_id }
        );
      } catch {
        await bot.answerCallbackQuery(query.id, { text: 'Уже отмечено сегодня' });
      }
    }
  });

  bot.on('inline_query', async (query) => {
    const user = findOrCreateUser(query.from);
    const q = (query.query || '').toLowerCase().trim();
    const results = [];

    if (q.startsWith('streak') || q === '') {
      const streaks = getUserStreaks(user.id).filter((s) => s.streak > 0).slice(0, 5);
      streaks.forEach((s, i) => {
        results.push({
          type: 'article',
          id: `streak_${i}`,
          title: `${s.icon} ${s.title}`,
          description: `🔥 ${s.streak} дней подряд`,
          input_message_content: {
            message_text: `🔥 *${s.title}* — ${s.streak} дней подряд!\n\n_Отслеживай привычки в @${config.botToken ? 'habichat' : 'habichat'}_`,
            parse_mode: 'Markdown',
          },
        });
      });
    }

    if (q.startsWith('habits')) {
      const streaks = getUserStreaks(user.id);
      results.push({
        type: 'article',
        id: 'habits_summary',
        title: 'Мой прогресс',
        description: `${streaks.length} активных привычек`,
        input_message_content: {
          message_text: `📊 *Мой прогресс HABICHAT*\n${streaks.map((s) => `${s.icon} ${s.title}: 🔥${s.streak}`).join('\n') || 'Начни первую привычку!'}`,
          parse_mode: 'Markdown',
        },
      });
    }

    await bot.answerInlineQuery(query.id, results.length ? results : [{
      type: 'article',
      id: 'help',
      title: 'HABICHAT',
      description: 'streak | habits | challenge',
      input_message_content: {
        message_text: 'Используй: @bot streak — поделиться стриком',
      },
    }], { cache_time: 10 });
  });

  if (!useWebhook) {
  scheduleReminders(bot);
  }
}

function scheduleReminders(botInstance) {
  setInterval(() => {
    const now = new Date();
    const timeStr = `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}`;
    const users = db
      .prepare(`SELECT * FROM users WHERE notification_time = ?`)
      .all(timeStr);

    users.forEach(async (user) => {
      const habits = getTodayHabitsForUser(user.id);
      if (!habits.length) return;
      try {
        await botInstance.sendMessage(
          user.telegram_id,
          `⏰ Напоминание!\n\n${habits.map((h) => `${h.icon} ${h.title}`).join('\n')}`,
          { reply_markup: webAppKeyboard() }
        );
      } catch {
        /* user blocked bot */
      }
    });
  }, 60 * 1000);
}

module.exports = { initBot, getBot };
