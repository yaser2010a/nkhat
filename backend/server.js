'use strict';

const createApp = require('./app');
const env = require('./config/env');
const { ping } = require('./config/db');
const { initDatabase, seedAdmin, seedCategories, seedSettings, cleanupExpired2FA } = require('./config/initDb');

async function start() {
  await initDatabase();
  await seedAdmin();
  await seedCategories();
  await seedSettings();
  await ping();

  const app = createApp();

  app.listen(env.port, () => {
    console.log(`[server] NKhat API listening on port ${env.port}`);
    console.log(`[server] Environment: ${env.nodeEnv}`);
  });

  setInterval(cleanupExpired2FA, 15 * 60 * 1000).unref();
}

start().catch((err) => {
  console.error('[fatal]', err.message);
  process.exit(1);
});
