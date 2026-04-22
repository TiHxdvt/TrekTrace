/**
 * 本地存储服务
 * 封装 AsyncStorage + Keychain，提供类型安全的存储接口
 * Token 使用 Keychain 安全存储，其他数据使用 AsyncStorage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import { User, ActivityResponseDTO } from '../types';

export interface AppSettings {
  theme?: 'light' | 'dark';
  [key: string]: string | boolean | number | undefined;
}

// 存储 key 常量
const STORAGE_KEYS = {
  TOKEN: 'token',
  USER: 'user',
  ACTIVITIES_CACHE: 'activities_cache',
  CACHE_TIMESTAMP: 'activities_cache_timestamp',
  SETTINGS: 'settings',
} as const;

const KEYCHAIN_SERVICE = 'com.trektrace.auth';
const KEYCHAIN_REFRESH_SERVICE = 'com.trektrace.refresh';

// 轻量认证事件系统
type AuthListener = () => void;
const authListeners = new Set<AuthListener>();

export const authServiceEvents = {
  subscribe: (listener: AuthListener) => {
    authListeners.add(listener);
    return () => { authListeners.delete(listener); };
  },
  notify: () => {
    authListeners.forEach(fn => fn());
  },
};

export const storageService = {
  /**
   * 保存 JWT token — 使用 Keychain 安全存储
   */
  saveToken: async (token: string): Promise<void> => {
    await Keychain.setGenericPassword('trektrace_token', token, {
      service: KEYCHAIN_SERVICE,
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  },

  /**
   * 获取 JWT token — 从 Keychain 读取
   */
  getToken: async (): Promise<string | null> => {
    try {
      const result = await Keychain.getGenericPassword({ service: KEYCHAIN_SERVICE });
      return result ? result.password : null;
    } catch {
      // Fallback to AsyncStorage if Keychain fails (e.g. simulator without keychain)
      return await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
    }
  },

  /**
   * 删除 JWT token
   */
  removeToken: async (): Promise<void> => {
    try {
      await Keychain.resetGenericPassword({ service: KEYCHAIN_SERVICE });
    } catch {
      // No-op: token may not exist in Keychain
    }
    // Also clear AsyncStorage fallback to prevent stale tokens
    await AsyncStorage.removeItem(STORAGE_KEYS.TOKEN);
  },

  // Refresh token storage
  saveRefreshToken: async (token: string): Promise<void> => {
    await Keychain.setGenericPassword('trektrace_refresh', token, {
      service: KEYCHAIN_REFRESH_SERVICE,
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  },

  getRefreshToken: async (): Promise<string | null> => {
    try {
      const result = await Keychain.getGenericPassword({ service: KEYCHAIN_REFRESH_SERVICE });
      return result ? result.password : null;
    } catch {
      return null;
    }
  },

  removeRefreshToken: async (): Promise<void> => {
    try {
      await Keychain.resetGenericPassword({ service: KEYCHAIN_REFRESH_SERVICE });
    } catch {
      // No-op
    }
  },

  /**
   * 保存用户信息
   */
  saveUser: async (user: User): Promise<void> => {
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  },

  /**
   * 获取用户信息
   */
  getUser: async (): Promise<User | null> => {
    try {
      const userStr = await AsyncStorage.getItem(STORAGE_KEYS.USER);
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('Error getting user from storage:', error);
      return null;
    }
  },

  /**
   * 删除用户信息
   */
  removeUser: async (): Promise<void> => {
    await AsyncStorage.removeItem(STORAGE_KEYS.USER);
  },

  /**
   * 清除所有登录相关信息（登出时调用）
   */
  clearAuthData: async (): Promise<void> => {
    await Promise.all([
      Keychain.resetGenericPassword({ service: KEYCHAIN_SERVICE }).catch(() => {}),
      Keychain.resetGenericPassword({ service: KEYCHAIN_REFRESH_SERVICE }).catch(() => {}),
      AsyncStorage.removeItem(STORAGE_KEYS.USER),
    ]);
    authServiceEvents.notify();
  },

  /**
   * 检查是否已登录
   */
  isAuthenticated: async (): Promise<boolean> => {
    const token = await storageService.getToken();
    return token !== null;
  },

  /**
   * 保存活动缓存（离线使用）
   */
  saveActivitiesCache: async (activities: ActivityResponseDTO[]): Promise<void> => {
    await AsyncStorage.setItem(
      STORAGE_KEYS.ACTIVITIES_CACHE,
      JSON.stringify(activities)
    );
  },

  /**
   * 获取活动缓存
   */
  getActivitiesCache: async (): Promise<ActivityResponseDTO[] | null> => {
    try {
      const cacheStr = await AsyncStorage.getItem(STORAGE_KEYS.ACTIVITIES_CACHE);
      return cacheStr ? JSON.parse(cacheStr) : null;
    } catch (error) {
      console.error('Error getting activities cache:', error);
      return null;
    }
  },

  /**
   * 保存活动缓存 + 时间戳
   */
  saveActivitiesCacheWithTimestamp: async (activities: ActivityResponseDTO[]): Promise<void> => {
    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEYS.ACTIVITIES_CACHE, JSON.stringify(activities)),
      AsyncStorage.setItem(STORAGE_KEYS.CACHE_TIMESTAMP, String(Date.now())),
    ]);
  },

  /**
   * 获取缓存时间戳（ms），null 表示无缓存
   */
  getCacheTimestamp: async (): Promise<number | null> => {
    try {
      const ts = await AsyncStorage.getItem(STORAGE_KEYS.CACHE_TIMESTAMP);
      return ts ? Number(ts) : null;
    } catch {
      return null;
    }
  },

  /**
   * 清除活动缓存和时间戳
   */
  clearActivitiesCache: async (): Promise<void> => {
    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEYS.ACTIVITIES_CACHE),
      AsyncStorage.removeItem(STORAGE_KEYS.CACHE_TIMESTAMP),
    ]);
  },

  /**
   * 保存设置
   */
  saveSettings: async (settings: AppSettings): Promise<void> => {
    await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  },

  /**
   * 获取设置
   */
  getSettings: async (): Promise<AppSettings | null> => {
    try {
      const settingsStr = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
      return settingsStr ? JSON.parse(settingsStr) : null;
    } catch (error) {
      console.error('Error getting settings:', error);
      return null;
    }
  },

  /**
   * 清除所有数据
   */
  clearAll: async (): Promise<void> => {
    await Promise.all([
      Keychain.resetGenericPassword({ service: KEYCHAIN_SERVICE }).catch(() => {}),
      Keychain.resetGenericPassword({ service: KEYCHAIN_REFRESH_SERVICE }).catch(() => {}),
      AsyncStorage.clear(),
    ]);
  },
};
