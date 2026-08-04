import app from './app';
import { config } from './config';
import { pool } from './utils/db';
import { startHardShipWatcher } from './services/hardShipWatcher';
import { startBackupScheduler } from './services/backup';

async function start() {
  try {
    // Test DB connection
    await pool.query('SELECT 1');
    console.log('Database connected successfully');

    app.listen(config.port, () => {
      console.log(`🚀 Hải Sản Hà Nội API running on port ${config.port}`);
      console.log(`   Environment: ${config.nodeEnv}`);
      console.log(`   Health: http://localhost:${config.port}/api/health`);
    });
    startHardShipWatcher();
    startBackupScheduler();
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  await pool.end();
  process.exit(0);
});

start();
