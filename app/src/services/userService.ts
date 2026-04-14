/**
 * 用户个人信息服务
 */

import api from './api';

export interface ProfileData {
  id: number;
  phone: string;
  nickname: string;
  avatarUrl: string;
  createdAt: string;
}

export const userService = {
  getProfile: async (): Promise<ProfileData> => {
    const response = await api.get<ProfileData>('/user/profile');
    return response.data;
  },

  updateProfile: async (data: { nickname?: string; avatarUrl?: string }): Promise<ProfileData> => {
    const response = await api.put<ProfileData>('/user/profile', data);
    return response.data;
  },
};
