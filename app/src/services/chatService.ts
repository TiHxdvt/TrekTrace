/**
 * 聊天 REST API 服务
 */

import api from './api';
import { Conversation, ChatMessage } from '../types';

export interface MediaUploadResult {
  url: string;
  mediaType: string;
}

export const chatService = {
  async getConversations(): Promise<Conversation[]> {
    const res = await api.get('/chat/conversations');
    return res.data;
  },

  async getMessages(conversationId: number, page = 0, size = 20): Promise<{ content: ChatMessage[]; totalElements: number; last: boolean }> {
    const res = await api.get(`/chat/conversations/${conversationId}/messages`, {
      params: { page, size },
    });
    return res.data;
  },

  async sendMessage(conversationId: number, content: string, mediaOptions?: {
    mediaType?: string;
    mediaUrl?: string;
    mediaSize?: number;
    latitude?: number;
    longitude?: number;
    duration?: number;
  }): Promise<ChatMessage> {
    const body: Record<string, unknown> = { content: content || '' };
    if (mediaOptions) {
      if (mediaOptions.mediaType) body.mediaType = mediaOptions.mediaType;
      if (mediaOptions.mediaUrl) body.mediaUrl = mediaOptions.mediaUrl;
      if (mediaOptions.mediaSize) body.mediaSize = mediaOptions.mediaSize;
      if (mediaOptions.latitude != null) body.latitude = mediaOptions.latitude;
      if (mediaOptions.longitude != null) body.longitude = mediaOptions.longitude;
      if (mediaOptions.duration != null) body.duration = mediaOptions.duration;
    }
    const res = await api.post(`/chat/conversations/${conversationId}/messages`, body);
    return res.data;
  },

  async uploadMedia(fileUri: string, mimeType?: string): Promise<MediaUploadResult> {
    const formData = new FormData();
    // @ts-ignore React Native FormData supports uri
    formData.append('file', {
      uri: fileUri,
      type: mimeType || 'image/jpeg',
      name: 'upload',
    });
    const res = await api.post('/chat/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  async recallMessage(messageId: number): Promise<ChatMessage> {
    const res = await api.put(`/chat/messages/${messageId}/recall`);
    return res.data;
  },

  async markAsRead(conversationId: number, messageId: number): Promise<void> {
    await api.put(`/chat/conversations/${conversationId}/read`, { messageId });
  },

  async getOrCreateConversation(friendUserId: number): Promise<{ conversationId: number }> {
    const res = await api.post(`/chat/conversations/direct/${friendUserId}`);
    return res.data;
  },

  /** 增量同步：拉取指定 messageId 之后的所有消息 */
  async syncMessages(afterMessageId?: number): Promise<ChatMessage[]> {
    const params: { after?: number } = {};
    if (afterMessageId !== undefined) {
      params.after = afterMessageId;
    }
    const res = await api.get('/chat/messages/sync', { params });
    return res.data;
  },

  /** 删除会话及其所有消息 */
  async deleteConversation(conversationId: number): Promise<void> {
    await api.delete(`/chat/conversations/${conversationId}`);
  },

  /** 删除单条消息（只能删自己的） */
  async deleteMessage(messageId: number): Promise<void> {
    await api.delete(`/chat/messages/${messageId}`);
  },

  /** 在指定会话中搜索消息 */
  async searchMessages(conversationId: number, keyword: string, page = 0, size = 20): Promise<ChatMessage[]> {
    const res = await api.get(`/chat/conversations/${conversationId}/messages/search`, {
      params: { keyword, page, size },
    });
    return res.data;
  },

  /** 全局搜索消息 */
  async searchAllMessages(keyword: string, page = 0, size = 20): Promise<ChatMessage[]> {
    const res = await api.get('/chat/messages/search', {
      params: { keyword, page, size },
    });
    return res.data;
  },

  /** 设置会话置顶 */
  async setPinned(conversationId: number, pinned: boolean): Promise<void> {
    await api.put(`/chat/conversations/${conversationId}/pin`, { pinned });
  },

  /** 设置会话免打扰 */
  async setMuted(conversationId: number, muted: boolean): Promise<void> {
    await api.put(`/chat/conversations/${conversationId}/mute`, { muted });
  },

  /** 创建群聊 */
  async createGroup(name: string, memberIds: number[]): Promise<Conversation> {
    const res = await api.post('/chat/conversations/group', { name, memberIds });
    return res.data;
  },

  /** 修改群名 */
  async updateGroupName(conversationId: number, name: string): Promise<void> {
    await api.put(`/chat/conversations/${conversationId}/name`, { name });
  },

  /** 添加群成员 */
  async addMembers(conversationId: number, memberIds: number[]): Promise<void> {
    await api.post(`/chat/conversations/${conversationId}/members`, { memberIds });
  },

  /** 移除群成员 */
  async removeMember(conversationId: number, userId: number): Promise<void> {
    await api.delete(`/chat/conversations/${conversationId}/members/${userId}`);
  },

  /** 获取群成员列表 */
  async getMembers(conversationId: number): Promise<Array<{ userId: number; nickname?: string; avatarUrl?: string; role?: string }>> {
    const res = await api.get(`/chat/conversations/${conversationId}/members`);
    return res.data;
  },
};
