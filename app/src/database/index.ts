/**
 * 本地 SQLite 数据库初始化与迁移
 * 使用 @op-engineering/op-sqlite (JSI 驱动)
 */

import { open, type DB } from '@op-engineering/op-sqlite';
import {
  SCHEMA_VERSION,
  CREATE_CONVERSATIONS_TABLE,
  CREATE_MESSAGES_TABLE,
  CREATE_PENDING_MESSAGES_TABLE,
  CREATE_SYNC_METADATA_TABLE,
  CREATE_INDEXES,
  MIGRATION_V2,
} from './schema';

const DB_NAME = 'trektrace_chat.db';

let db: DB | null = null;

/** 获取数据库实例（单例） */
export function getDatabase(): DB {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

/** 初始化数据库：打开连接、建表、迁移 */
export async function initDatabase(): Promise<void> {
  if (db) return;

  db = open({ name: DB_NAME });

  // 启用 WAL 模式，提升并发读写性能
  db.executeSync('PRAGMA journal_mode=WAL;');
  db.executeSync('PRAGMA foreign_keys=ON;');

  // 建表
  db.executeSync(CREATE_CONVERSATIONS_TABLE);
  db.executeSync(CREATE_MESSAGES_TABLE);
  db.executeSync(CREATE_PENDING_MESSAGES_TABLE);
  db.executeSync(CREATE_SYNC_METADATA_TABLE);

  // 创建索引
  for (const sql of CREATE_INDEXES) {
    db.executeSync(sql);
  }

  // 检查并执行迁移
  const existingVersion = getMeta('schema_version');
  const currentVersion = existingVersion ? parseInt(existingVersion, 10) : 0;

  if (currentVersion < 2) {
    runMigrationV2();
  }

  setMeta('schema_version', String(SCHEMA_VERSION));

  console.log('[DB] Database initialized, version:', SCHEMA_VERSION);
}

/** 执行 V1→V2 迁移 */
function runMigrationV2(): void {
  for (const sql of MIGRATION_V2) {
    try {
      db!.executeSync(sql);
    } catch (e: any) {
      // 列可能已存在（新建的数据库不需要迁移），忽略错误
      if (!String(e?.message || '').includes('duplicate column')) {
        console.warn('[DB] Migration warning:', e?.message);
      }
    }
  }
  console.log('[DB] Migration V2 applied');
}

/** 关闭数据库 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

// ---- sync_metadata 辅助 ----

function getMeta(key: string): string | null {
  const d = getDatabase();
  const result = d.executeSync(`SELECT value FROM sync_metadata WHERE key = ?`, [key]);
  if (result.rows && result.rows.length > 0) {
    return result.rows[0].value as string;
  }
  return null;
}

function setMeta(key: string, value: string): void {
  const d = getDatabase();
  const now = new Date().toISOString();
  d.executeSync(
    `INSERT OR REPLACE INTO sync_metadata (key, value, updated_at) VALUES (?, ?, ?)`,
    [key, value, now],
  );
}

export { getMeta as getSyncMeta, setMeta as setSyncMeta };
