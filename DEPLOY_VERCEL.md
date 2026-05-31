# Как выложить HABICHAT на Vercel (пошагово для новичков)

## Что вы получите в итоге

Публичная ссылка вида: `https://habichat-xxxx.vercel.app`  
Её можно открыть в браузере и указать в Telegram как адрес Mini App.

---

## Часть 1. Подготовка (5–10 минут)

### Шаг 1. Аккаунт на GitHub

1. Откройте [https://github.com](https://github.com)
2. Нажмите **Sign up** и зарегистрируйтесь (бесплатно)

GitHub — это «облако для кода». Vercel подключается к нему и автоматически публикует сайт при каждом обновлении.

### Шаг 2. Аккаунт на Vercel

1. Откройте [https://vercel.com](https://vercel.com)
2. Нажмите **Sign Up**
3. Выберите **Continue with GitHub** — так проще всего связать аккаунты

### Шаг 3. Токен Telegram-бота

1. В Telegram откройте [@BotFather](https://t.me/BotFather)
2. Отправьте `/newbot` (или используйте существующего бота)
3. Скопируйте **токен** вида `123456789:ABCdef...` — он понадобится позже

---

## Часть 2. Загрузить код на GitHub

### Шаг 4. Создать репозиторий на GitHub

1. На GitHub нажмите **+** → **New repository**
2. Имя, например: `habichat`
3. Выберите **Private** или **Public**
4. **Не** ставьте галочки README / .gitignore (код уже есть локально)
5. Нажмите **Create repository**

### Шаг 5. Загрузить папку `habichat` с компьютера

Откройте **PowerShell** или **Терминал** в Cursor и выполните (подставьте свой логин GitHub):

```powershell
cd "c:\Users\khork\OneDrive\Рабочий стол\cursor\habichat"

git init
git add .
git commit -m "Initial HABICHAT for Vercel"

git branch -M main
git remote add origin https://github.com/ВАШ_ЛОГИН/habichat.git
git push -u origin main
```

При первом `git push` браузер попросит войти в GitHub.

> Если `git` не найден: установите [Git for Windows](https://git-scm.com/download/win) и повторите команды.

---

## Часть 3. Деплой на Vercel

### Шаг 6. Импорт проекта

1. Зайдите на [https://vercel.com/new](https://vercel.com/new)
2. В списке репозиториев найдите **habichat** → **Import**
3. Настройки оставьте по умолчанию:
   - **Framework Preset:** Other
   - **Root Directory:** `./` (корень репозитория)
   - **Build Command:** можно оставить пустым или `npm run vercel-build`
   - **Output Directory:** не трогать

### Шаг 7. Переменные окружения (важно!)

Перед деплоем разверните блок **Environment Variables** и добавьте:

| Имя | Значение | Зачем |
|-----|----------|--------|
| `BOT_TOKEN` | токен от BotFather | бот и проверка Mini App |
| `NODE_ENV` | `production` | продакшен-режим |
| `WEBAPP_URL` | пока оставьте пустым | заполните после 1-го деплоя |

Нажмите **Deploy** и подождите 1–3 минуты.

### Шаг 8. Скопировать публичную ссылку

После успешного деплоя Vercel покажет:

**Congratulations!** → ссылка вида `https://habichat-xxx.vercel.app`

1. Откройте её в браузере — должен открыться интерфейс HABICHAT
2. Проверьте: `https://ваш-домен.vercel.app/health` → должно быть `{"ok":true,...}`

### Шаг 9. Обновить `WEBAPP_URL`

1. Vercel → ваш проект → **Settings** → **Environment Variables**
2. Добавьте или измените:
   - **Name:** `WEBAPP_URL`
   - **Value:** `https://habichat-xxx.vercel.app` (ваша ссылка **без** слэша в конце)
3. **Deployments** → у последнего деплоя **⋯** → **Redeploy** (чтобы бот подхватил URL)

---

## Часть 4. Подключить Telegram

### Шаг 10. Mini App в BotFather

1. [@BotFather](https://t.me/BotFather) → `/mybots` → ваш бот
2. **Bot Settings** → **Menu Button** → **Configure menu button**
3. URL: `https://ваш-домен.vercel.app`
4. Текст кнопки, например: `Открыть HABICHAT`

Или: **/setmenubutton** и укажите тот же URL.

### Шаг 11. Webhook для бота (команды в чате)

На Vercel бот работает через **webhook**, не через постоянный процесс.

После деплоя с `BOT_TOKEN` и `WEBAPP_URL` бот сам вызовет `setWebHook` на адрес:

`https://ваш-домен.vercel.app/webhook`

Проверка: напишите боту `/start` — должен ответить с кнопкой Mini App.

### Шаг 12. Inline-режим (по желанию)

В BotFather: `/setinline` → выберите бота → короткое имя, например `habichat`

---

## Часть 5. Альтернатива без GitHub (CLI)

Если не хотите GitHub:

```powershell
npm i -g vercel
cd "c:\Users\khork\OneDrive\Рабочий стол\cursor\habichat"
vercel login
vercel
```

Следуйте вопросам в терминале. Переменные добавьте в [Vercel Dashboard](https://vercel.com/dashboard) → проект → Settings → Environment Variables.

---

## Важно: структура для Express на Vercel (2024+)

Vercel сам находит Express, если в **корне** есть `index.js`, который:
- импортирует `express`
- экспортирует приложение: `module.exports = app`

Папка `api/index.js` **не нужна** (и может ломать деплой). Статика — из папки `public/`.

---

## Ограничения на Vercel (прочитайте один раз)

| Что | На Vercel |
|-----|-----------|
| Mini App + API | ✅ Работает |
| Команды бота `/start`, `/today` | ✅ Через webhook |
| База SQLite | ⚠️ Хранится во временной папке `/tmp` — **данные могут сбрасываться** при перезапуске сервера |
| Напоминания по расписанию | ❌ Нет постоянного процесса; для продакшена нужен VPS или Cron + внешняя БД |

Для серьёзного продакшена позже лучше: **VPS + PM2** (как в README) или облачная БД (Turso, Neon).

---

## Частые ошибки

**401 / Missing Telegram init data** — открыли сайт просто в Chrome, не из Telegram. Для полного API нужен Mini App внутри Telegram.

**Бот не отвечает** — проверьте `BOT_TOKEN`, сделайте Redeploy после установки `WEBAPP_URL`.

**Ошибка 500** — чаще всего старая версия Node. В Vercel: **Settings → General → Node.js Version → 22.x**, затем **Redeploy**. Обновите код на GitHub (исправление базы данных) и задеплойте снова.

**Ошибка сборки better-sqlite3** — на Vercel используется встроенный `node:sqlite` (нужен **Node.js 22**).

---

## Краткая шпаргалка

1. GitHub → залить код  
2. Vercel → Import → Deploy  
3. `BOT_TOKEN` + `WEBAPP_URL` → Redeploy  
4. BotFather → Menu Button URL = ваша ссылка Vercel  
5. Проверить `/start` и кнопку Mini App  

Готово — приложение доступно по публичной ссылке Vercel.
