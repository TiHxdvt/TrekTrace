/**
 * 聊天 REST API 服务
 */

import api from './api';
import { Conversation, ChatMessage } from '../types';

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

  async sendMessage(conversationId: number, content: string): Promise<ChatMessage> {
    const res = await api.post(`/chat/conversations/${conversationId}/messages`, { content });
    return res.data;
  },

  async markAsRead(conversationId: number, messageId: number): Promise<void> {
    await api.put(`/chat/conversations/${conversationId}/read`, { messageId });
  },

  async getOrCreateConversation(friendUserId: number): Promise<{ conversationId: number }> {
    const res = await api.post(`/chat/conversations/direct/${friendUserId}`);
    return res.data;
  },
};
