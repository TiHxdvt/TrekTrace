/**
 * 聊天本地数据库 CRUD 服务
 * 所有本地读写操作封装于此，供 UI 层和同步层调用
 */

import { getDatabase, getSyncMeta, setSyncMeta } from '../database';
import { Conversation, ChatMessage } from '../types';

// ---- 类型 ----

export type LocalMessageStatus = 'sending' | 'sent' | 'delivered' | 'failed';

export interface LocalMessage {
  id: number | null;
  localId: string;
  conversationId: number;
  senderId: number;
  content: string;
  type: string;
  status: LocalMessageStatus;
  createdAt: string;
  serverCreatedAt: string | null;
  isDeleted: boolean;
}

export interface PendingMessage {
  localId: string;
  conversationId: number;
  content: string;
  createdAt: string;
  retryCount: number;
  status: 'sending' | 'failed';
  maxRetries: number;
}

// ---- 会话 CRUD ----

/** 获取所有会话（置顶优先，再按更新时间倒序） */
export function getConversations(): Conversation[] {
  const db = getDatabase();
  const result = db.executeSync(
    `SELECT * FROM conversations ORDER BY is_pinned DESC, updated_at DESC`,
  );

  return result.rows.map((row: any) => ({
    id: row.id,
    type: row.type,
    name: row.name,
    otherUser: row.other_user_id
      ? {
          userId: row.other_user_id,
          nickname: row.other_user_nickname,
          avatarUrl: row.other_user_avatar_url,
        }
      : undefined,
    lastMessage: row.last_message_content
      ? {
          content: row.last_message_content,
          createdAt: row.last_message_created_at,
        }
      : undefined,
    unreadCount: row.unread_count ?? 0,
    isPinned: row.is_pinned === 1,
    isMuted: row.is_muted === 1,
  }));
}

