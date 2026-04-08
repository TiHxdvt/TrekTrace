/**
 * API 客户端配置
 * 基于 axios 封装，支持请求/响应拦截器
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// API 基础 URL（真机测试使用局域网 IP）
const API_BASE_URL = 'http://172.16.96.63:8080/api';

// 创建 axios 实例
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // 10 秒超时
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 自动添加 token
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const token = await AsyncStorage.getItem('token');
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

export default api;
