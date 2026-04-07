/**
 * 途迹 TrekTrace - TypeScript 类型定义
 */

// 用户类型
export interface User {
  id: number;
  phone: string;
  nickname?: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt?: string;
}

// 运动活动类型
export interface Activity {
  id: number;
  userId: number;
  type: ActivityType;
  startTime: string;
  endTime?: string;
  duration?: number; // 秒
  distance?: number; // 米
  elevationGain?: number; // 爬升（米）
  status: ActivityStatus;
  createdAt?: string;
}

// 运动类型枚举
export type ActivityType = 'HIKING' | 'RUNNING' | 'CYCLING';

// 活动状态枚举
export type ActivityStatus = 'ONGOING' | 'PAUSED' | 'COMPLETED';

// 轨迹点类型
export interface TrackPoint {
  latitude: number;
  longitude: number;
  altitude?: number;
  timestamp: string;
  speed?: number; // m/s
}

// API 响应类型
export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  success: boolean;
}

// 登录请求
export interface LoginRequest {
  phone: string;
  code: string;
}

// 登录响应
export interface LoginResponse {
  token: string;
  user: User;
}

// 发送验证码请求
export interface SendCodeRequest {
  phone: string;
}

// 活动列表查询参数
export interface ActivityListParams {
  page?: number;
  size?: number;
  type?: ActivityType;
}

// 分页响应
export interface PaginatedResponse<T> {
  activities: T[];
  total: number;
  page: number;
  size: number;
}

// 统计数据
export interface StatsSummary {
  totalDistance: number; // 总距离（米）
  totalDuration: number; // 总时长（秒）
  totalActivities: number; // 总活动数
  totalElevationGain: number; // 总爬升（米）
  byType?: {
    [key in ActivityType]: {
      count: number;
      distance: number;
      duration: number;
    };
  };
}

// 位置坐标
export interface Coordinate {
  latitude: number;
  longitude: number;
}

// 轨迹数据（用于绘制地图）
export interface TrackData {
  coordinates: Coordinate[];
  startTime: string;
  endTime?: string;
  distance: number;
  duration: number;
}
