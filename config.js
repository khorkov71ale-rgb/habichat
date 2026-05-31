require('dotenv').config();

function resolveWebappUrl() {
  if (process.env.WEBAPP_URL) return process.env.WEBAPP_URL.replace(/\/$/, '');
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

module.exports = {
  botToken: process.env.BOT_TOKEN || '',
  webappUrl: resolveWebappUrl(),
  isVercel: !!process.env.VERCEL,
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  starsProviderToken: process.env.STARS_PROVIDER_TOKEN || '',
  freeHabitLimit: 10,
  premiumStarsMonthly: 99,
};
