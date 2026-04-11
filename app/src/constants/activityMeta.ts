/**
 * 活动类型元信息
 * 统一管理类型标签、图标映射
 */

import { IconBonfire, IconRunning, IconBicycle } from '../components/SolarIcons';
import type { ActivityType } from '../types';

export interface ActivityTypeMeta {
  label: string;
  icon: React.FC<{ size?: number; color?: string }>;
}

export const ACTIVITY_TYPE_META: Record<ActivityType, ActivityTypeMeta> = {
  HIKING: { label: '徒步', icon: IconBonfire },
  RUNNING: { label: '跑步', icon: IconRunning },
  CYCLING: { label: '骑行', icon: IconBicycle },
};

export const ACTIVITY_TYPES: ActivityType[] = ['HIKING', 'RUNNING', 'CYCLING'];
