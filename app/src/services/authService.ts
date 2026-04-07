/**
 * 认证服务
 * 处理用户登录、登出等认证相关功能
 */

import api from './api';
import { LoginRequest, LoginResponse, SendCodeRequest, User } from '../types';

export const authService = {
  /**
   * 发送验证码
   * @param phone 手机号
   */
  sendVerificationCode: async (phone: string): Promise<void> => {
    const data: SendCodeRequest = { phone };
    await api.post('/auth/send-code', data);
  },

  /**
   * 用户登录
   * @param phone 手机号
   * @param code 验证码
   * @returns 登录响应（token + 用户信息）
   */
  login: async (phone: string, code: string): Promise<LoginResponse> => {
    const data: LoginRequest = { phone, code };
    const response = await api.post<LoginResponse>('/auth/login', data);
    return response.data;
  },

  /**
   * 获取当前用户信息
   * @returns 用户信息
   */
  getCurrentUser: async (): Promise<User> => {
    const response = await api.get<User>('/auth/me');
    return response.data;
  },

  /**
   * 更新用户信息
   * @param userData 用户数据
   * @returns 更新后的用户信息
   */
  updateUser: async (userData: Partial<User>): Promise<User> => {
    const response = await api.put<User>('/auth/profile', userData);
    return response.data;
  },
};
