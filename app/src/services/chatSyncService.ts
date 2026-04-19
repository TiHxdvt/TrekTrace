/**
 * 聊天同步服务
 * 负责本地 DB 与服务端之间的数据同步
 *
 * 同步时机：
 * - 打开 App → syncOnAppStart()
 * - 打开聊天页 → syncConversationMessages()
 * - WebSocket 推送 → 由页面直接写入本地
 */

import { chatService } from './chatService';
import {
  getConversations as dbGetConversations,
  upsertConversations,
  insertMessages,
  insertSendingMessage,
  getPendingMessages,
  removePendingMessage,
  updatePendingRetry,
  enqueuePendingMessage,
  updateMessageStatus,
  getSyncMeta,
  setSyncMeta,
} from './chatDatabaseService';
import { storageService } from './storageService';
import { ChatMessage, User } from '../types';

// ---- 元数据 key 常量 ----
const META_LAST_SYNC_MESSAGE_ID = 'last_sync_message_id';
const META_LAST_SYNC_TIME = 'last_sync_time';

/**
 * App 启动时同步
 * 1. 同步会话列表 → upsert 本地
 * 2. 增量同步消息 → 写入本地
 * 3. 发送离线队列中的消息
 */
export async function syncOnAppStart(): Promise<void> {
  try {
    await syncConversations();
  } catch (e) {
    console.warn('[Sync] syncConversations failed:', e);
  }

  try {
    await syncMessages();
  } catch (e) {
    console.warn('[Sync] syncMessages failed:', e);
  }

  try {
    await flushPendingMessages();
  } catch (e) {
    console.warn('[Sync] flushPendingMessages failed:', e);
  }
}

/**
 * 同步会话列表
 * 从服务端拉取全量会话 → upsert 到本地 DB
 */
export async function syncConversations(): Promise<void> {
  const conversations = await chatService.getConversations();
  upsertConversations(conversations);
  console.log('[Sync] Synced', conversations.length, 'conversations');
}

/**
 * 增量同步消息
 * 拉取上次同步之后的所有新消息 → 写入本地 DB
 */
export async function syncMessages(): Promise<void> {
  const lastSyncId = getSyncMeta(META_LAST_SYNC_MESSAGE_ID);
  const afterMessageId = lastSyncId ? parseInt(lastSyncId, 10) : undefined;

  const messages = await chatService.syncMessages(afterMessageId);

  if (messages.length > 0) {
    insertMessages(messages);

    // 更新同步位点（取最大的 messageId）
    const maxId = messages.reduce((max, m) => m.id > max ? m.id : max, 0);
    setSyncMeta(META_LAST_SYNC_MESSAGE_ID, String(maxId));
    setSyncMeta(META_LAST_SYNC_TIME, new Date().toISOString());

    console.log('[Sync] Synced', messages.length, 'messages, lastId:', maxId);
  }
}

/**
 * 同步某会话的新消息
 * 打开聊天页时调用，确保该会话数据最新
 */
export async function syncConversationMessages(_convId: number): Promise<void> {
  // 先做一次全局增量同步（简化逻辑，避免按会话单独维护位点）
  await syncMessages();
}

/**
 * 发送离线队列中的待发送消息
 */
export async function flushPendingMessages(): Promise<void> {
  const pending = getPendingMessages();
  if (pending.length === 0) return;

  console.log('[Sync] Flushing', pending.length, 'pending messages');

  for (const msg of pending) {
    if (msg.retryCount >= msg.maxRetries) {
      // 超过最大重试次数，标记失败
      updatePendingRetry(msg.localId, msg.retryCount, 'failed');
      updateMessageStatus(msg.localId, 'failed');
      continue;
    }

    try {
      updatePendingRetry(msg.localId, msg.retryCount + 1, 'sending');
      updateMessageStatus(msg.localId, 'sending');

      const result = await chatService.sendMessage(msg.conversationId, msg.content);

      // 发送成功：更新本地消息状态，删除 pending 记录
      updateMessageStatus(msg.localId, 'sent', result.id);
      removePendingMessage(msg.localId);

      // 更新同步位点
      const lastSyncId = getSyncMeta(META_LAST_SYNC_MESSAGE_ID);
      if (!lastSyncId || result.id > parseInt(lastSyncId, 10)) {
        setSyncMeta(META_LAST_SYNC_MESSAGE_ID, String(result.id));
      }
    } catch (e) {
      // 发送失败：更新重试计数
      updatePendingRetry(msg.localId, msg.retryCount + 1, 'failed');
      updateMessageStatus(msg.localId, 'failed');
      console.warn('[Sync] Failed to send pending message:', msg.localId, e);
    }
  }
}

/**
 * 发送消息（本地优先）
 * 1. 写入本地 DB (status=sending)
 * 2. 写入 pending 队列
 * 3. 尝试发送到服务端
 * 4. 成功 → 更新本地状态 + 删 pending；失败 → 状态变 failed，保留 pending
 */
export async function sendLocalMessage(
  localId: string,
  conversationId: number,
  senderId: number,
  content: string,
): Promise<{ success: boolean; serverMessage?: ChatMessage }> {
  const now = new Date().toISOString();

  // 1. 写入本地 DB（sending 状态）
  insertSendingMessage(localId, conversationId, senderId, content);

  // 2. 写入 pending 队列
  enqueuePendingMessage({
    localId,
    conversationId,
    content,
    createdAt: now,
    retryCount: 0,
    status: 'sending',
    maxRetries: 3,
  });

  // 3. 尝试发送
  try {
    const result = await chatService.sendMessage(conversationId, content);

    // 4a. 成功
    updateMessageStatus(localId, 'sent', result.id);
    removePendingMessage(localId);

    // 更新同步位点
    const lastSyncId = getSyncMeta(META_LAST_SYNC_MESSAGE_ID);
    if (!lastSyncId || result.id > parseInt(lastSyncId, 10)) {
      setSyncMeta(META_LAST_SYNC_MESSAGE_ID, String(result.id));
    }

    return { success: true, serverMessage: result };
  } catch (e) {
    // 4b. 失败
    updateMessageStatus(localId, 'failed');
    updatePendingRetry(localId, 0, 'failed');
    return { success: false };
  }
}

/**
 * 获取当前用户 ID（用于发送消息时设置 senderId）
 */
export async function getCurrentUserId(): Promise<number> {
  const user: User | null = await storageService.getUser();
  return user?.id ?? -1;
}
