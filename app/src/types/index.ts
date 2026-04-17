/**
 * 途迹 TrekTrace - TypeScript 类型定义
 */

// 用户类型
export interface User {
  id: number;
  account: number;
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

// 密码登录请求
export interface PasswordLoginRequest {
  phone: string;
  password: string;
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

// ========== 轨迹记录相关类型 ==========

// 记录会话状态
export type RecordingStatus = 'idle' | 'recording' | 'paused' | 'stopped';

export interface RecordingSession {
  id: string;
  activityType: ActivityType;
  startTime: string;
  endTime?: string;
  status: RecordingStatus;
  totalDistance: number; // 米
  totalDuration: number; // 秒
  elevationGain: number; // 米
  segments: TrackSegment[];
  uploadedToServer: boolean;
}

// 按暂停分段的轨迹段
export interface TrackSegment {
  id: string;
  points: ProcessedPoint[];
  startTime: string;
  endTime?: string;
}

// 经过过滤处理后的轨迹点
export interface ProcessedPoint {
  latitude: number;   // WGS-84 原始坐标（用于距离计算和上传）
  longitude: number;
  altitude: number;
  timestamp: string;
  speed?: number;
  gcjLatitude: number;  // GCJ-02 坐标（高德地图显示用，存储时一次性转换）
  gcjLongitude: number;
}

// 原始 GPS 数据
export interface RawLocationPoint {
  latitude: number;
  longitude: number;
  altitude: number;
  accuracy: number;
  speed: number;
  heading: number;
  timestamp: number;
}

// 实时统计数据
export interface RecordingStats {
  distance: number; // 米
  duration: number; // 秒
  currentPace: number; // 秒/公里
  elevationGain: number; // 米
  currentSpeed: number; // m/s
}

// 活动上传请求
export interface ActivityUploadRequest {
  type: string;
  startTime: string;
  endTime: string;
  duration: number;
  distance: number;
  elevationGain: number;
  trackPoints: TrackPointUploadDTO[];
}

export interface TrackPointUploadDTO {
  latitude: number;
  longitude: number;
  altitude: number;
  speed: number;
  timestamp: string;
}

// 活动响应
export interface ActivityResponseDTO {
  id: number;
  type: string;
  startTime: string;
  endTime: string;
  duration: number;
  distance: number;
  elevationGain: number;
  status: string;
  createdAt: string;
}

// ========== 聊天相关类型 ==========

export interface Conversation {
  id: number;
  type: string;
  name?: string;
  otherUser?: {
    userId: number;
    nickname?: string;
    avatarUrl?: string;
  };
  lastMessage?: {
    content: string;
    createdAt: string;
  };
  unreadCount: number;
}

export interface ChatMessage {
  id: number;
  conversationId: number;
  senderId: number;
  senderNickname?: string;
  senderAvatarUrl?: string;
  content: string;
  type: string;
  createdAt: string;
}
