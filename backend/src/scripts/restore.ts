import { getObject } from '../services/storage';
import { restoreDatabase } from '../services/backup';

// Cách dùng: npm run backup:restore -- db/2026-08-04-2026-08-04T03-00-00-000Z.json.gz
const key = process.argv[2];

async function main(): Promise<void> {
  if (!key) {
    console.error('Thiếu key backup. Ví dụ: npm run backup:restore -- db/2026-08-04-....json.gz');
    process.exit(1);
  }
  const buf = await getObject('backups', key);
  const restored = await restoreDatabase(buf);
  console.log(`Đã restore ${restored} dòng từ ${key}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Restore thất bại:', err);
  process.exit(1);
});
