/**
 * 应用配置
 * 集中管理 API 地址、地图 key 等配置项
 * 生产环境应使用 react-native-config 从 .env 文件读取
 */

export const APP_CONFIG = {
  /** API 基础 URL */
  API_BASE_URL: 'http://172.16.96.62:8080/api',

  /** 高德地图 SDK Key */
  AMAP_API_KEY: '6518a83abe3771f3a920bf329cbdefb0',
} as const;
