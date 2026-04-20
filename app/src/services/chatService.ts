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
  }): Promise<ChatMessage> {
    const body: Record<string, unknown> = { content: content || '' };
    if (mediaOptions) {
      if (mediaOptions.mediaType) body.mediaType = mediaOptions.mediaType;
      if (mediaOptions.mediaUrl) body.mediaUrl = mediaOptions.mediaUrl;
      if (mediaOptions.mediaSize) body.mediaSize = mediaOptions.mediaSize;
      if (mediaOptions.latitude != null) body.latitude = mediaOptions.latitude;
      if (mediaOptions.longitude != null) body.longitude = mediaOptions.longitude;
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
};
