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
  expiresAt?: string;
}

export interface FriendActivityFeedData {
  activityId: number;
  userId: number;
  nickname: string;
  avatarUrl: string;
  activityType: string;
  distance: number | null;
  duration: number | null;
  startTime: string;
}

export interface NearbyUserData {
  userId: number;
  account: number;
  nickname: string;
  avatarUrl: string;
  distanceKm: number;
  lastActivityType: string | null;
  lastLocationAt: string | null;
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

  // Blacklist
  blockUser: async (userId: number): Promise<void> => {
    await api.post(`/friends/${userId}/block`);
  },

  unblockUser: async (userId: number): Promise<void> => {
    await api.delete(`/friends/${userId}/block`);
  },

  getBlockedUsers: async (): Promise<FriendData[]> => {
    const response = await api.get<FriendData[]>('/friends/blocked');
    return response.data;
  },

  // Friend activity feed
  getFriendFeed: async (page = 0, size = 20): Promise<{ content: FriendActivityFeedData[] }> => {
    const response = await api.get<{ content: FriendActivityFeedData[] }>('/activities/friend-feed', {
      params: { page, size },
    });
    return response.data;
  },

  // Nearby users
  getNearbyUsers: async (radiusKm = 10): Promise<NearbyUserData[]> => {
    const response = await api.get<NearbyUserData[]>('/user/nearby', {
      params: { radiusKm },
    });
    return response.data;
  },
};
