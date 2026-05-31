# Как залить ВЕСЬ проект на GitHub (чтобы Vercel работал)

Ошибка `Startup failed` / `Cannot find module` = на GitHub **не все файлы**.

## Способ 1 — Git в терминале Cursor (рекомендуется)

Откройте терминал (**Ctrl + `**) и выполните **по очереди**:

```powershell
cd "c:\Users\khork\OneDrive\Рабочий стол\cursor\habichat"
git init
git add .
git commit -m "Full habichat project"
git branch -M main
git remote add origin https://github.com/khorkov71ale-rgb/habichat.git
git push -u origin main
```

Замените URL на ваш репозиторий, если другой.

При `git push` войдите в GitHub в браузере.

**Не добавляйте** `node_modules` — в `.gitignore` уже есть.

---

## Способ 2 — ZIP на GitHub

1. Папка `habichat` на компьютере → правый клик → **Отправить** → **Сжатая ZIP-папка**.
2. Распакуйте ZIP локально и **удалите** папку `node_modules` из архива (если попала).
3. На GitHub откройте репозиторий **habichat**.
4. **Add file** → **Upload files** — перетащите **все** папки и файлы из `habichat`:

```
index.js
package.json
vercel.json
config.js
bot.js
server.js
express-app.js
database/     (вся папка)
routes/       (вся папка)
middleware/   (вся папка)
utils/        (вся папка)
public/       (вся папка)
```

5. **Commit changes**.

---

## Проверка на GitHub

В репозитории должны быть видны:

- `index.js`
- папка `public` с `index.html`
- папка `routes` (6 файлов)
- папка `database` с `db.js`

Если есть только 3–5 файлов в корне — Vercel **не заработает**.

---

## После загрузки

1. Vercel → **Deployments** — новый деплой **Ready**.
2. Откройте: `https://habichat.vercel.app/health`

Если деплой неполный, увидите список `missingFiles` — каких файлов не хватает.
