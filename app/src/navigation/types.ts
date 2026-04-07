/**
 * 导航类型定义
 */

import { ActivityType } from '../types';

// 认证栈导航参数
export type AuthStackParamList = {
  Login: undefined;
};

// 主 Tab 导航参数
export type MainTabParamList = {
  ActivityTab: undefined;
  HistoryTab: undefined;
  StatsTab: undefined;
  ProfileTab: undefined;
};

// 活动详情导航参数
export type ActivityDetailParamList = {
  ActivityDetail: { activityId: number };
};

// Root Stack 参数
export type RootStackParamList = {
  Main: undefined;
  Auth: undefined;
};
