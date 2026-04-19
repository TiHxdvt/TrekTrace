/**
 * 聊天数据变换工具
 * 将消息数组转换为 FlatList 可渲染的混合列表（时间标签 + 消息）
 */

import { ChatMessage } from '../../types';

/** 5 分钟间隔阈值（毫秒） */
const FIVE_MINUTES_MS = 5 * 60 * 1000;

/** FlatList 行类型 */
export type ChatListItem =
  | { kind: 'time'; id: string; createdAt: string }
  | { kind: 'message'; id: string; message: ChatMessage; status: MessageStatus };

/** 消息发送状态 */
export type MessageStatus = 'sending' | 'sent' | 'failed' | 'read';

/**
 * 将消息列表转换为 FlatList 数据
 * 相邻消息间隔超过 5 分钟时插入时间标签
 */
export function transformMessagesToList(
  messages: ChatMessage[],
  statusMap?: Map<number, MessageStatus>,
): ChatListItem[] {
  if (!messages || messages.length === 0) return [];

  const result: ChatListItem[] = [];
  let lastTime: number | null = null;

  for (const msg of messages) {
    const msgTime = new Date(msg.createdAt).getTime();

    // 第一条 或 超过 5 分钟间隔 → 插入时间标签
    if (lastTime === null || msgTime - lastTime > FIVE_MINUTES_MS) {
      result.push({
        kind: 'time',
        id: `time-${msg.id}`,
        createdAt: msg.createdAt,
      });
    }

    result.push({
      kind: 'message',
      id: `msg-${msg.id}`,
      message: msg,
      status: statusMap?.get(msg.id) ?? 'sent',
    });

    lastTime = msgTime;
  }

  return result;
}
