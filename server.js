const config = require('./config');
const { createApp } = require('./app');

const app = createApp();

app.listen(config.port, () => {
  console.log(`HABICHAT running on http://localhost:${config.port}`);
  if (!config.botToken) {
    console.warn('BOT_TOKEN not set — bot and auth validation disabled in dev');
  }
});
