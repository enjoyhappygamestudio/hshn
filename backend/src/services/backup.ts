import { gzipSync, gunzipSync } from 'zlib';
import { query } from '../utils/db';
import { config } from '../config';
import { uploadBuffer, deleteObject, listObjects, copyObject, getObject } from './storage';

// Cơ chế backup (bucket hsb-backups):
//   1. Dump toàn bộ DB → backups/db/<ngày>-<giờ>.json.gz
//   2. Snapshot toàn bộ object trong media & documents → backups/snapshot/<ngày>/media|documents/<key>
//   3. Tự xóa backup cũ hơn BACKUP_KEEP_DAYS (mặc định 30)
// Scheduler chạy 1 lần/ngày theo BACKUP_HOUR_UTC (mặc định 3h sáng UTC).

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function dumpDatabase(): Promise<Buffer> {
  const tablesResult = await query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`,
  );
  const dump: Record<string, any[]> = {};
  for (const row of tablesResult.rows) {
    const table = row.table_name as string;
    const res = await query(`SELECT * FROM "${table}"`);
    dump[table] = res.rows;
  }
  return gzipSync(Buffer.from(JSON.stringify(dump), 'utf8'));
}

export async function restoreDatabase(compressed: Buffer): Promise<number> {
  const dump = JSON.parse(gunzipSync(compressed).toString('utf8')) as Record<string, any[]>;
  let restored = 0;
  for (const [table, rows] of Object.entries(dump)) {
    if (!Array.isArray(rows)) continue;
    await query(`TRUNCATE TABLE "${table}" CASCADE`);
    for (const row of rows) {
      const keys = Object.keys(row);
      if (keys.length === 0) continue;
      const placeholders = keys.map((_, i) => `$${i + 1}`);
      await query(
        `INSERT INTO "${table}" ("${keys.join('","')}") VALUES (${placeholders.join(',')})`,
        keys.map((k) => row[k]),
      );
    }
    restored += rows.length;
  }
  return restored;
}

async function pruneBackups(keepDays: number): Promise<number> {
  const cutoff = new Date(Date.now() - keepDays * 86400000).toISOString().slice(0, 10);
  let removed = 0;

  const snapshotDirs = new Set<string>();
  const snapshots = await listObjects('backups', 'snapshot/');
  for (const obj of snapshots) {
    const m = obj.Key && obj.Key.match(/^snapshot\/(\d{4}-\d{2}-\d{2})\//);
    if (m) snapshotDirs.add(m[1]);
  }
  for (const dir of snapshotDirs) {
    if (dir < cutoff) {
      const items = await listObjects('backups', `snapshot/${dir}/`);
      for (const obj of items) {
        if (obj.Key) await deleteObject('backups', obj.Key);
      }
      removed++;
    }
  }

  const dbItems = await listObjects('backups', 'db/');
  for (const obj of dbItems) {
    if (!obj.Key) continue;
    const m = obj.Key.match(/^db\/(\d{4}-\d{2}-\d{2})-.*\.json\.gz$/);
    if (m && m[1] < cutoff) {
      await deleteObject('backups', obj.Key);
      removed++;
    }
  }
  return removed;
}

export async function runBackup(): Promise<{ dbKey: string; mediaCount: number; documentsCount: number; removed: number }> {
  if (!config.r2.enabled) {
    console.warn('[Backup] R2_ENABLED=false — bỏ qua backup (chỉ chạy khi bật R2)');
    return { dbKey: '', mediaCount: 0, documentsCount: 0, removed: 0 };
  }

  const datePart = todayKey();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');

  const dbDump = await dumpDatabase();
  const dbKey = `db/${datePart}-${stamp}.json.gz`;
  await uploadBuffer({ bucket: 'backups', key: dbKey, body: dbDump, contentType: 'application/gzip' });

  const snapshotDir = `snapshot/${datePart}`;
  let mediaCount = 0;
  for (const obj of await listObjects('media', '')) {
    if (!obj.Key || obj.Key.endsWith('/')) continue;
    await copyObject({ fromBucket: 'media', toBucket: 'backups', key: obj.Key, newKey: `${snapshotDir}/media/${obj.Key}` });
    mediaCount++;
  }

  let documentsCount = 0;
  for (const obj of await listObjects('documents', '')) {
    if (!obj.Key || obj.Key.endsWith('/')) continue;
    await copyObject({ fromBucket: 'documents', toBucket: 'backups', key: obj.Key, newKey: `${snapshotDir}/documents/${obj.Key}` });
    documentsCount++;
  }

  const removed = await pruneBackups(config.backup.keepDays);
  console.log(`[Backup] Xong: db=${dbKey}, media=${mediaCount}, documents=${documentsCount}, removed=${removed}`);
  return { dbKey, mediaCount, documentsCount, removed };
}

// Chạy 1 lần/ngày đúng giờ BACKUP_HOUR_UTC
const CHECK_INTERVAL_MS = 60 * 60 * 1000;
let lastRunDay = '';

export function startBackupScheduler(): void {
  if (!config.r2.enabled) {
    console.log('[Backup] R2 chưa bật — tắt scheduler backup');
    return;
  }
  if (!config.backup.enabled) {
    console.log('[Backup] BACKUP_ENABLED=false — tắt scheduler backup');
    return;
  }

  const tick = async () => {
    const now = new Date();
    const day = now.toISOString().slice(0, 10);
    if (day === lastRunDay) return;
    if (now.getUTCHours() !== config.backup.hourUtc) return;
    lastRunDay = day;
    try {
      await runBackup();
    } catch (err: any) {
      console.error('[Backup] Lỗi khi chạy backup:', err.message);
    }
  };

  void tick();
  setInterval(tick, CHECK_INTERVAL_MS);
  console.log(`[Backup] Scheduler bật: mỗi ngày lúc ${config.backup.hourUtc}:00 UTC, giữ ${config.backup.keepDays} ngày`);
}
