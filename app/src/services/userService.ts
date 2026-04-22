/**
 * 用户个人信息服务
 */

import api from './api';
import ImageResizer from '@bam.tech/react-native-image-resizer';

export interface ProfileData {
  id: number;
  account: number;
  phone: string;
  nickname: string;
  avatarUrl: string;
  createdAt: string;
  nicknameUpdatedAt: string | null;
  hasPassword: boolean;
  email: string | null;
  emailVerified: boolean;
  weight: number | null;
  bio: string | null;
  gender: string | null;
  height: number | null;
}

export const userService = {
  getProfile: async (): Promise<ProfileData> => {
    const response = await api.get<ProfileData>('/user/profile');
    return response.data;
  },

  updateProfile: async (data: {
    nickname?: string;
    avatarUrl?: string;
    weight?: number;
    bio?: string;
    gender?: string;
    height?: number;
  }): Promise<ProfileData> => {
    const response = await api.put<ProfileData>('/user/profile', data);
    return response.data;
  },

  uploadAvatar: async (fileUri: string, mimeType: string): Promise<string> => {
    // 先压缩：最大 1200px，质量 80%，JPEG 格式
    const resized = await ImageResizer.createResizedImage(
      fileUri,
      1200,
      1200,
      'JPEG',
      80,
    );

    const formData = new FormData();
    formData.append('avatar', {
      uri: resized.uri,
      type: 'image/jpeg',
      name: 'avatar.jpg',
    } as any);

    const response = await api.post<{ avatarUrl: string }>('/user/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 30000,
    });
    return response.data.avatarUrl;
  },
};
