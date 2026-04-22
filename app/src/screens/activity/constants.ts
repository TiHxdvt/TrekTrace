/**
 * ActivityScreen 局部常量、类型映射、工具函数
 */

import type { ActivityType } from '../../types';

export type ActivityTypeLocal = 'running' | 'cycling' | 'hiking';
export type GpsStrength = 'none' | 'weak' | 'medium' | 'strong';

export const ACTIVITY_CYCLE: ActivityTypeLocal[] = ['hiking', 'running', 'cycling'];
export const PANEL_HEIGHT = 105;
export const LONG_PRESS_DURATION = 1500;
export const SUMMARY_REPLAY_DURATION = 3500;
export const MIN_RECORDING_DISTANCE = 20; // 米 — 低于此距离不保存记录

export const ACTIVITY_TYPE_MAP: Record<ActivityTypeLocal, ActivityType> = {
  hiking: 'HIKING',
  running: 'RUNNING',
  cycling: 'CYCLING',
};

/** Uniform sampling for share card SVG track */
export function samplePoints(
  coords: Array<{ latitude: number; longitude: number }>,
  maxCount: number,
) {
  if (coords.length <= maxCount) return coords;
  const step = (coords.length - 1) / (maxCount - 1);
  const result = [];
  for (let i = 0; i < maxCount; i++) {
    result.push(coords[Math.round(i * step)]);
  }
  return result;
}
