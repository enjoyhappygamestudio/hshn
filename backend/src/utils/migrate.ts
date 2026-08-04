import { query, pool } from './db';
import * as fs from 'fs';
import * as path from 'path';

async function migrate() {
  const migrationsDir = path.join(__dirname, '../../migrations');
  const files = fs.readdirSync(migrationsDir).sort();

  try {
    console.log('Running migrations...');
    for (const file of files) {
      if (!file.endsWith('.sql')) continue;
      console.log(`  Applying ${file}...`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      await query(sql);
      console.log(`  ✓ ${file} done`);
    }
    console.log('All migrations completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
