/**
 * API 客户端配置
 * 基于 axios 封装，支持请求/响应拦截器
 * Token 管理统一由 storageService 负责
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { storageService } from './storageService';
import { APP_CONFIG } from '../config';

// 内存 token 缓存，避免每次请求都读 Keychain
let _cachedToken: string | null = null;

/** 保存 token 到缓存 + 持久化存储 */
export async function saveToken(token: string): Promise<void> {
  _cachedToken = token;
  await storageService.saveToken(token);
}

/** 获取 token（优先缓存 → Keychain → AsyncStorage） */
export async function getToken(): Promise<string | null> {
  if (_cachedToken !== null) return _cachedToken;
  const token = await storageService.getToken();
  if (token) _cachedToken = token;
  return token;
}

/** 清除 token 缓存 + 持久化存储 */
export async function clearToken(): Promise<void> {
  _cachedToken = null;
  await storageService.removeToken();
}

// 创建 axios 实例
const api: AxiosInstance = axios.create({
  baseURL: APP_CONFIG.API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 自动添加 token
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const token = await getToken();
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    } catch (error) {
      console.error('Error adding auth token:', error);
      return config;
    }
  },
  (error: AxiosError) => Promise.reject(error),
);

// 响应拦截器 - 统一错误处理
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response) {
      const status = error.response.status;

      if (status === 401) {
        await storageService.clearAuthData();
        _cachedToken = null;
        console.warn('Token expired or invalid, please login again');
      }

      if (status === 403) {
        console.error('Access forbidden');
      }

      if (status >= 500) {
        console.error('Server error');
      }
    } else if (error.request) {
      console.error('Network error - no response received');
    } else {
      console.error('Request setup error:', error.message);
    }

    return Promise.reject(error);
  },
);

// 断网重试：POST 请求在无响应时重试一次
api.interceptors.response.use(undefined, async (error: AxiosError) => {
  const config = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
  if (!config) return Promise.reject(error);

  if (
    config.method?.toLowerCase() === 'post' &&
    !error.response &&
    !config._retry
  ) {
    config._retry = true;
    return new Promise((resolve) => {
      setTimeout(() => resolve(api.request(config)), 1000);
    });
  }

  return Promise.reject(error);
});

export default api;
