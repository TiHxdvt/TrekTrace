/**
 * 本地 SQLite 数据库表结构定义
 * 用于微信式本地优先聊天架构
 */

export const SCHEMA_VERSION = 3;

export const CREATE_CONVERSATIONS_TABLE = `
CREATE TABLE IF NOT EXISTS conversations (
  id INTEGER PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'DIRECT',
  name TEXT,
  other_user_id INTEGER,
  other_user_nickname TEXT,
  other_user_avatar_url TEXT,
  last_message_content TEXT,
  last_message_created_at TEXT,
  unread_count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT
);
`;

export const CREATE_MESSAGES_TABLE = `
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY,
  local_id TEXT UNIQUE,
  conversation_id INTEGER NOT NULL,
  sender_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'TEXT',
  status TEXT NOT NULL DEFAULT 'sent',
  created_at TEXT NOT NULL,
  server_created_at TEXT,
  is_deleted INTEGER NOT NULL DEFAULT 0,
  media_url TEXT,
  media_type TEXT,
  media_size INTEGER,
  latitude REAL,
  longitude REAL,
  local_media_path TEXT
);
`;

export const CREATE_PENDING_MESSAGES_TABLE = `
CREATE TABLE IF NOT EXISTS pending_messages (
  local_id TEXT PRIMARY KEY,
  conversation_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  retry_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'sending',
  max_retries INTEGER NOT NULL DEFAULT 3
);
`;

export const CREATE_SYNC_METADATA_TABLE = `
CREATE TABLE IF NOT EXISTS sync_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`;

// 索引
export const CREATE_INDEXES = [
  'CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);',
  'CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);',
  'CREATE INDEX IF NOT EXISTS idx_messages_local_id ON messages(local_id);',
  'CREATE INDEX IF NOT EXISTS idx_pending_messages_conversation_id ON pending_messages(conversation_id);',
  'CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at);',
];

/** V1 → V2 迁移：添加多媒体字段 */
export const MIGRATION_V2 = [
  'ALTER TABLE messages ADD COLUMN media_url TEXT;',
  'ALTER TABLE messages ADD COLUMN media_type TEXT;',
  'ALTER TABLE messages ADD COLUMN media_size INTEGER;',
  'ALTER TABLE messages ADD COLUMN latitude REAL;',
  'ALTER TABLE messages ADD COLUMN longitude REAL;',
  'ALTER TABLE messages ADD COLUMN local_media_path TEXT;',
];

/** V2 → V3 迁移：添加置顶/免打扰/语音时长字段 */
export const MIGRATION_V3 = [
  'ALTER TABLE conversations ADD COLUMN is_pinned INTEGER NOT NULL DEFAULT 0;',
  'ALTER TABLE conversations ADD COLUMN is_muted INTEGER NOT NULL DEFAULT 0;',
  'ALTER TABLE messages ADD COLUMN duration INTEGER;',
];
