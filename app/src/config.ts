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
    : `http://${PROD_HOST}:${PORT}/api`,

  /** WebSocket 基础 URL */
  WS_BASE_URL: __DEV__
    ? `http://localhost:${PORT}/ws`
    : `http://${PROD_HOST}:${PORT}/ws`,

  /** 高德地图 SDK Key */
  AMAP_API_KEY: '6518a83abe3771f3a920bf329cbdefb0',
} as const;
