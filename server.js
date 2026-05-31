const config = require('./config');
const { createApp } = require('./express-app');
const { ensureDb } = require('./database/db');

async function start() {
  await ensureDb();
  const app = createApp();

  app.listen(config.port, () => {
    console.log(`HABICHAT running on http://localhost:${config.port}`);
    if (!config.botToken) {
      console.warn('BOT_TOKEN not set — bot and auth validation disabled in dev');
    }
  });
}

start().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
