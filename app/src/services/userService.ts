/**
 * 用户个人信息服务
 */

import api from './api';

export interface ProfileData {
  id: number;
  account: number;
  phone: string;
  nickname: string;
  avatarUrl: string;
  createdAt: string;
  nicknameUpdatedAt: string | null;
  hasPassword: boolean;
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

  uploadAvatar: async (fileUri: string, mimeType: string): Promise<string> => {
    const formData = new FormData();
    formData.append('avatar', {
      uri: fileUri,
      type: mimeType,
      name: 'avatar.' + (mimeType.split('/')[1] || 'jpg'),
    } as any);

    const response = await api.post<{ avatarUrl: string }>('/user/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 30000,
    });
    return response.data.avatarUrl;
  },
};
