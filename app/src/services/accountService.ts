/**
 * 账号隐私服务
 */

import api from './api';

export const accountService = {
  changePhone: async (phone: string, code: string): Promise<{ phone: string }> => {
    const response = await api.post<{ phone: string }>('/account/change-phone', { phone, code });
    return response.data;
  },

  deleteAccount: async (): Promise<void> => {
    await api.delete('/account');
  },

  updateVisibility: async (visibility: string): Promise<{ visibility: string }> => {
    const response = await api.put<{ visibility: string }>('/account/visibility', { visibility });
    return response.data;
  },

  getVisibility: async (): Promise<{ visibility: string }> => {
    const response = await api.get<{ visibility: string }>('/account/visibility');
    return response.data;
  },

  setPassword: async (password: string): Promise<void> => {
    await api.post('/user/password', { password });
  },

  changePassword: async (oldPassword: string, newPassword: string): Promise<void> => {
    await api.put('/user/password', { oldPassword, newPassword });
  },

  bindEmail: async (email: string): Promise<void> => {
    await api.post('/auth/bind-email', { email });
  },
};
