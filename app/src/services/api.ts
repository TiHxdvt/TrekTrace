/**
 * API 客户端配置
 * 基于 axios 封装，支持请求/响应拦截器
 * Token 管理统一由 storageService 负责
 * 支持 401 自动刷新 token
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { storageService } from './storageService';
import { APP_CONFIG } from '../config';

/** 认证过期事件，App 层可监听此事件触发登出导航 */
export const AUTH_EXPIRED_EVENT = 'auth_expired';

// 内存 token 缓存，避免每次请求都读 Keychain
let _cachedToken: string | null = null;
let _cachedRefreshToken: string | null = null;

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

/** 保存 refreshToken 到缓存 + 持久化存储 */
export async function saveRefreshToken(token: string): Promise<void> {
  _cachedRefreshToken = token;
  await storageService.saveRefreshToken(token);
}

/** 获取 refreshToken */
export async function getRefreshToken(): Promise<string | null> {
  if (_cachedRefreshToken !== null) return _cachedRefreshToken;
  const token = await storageService.getRefreshToken();
  if (token) _cachedRefreshToken = token;
  return token;
}

/** 清除 refreshToken */
export async function clearRefreshToken(): Promise<void> {
  _cachedRefreshToken = null;
  await storageService.removeRefreshToken();
}

// 创建 axios 实例
const api: AxiosInstance = axios.create({
  baseURL: APP_CONFIG.API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token 刷新状态管理
let _isRefreshing = false;
let _refreshSubscribers: Array<(token: string) => void> = [];

function onRefreshed(token: string) {
  _refreshSubscribers.forEach(cb => cb(token));
  _refreshSubscribers = [];
}

function addRefreshSubscriber(cb: (token: string) => void) {
  _refreshSubscribers.push(cb);
}

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

// 响应拦截器 - 401 自动刷新 token
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      if (_isRefreshing) {
        // 如果已经在刷新，排队等待新 token
        return new Promise((resolve) => {
          addRefreshSubscriber((newToken: string) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
            }
            resolve(api.request(originalRequest));
          });
        });
      }

      _isRefreshing = true;

      try {
        const refreshTokenValue = await getRefreshToken();

        if (!refreshTokenValue) {
          // 没有 refreshToken，直接登出
          await storageService.clearAuthData();
          _cachedToken = null;
          _cachedRefreshToken = null;
          _isRefreshing = false;
          return Promise.reject(error);
        }

        // 尝试刷新 token
        const response = await axios.post(`${APP_CONFIG.API_BASE_URL}/auth/refresh`, {
          refreshToken: refreshTokenValue,
        });

        const { token: newToken, refreshToken: newRefreshToken } = response.data;

        await saveToken(newToken);
        await saveRefreshToken(newRefreshToken);

        onRefreshed(newToken);
        _isRefreshing = false;

        // 重放原请求
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        }
        return api.request(originalRequest);
      } catch (refreshError) {
        // 刷新失败，清除认证数据
        _isRefreshing = false;
        _refreshSubscribers = [];
        await storageService.clearAuthData();
        _cachedToken = null;
        _cachedRefreshToken = null;
        // Notify app layer to navigate to login
        try {
          const { DeviceEventEmitter } = require('react-native');
          DeviceEventEmitter.emit(AUTH_EXPIRED_EVENT);
        } catch {}
        return Promise.reject(refreshError);
      }
    }

    if (error.response) {
      const status = error.response.status;

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
