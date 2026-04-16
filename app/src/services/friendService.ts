/**
 * 好友服务
 */

import api from './api';

export interface FriendData {
  friendshipId: number;
  userId: number;
  account: number;
  nickname: string;
  avatarUrl: string;
  phone: string;
}

export interface FriendRequestData {
  id: number;
  requesterId: number;
  requesterNickname: string;
  requesterAvatarUrl: string;
  status: string;
  createdAt: string;
}

export const friendService = {
  getFriends: async (): Promise<FriendData[]> => {
    const response = await api.get<FriendData[]>('/friends');
    return response.data;
  },

  getPendingRequests: async (): Promise<FriendRequestData[]> => {
    const response = await api.get<FriendRequestData[]>('/friends/requests');
    return response.data;
  },

  sendRequest: async (phone: string): Promise<void> => {
    await api.post('/friends/request', { phone });
  },

  sendRequestByAccount: async (account: number): Promise<void> => {
    await api.post('/friends/request-by-account', { account });
  },

  acceptRequest: async (id: number): Promise<void> => {
    await api.put(`/friends/requests/${id}/accept`);
  },

  declineRequest: async (id: number): Promise<void> => {
    await api.put(`/friends/requests/${id}/decline`);
  },

  deleteFriend: async (id: number): Promise<void> => {
    await api.delete(`/friends/${id}`);
  },
};
