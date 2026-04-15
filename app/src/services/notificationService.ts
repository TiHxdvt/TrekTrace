/**
 * 通知服务
 */

import api from './api';

export interface NotificationItem {
  id: number;
  type: 'SYSTEM_UPDATE' | 'ACTIVITY_SUMMARY' | 'MILESTONE' | 'FRIEND_REQUEST';
  title: string;
  content: string;
  isRead: boolean;
  relatedId?: number;
  createdAt: string;
}

export const notificationService = {
  getNotifications: async (): Promise<NotificationItem[]> => {
    const response = await api.get<NotificationItem[]>('/notifications');
    return response.data;
  },

  markAsRead: async (id: number): Promise<void> => {
    await api.put(`/notifications/${id}/read`);
  },

  markAllAsRead: async (): Promise<void> => {
    await api.put('/notifications/read-all');
  },
};