/** 写入或更新会话 */
export function upsertConversation(conv: Conversation): void {
  const db = getDatabase();
  db.executeSync(
    `INSERT OR REPLACE INTO conversations
      (id, type, name, other_user_id, other_user_nickname, other_user_avatar_url,
       last_message_content, last_message_created_at, unread_count, updated_at, is_pinned, is_muted)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      conv.id,
      conv.type,
      conv.name ?? null,
      conv.otherUser?.userId ?? null,
      conv.otherUser?.nickname ?? null,
      conv.otherUser?.avatarUrl ?? null,
      conv.lastMessage?.content ?? null,
      conv.lastMessage?.createdAt ?? null,
      conv.unreadCount ?? 0,
      conv.lastMessage?.createdAt ?? new Date().toISOString(),
      conv.isPinned ? 1 : 0,
      conv.isMuted ? 1 : 0,
    ],
  );
}

/** 批量 upsert 会话 */
export function upsertConversations(convs: Conversation[]): void {
  const db = getDatabase();
  try {
    db.executeSync('BEGIN TRANSACTION');
    for (const conv of convs) {
      upsertConversation(conv);
    }
    db.executeSync('COMMIT');
  } catch (e) {
    db.executeSync('ROLLBACK');
    throw e;
  }
}

/** 删除本地会话 */
export function deleteConversationLocal(convId: number): void {
  const db = getDatabase();
  db.executeSync(`DELETE FROM messages WHERE conversation_id = ?`, [convId]);
  db.executeSync(`DELETE FROM pending_messages WHERE conversation_id = ?`, [convId]);
  db.executeSync(`DELETE FROM conversations WHERE id = ?`, [convId]);
}

/** 更新会话未读数 */
export function updateConversationUnread(convId: number, count: number): void {
  const db = getDatabase();
  db.executeSync(
    `UPDATE conversations SET unread_count = ? WHERE id = ?`,
    [count, convId],
  );
}

/** 更新会话最后一条消息 */
export function updateConversationLastMessage(
  convId: number,
  content: string,
  createdAt: string,
): void {
  const db = getDatabase();
  db.executeSync(
    `UPDATE conversations SET last_message_content = ?, last_message_created_at = ?, updated_at = ? WHERE id = ?`,
    [content, createdAt, createdAt, convId],
  );
}

// ---- 消息 CRUD ----

/** 获取某会话的消息（分页，按时间正序，不含已删除）
 *  offset=0 返回最新的 limit 条消息
 *  offset=N 返回更早的 limit 条消息
 */
export function getMessages(convId: number, limit = 50, offset = 0): ChatMessage[] {
  const db = getDatabase();
  // 先获取总条数来确定有效的 offset
  const countResult = db.executeSync(
    `SELECT COUNT(*) as cnt FROM messages WHERE conversation_id = ? AND is_deleted = 0`,
    [convId],
  );
  const total = Number(countResult.rows[0]?.cnt ?? 0);

  // 计算有效的 offset（从末尾往前取）
  const effectiveOffset = Math.max(0, total - offset - limit);
  const effectiveLimit = Math.min(limit, total - offset);
  if (effectiveLimit <= 0) return [];

  const result = db.executeSync(
    `SELECT * FROM messages
     WHERE conversation_id = ? AND is_deleted = 0
     ORDER BY created_at ASC
     LIMIT ? OFFSET ?`,
    [convId, effectiveLimit, effectiveOffset],
  );

  return result.rows.map((row: any) => ({
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    content: row.content,
    type: row.type,
    createdAt: row.created_at,
    mediaUrl: row.media_url ?? undefined,
    mediaType: row.media_type ?? undefined,
    mediaSize: row.media_size ?? undefined,
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
    duration: row.duration ?? undefined,
  }));
}

/** 获取某会话的消息（按时间正序，用于首次加载，返回全部） */
export function getAllMessages(convId: number): ChatMessage[] {
  const db = getDatabase();
  const result = db.executeSync(
    `SELECT * FROM messages
     WHERE conversation_id = ? AND is_deleted = 0
     ORDER BY created_at ASC`,
    [convId],
  );

  return result.rows.map((row: any) => ({
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    content: row.content,
    type: row.type,
    createdAt: row.created_at,
    mediaUrl: row.media_url ?? undefined,
    mediaType: row.media_type ?? undefined,
    mediaSize: row.media_size ?? undefined,
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
    duration: row.duration ?? undefined,
  }));
}

/** 插入消息（来自服务端同步或 WebSocket 推送） */
export function insertMessage(msg: ChatMessage): void {
  const db = getDatabase();
  db.executeSync(
    `INSERT OR IGNORE INTO messages
      (id, local_id, conversation_id, sender_id, content, type, status, created_at, server_created_at, is_deleted,
       media_url, media_type, media_size, latitude, longitude, duration)
     VALUES (?, ?, ?, ?, ?, ?, 'sent', ?, ?, 0, ?, ?, ?, ?, ?, ?)`,
    [
      msg.id,
      `server-${msg.id}`,
      msg.conversationId,
      msg.senderId,
      msg.content,
      msg.type,
      msg.createdAt,
      msg.createdAt,
      msg.mediaUrl ?? null,
      msg.mediaType ?? null,
      msg.mediaSize ?? null,
      msg.latitude ?? null,
      msg.longitude ?? null,
      msg.duration ?? null,
    ],
  );
}

/** 批量插入消息（来自同步） */
export function insertMessages(messages: ChatMessage[]): void {
  const db = getDatabase();
  try {
    db.executeSync('BEGIN TRANSACTION');
    for (const msg of messages) {
      insertMessage(msg);
    }
    db.executeSync('COMMIT');
  } catch (e) {
    db.executeSync('ROLLBACK');
    throw e;
  }
}

/** 插入本地发送消息（sending 状态，id 为临时负数） */
export function insertSendingMessage(
  localId: string,
  convId: number,
  senderId: number,
  content: string,
): void {
  const db = getDatabase();
  const now = new Date().toISOString();
  db.executeSync(
    `INSERT INTO messages
      (id, local_id, conversation_id, sender_id, content, type, status, created_at, server_created_at, is_deleted)
     VALUES (NULL, ?, ?, ?, ?, 'TEXT', 'sending', ?, NULL, 0)`,
    [localId, convId, senderId, content, now],
  );
}

/** 更新消息状态（sending → sent / failed） */
export function updateMessageStatus(localId: string, status: LocalMessageStatus, serverId?: number): void {
  const db = getDatabase();
  if (serverId && status === 'sent') {
    db.executeSync(
      `UPDATE messages SET status = ?, id = ? WHERE local_id = ?`,
      [status, serverId, localId],
    );
  } else {
    db.executeSync(
      `UPDATE messages SET status = ? WHERE local_id = ?`,
      [status, localId],
    );
  }
}

/** 软删除消息 */
export function softDeleteMessage(msgId: number): void {
  const db = getDatabase();
  db.executeSync(
    `UPDATE messages SET is_deleted = 1 WHERE id = ?`,
    [msgId],
  );
}

/** 标记消息为已撤回 */
export function updateMessageRecalled(msgId: number): void {
  const db = getDatabase();
  db.executeSync(
    `UPDATE messages SET type = 'RECALLED', content = '', media_url = NULL, media_type = NULL, media_size = NULL, latitude = NULL, longitude = NULL WHERE id = ?`,
    [msgId],
  );
}

/** 获取某条消息的发送状态 */
export function getMessageStatus(localId: string): LocalMessageStatus | null {
  const db = getDatabase();
  const result = db.executeSync(
    `SELECT status FROM messages WHERE local_id = ?`,
    [localId],
  );
  if (result.rows.length > 0) {
    return result.rows[0].status as LocalMessageStatus;
  }
  return null;
}

/** 通过 server id 检查消息是否已存在 */
export function messageExists(serverId: number): boolean {
  const db = getDatabase();
  const result = db.executeSync(
    `SELECT 1 FROM messages WHERE id = ? LIMIT 1`,
    [serverId],
  );
  return result.rows.length > 0;
}

// ---- Pending 消息（离线队列） ----

/** 入队待发送消息 */
export function enqueuePendingMessage(msg: PendingMessage): void {
  const db = getDatabase();
  db.executeSync(
    `INSERT OR REPLACE INTO pending_messages
      (local_id, conversation_id, content, created_at, retry_count, status, max_retries)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      msg.localId,
      msg.conversationId,
      msg.content,
      msg.createdAt,
      msg.retryCount,
      msg.status,
      msg.maxRetries,
    ],
  );
}

/** 删除待发送消息（发送成功后） */
export function removePendingMessage(localId: string): void {
  const db = getDatabase();
  db.executeSync(
    `DELETE FROM pending_messages WHERE local_id = ?`,
    [localId],
  );
}

/** 获取所有待发送消息 */
export function getPendingMessages(): PendingMessage[] {
  const db = getDatabase();
  const result = db.executeSync(
    `SELECT * FROM pending_messages ORDER BY created_at ASC`,
  );

  return result.rows.map((row: any) => ({
    localId: row.local_id,
    conversationId: row.conversation_id,
    content: row.content,
    createdAt: row.created_at,
    retryCount: row.retry_count,
    status: row.status,
    maxRetries: row.max_retries,
  }));
}

/** 更新待发送消息的重试次数 */
export function updatePendingRetry(localId: string, retryCount: number, status: 'sending' | 'failed'): void {
  const db = getDatabase();
  db.executeSync(
    `UPDATE pending_messages SET retry_count = ?, status = ? WHERE local_id = ?`,
    [retryCount, status, localId],
  );
}

// ---- 同步元数据 ----

export { getSyncMeta, setSyncMeta };
