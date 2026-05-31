# HABICHAT

Telegram habit tracker: bot + Mini App with social features, challenges, and Premium (Stars).

## Stack

- **Backend:** Node.js, Express, better-sqlite3, node-telegram-bot-api
- **Frontend:** Vanilla HTML/CSS/JS + Telegram WebApp API
- **Database:** SQLite

## Quick start

```bash
cd habichat
cp .env.example .env
# Set BOT_TOKEN from @BotFather
npm install
npm start
```

Open http://localhost:3000 in browser (dev mode works without `initData` when `BOT_TOKEN` is empty).

## Bot setup

1. Create bot via [@BotFather](https://t.me/BotFather)
2. Set `BOT_TOKEN` in `.env`
3. Menu Button / Web App URL → your `WEBAPP_URL`
4. Enable inline mode: `/setinline`

### Commands

- `/start` — welcome + Mini App button
- `/today` — today's habits + quick check-in
- `/streaks` — current streaks
- `/challenge` — challenges
- `/friends` — friends
- `/settings` — notification settings

### Inline

- `@yourbot streak` — share streak
- `@yourbot habits` — share progress

## API (12+ endpoints)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/dashboard` | Today + stats + friends |
| GET/POST | `/api/habits` | List / create |
| PUT/DELETE | `/api/habits/:id` | Update / archive |
| POST/DELETE | `/api/habits/:id/complete` | Check-in / undo |
| GET | `/api/social/friends` | Friends list |
| POST | `/api/social/friends/invite` | Invite friend |
| POST | `/api/social/friends/:id/accept` | Accept request |
| GET | `/api/social/feed` | Activity feed |
| POST | `/api/social/feed/:id/like` | Like activity |
| GET/POST | `/api/challenges` | List / create |
| POST | `/api/challenges/:id/join` | Join challenge |
| GET | `/api/challenges/:id/leaderboard` | Leaderboard |
| GET | `/api/analytics/stats` | Statistics |
| GET | `/api/analytics/streaks` | Streaks |
| GET | `/api/analytics/calendar` | Calendar |
| GET | `/api/analytics/export` | Export (Premium) |
| GET | `/api/premium/features` | Premium features |
| POST | `/api/premium/purchase` | Activate Premium |

## Production

- Set `NODE_ENV=production`, `WEBAPP_URL=https://yourdomain.com`
- Webhook: `POST /webhook`
- Use PM2 + Nginx (see spec)
- HTTPS required for Telegram Mini App

## Project structure

```
habichat/
├── server.js
├── bot.js
├── config.js
├── database/
├── middleware/
├── routes/
├── public/
└── utils/
```
