/**
 * 应用配置
 * 集中管理 API 地址、WebSocket 地址、地图 key 等配置项
 * 所有 URL 统一在此文件管理，其他文件通过 APP_CONFIG 引用
 */

const PROD_HOST = '139.155.152.218';
const PORT = 8080;

export const APP_CONFIG = {
  /** API 基础 URL */
  API_BASE_URL: __DEV__
    ? `http://localhost:${PORT}/api`
    : `https://${PROD_HOST}/api`,

  /** WebSocket 基础 URL */
  WS_BASE_URL: __DEV__
    ? `http://localhost:${PORT}/ws`
    : `wss://${PROD_HOST}/ws`,

  /** 高德地图 SDK Key (set via env or native build config) */
  AMAP_API_KEY: (typeof process !== 'undefined' && process.env?.AMAP_API_KEY) || '',

  /** 和风天气 API Key (set via env or leave empty to disable) */
  QWEATHER_API_KEY: (typeof process !== 'undefined' && process.env?.QWEATHER_API_KEY) || '',
} as const;
