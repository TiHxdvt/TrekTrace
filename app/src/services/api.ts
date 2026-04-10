/**
 * API 客户端配置
 * 基于 axios 封装，支持请求/响应拦截器
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { APP_CONFIG } from '../config';

// Module-level token cache to avoid async reads on every request
let _cachedToken: string | null = null;

/** Update the token cache (call on login / token refresh) */
export function setCachedToken(token: string | null): void {
  _cachedToken = token;
}

/** Retrieve the cached token, falling back to AsyncStorage */
async function getToken(): Promise<string | null> {
  if (_cachedToken !== null) return _cachedToken;
  try {
    const stored = await AsyncStorage.getItem('token');
    if (stored) _cachedToken = stored;
    return stored;
  } catch {
    return null;
  }
}

/** Clear the token cache (call on logout) */
export function clearCachedToken(): void {
  _cachedToken = null;
}

// 创建 axios 实例
const api: AxiosInstance = axios.create({
  baseURL: APP_CONFIG.API_BASE_URL,
  timeout: 10000, // 10 秒超时
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
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 统一错误处理
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    if (error.response) {
      const status = error.response.status;

      // 401 未授权 - 清除 token 并跳转到登录页
      if (status === 401) {
        clearCachedToken();
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('user');
        // 这里可以触发全局登出事件
        console.warn('Token expired or invalid, please login again');
      }

      // 403 禁止访问
      if (status === 403) {
        console.error('Access forbidden');
      }

      // 500 服务器错误
      if (status >= 500) {
        console.error('Server error');
      }
    } else if (error.request) {
      // 请求已发送但没有收到响应
      console.error('Network error - no response received');
    } else {
      // 请求配置出错
      console.error('Request setup error:', error.message);
    }

    return Promise.reject(error);
  }
);

// Retry interceptor - retry POST requests once after 1s on network errors (no response)
api.interceptors.response.use(undefined, async (error: AxiosError) => {
  const config = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
  if (!config) return Promise.reject(error);

  // Only retry POST requests that got no response (network error), once
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
