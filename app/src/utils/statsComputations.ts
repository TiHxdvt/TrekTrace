/**
 * 统计计算引擎 — 纯函数，无 React 依赖
 * 提供活动数据的聚合、分组、汇总计算
 */

import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  differenceInCalendarDays,
  getDay,
  subWeeks,
  subMonths,
} from 'date-fns';
import type { ActivityType } from '../types';

export type { ActivityType };

// ==================== 类型定义 ====================

export interface DayActivities {
  dateKey: string; // 'YYYY-MM-DD'
  activities: ActivityItem[];
  totalDistance: number; // 米
  totalDuration: number; // 秒
  estimatedCalories: number;
  types: Set<ActivityType>;
}

export interface MonthSummary {
  year: number;
  month: number; // 1-12
  days: Map<string, DayActivities>;
  totalDistance: number;
  totalDuration: number;
  totalActivities: number;
  estimatedCalories: number;
  activeDays: number;
}

export interface WeekSummary {
  weekStart: Date;
  days: DayActivities[]; // 7 项，周日→周六
  totalDistance: number;
  totalDuration: number;
  totalActivities: number;
  estimatedCalories: number;
}

export interface YearSummary {
  year: number;
  months: (MonthSummary | null)[]; // 12 项
  totalDistance: number;
  totalDuration: number;
  totalActivities: number;
  estimatedCalories: number;
  activeDays: number;
}

export interface LifetimeStats {
  totalDistance: number;
  totalDuration: number;
  totalActivities: number;
  totalElevationGain: number;
  estimatedCalories: number;
  byType: Record<ActivityType, { count: number; distance: number; duration: number; calories: number }>;
  currentStreak: number;
  longestStreak: number;
}

// 活动数据项 — 从 ActivityResponseDTO 映射的最小字段集
export interface ActivityItem {
  id: number;
  type: ActivityType;
  startTime: string;
  endTime: string;
  duration: number; // 秒
  distance: number; // 米
  elevationGain: number; // 米
}

// ==================== MET 系数 ====================

const MET_VALUES: Record<ActivityType, number> = {
  HIKING: 6,
  RUNNING: 9.8,
  CYCLING: 8,
};

const DEFAULT_WEIGHT_KG = 70;

/**
 * 通过 MET 公式估算卡路里消耗
 * Calories = MET × 体重(kg) × 时长(h)
 */
export function estimateCalories(
  distance: number,
  duration: number,
  elevationGain: number,
  type: ActivityType,
  weightKg?: number,
): number {
  const weight = weightKg ?? DEFAULT_WEIGHT_KG;
  const met = MET_VALUES[type] ?? 6;
  const hours = duration / 3600;
  // 爬升额外消耗：每100m爬升约额外消耗
  const climbBonus = elevationGain > 0 ? (elevationGain / 100) * 1.5 * weight * hours : 0;
  return Math.round(met * weight * hours + climbBonus);
}

// ==================== 核心计算函数 ====================

/**
 * 按日期分组活动数据
 * 返回 Map<dateKey, DayActivities>
 */
export function groupByDay(activities: ActivityItem[]): Map<string, DayActivities> {
  const map = new Map<string, DayActivities>();

  for (const act of activities) {
    const dateKey = format(new Date(act.startTime), 'yyyy-MM-dd');
    let day = map.get(dateKey);
    if (!day) {
      day = {
        dateKey,
        activities: [],
        totalDistance: 0,
        totalDuration: 0,
        estimatedCalories: 0,
        types: new Set(),
      };
      map.set(dateKey, day);
    }
    day.activities.push(act);
    day.totalDistance += act.distance;
    day.totalDuration += act.duration;
    day.estimatedCalories += estimateCalories(act.distance, act.duration, act.elevationGain, act.type);
    day.types.add(act.type);
  }

  return map;
}

/**
 * 计算指定月份汇总
 */
export function computeMonthSummary(
  year: number,
  month: number, // 1-12
  activities: ActivityItem[],
): MonthSummary {
  const monthDate = new Date(year, month - 1, 1);
  const start = startOfMonth(monthDate);
  const end = endOfMonth(monthDate);

  // 过滤当月活动
  const monthActivities = activities.filter(a => {
    const d = new Date(a.startTime);
    return d >= start && d <= end;
  });

  const days = groupByDay(monthActivities);

  let totalDistance = 0;
  let totalDuration = 0;
  let totalActivities = 0;
  let estimatedCalories = 0;

  for (const day of days.values()) {
    totalDistance += day.totalDistance;
    totalDuration += day.totalDuration;
    totalActivities += day.activities.length;
    estimatedCalories += day.estimatedCalories;
  }

  return {
    year,
    month,
    days,
    totalDistance,
    totalDuration,
    totalActivities,
    estimatedCalories,
    activeDays: days.size,
  };
}

/**
 * 计算指定日期所在周汇总（周一为一周开始）
 */
export function computeWeekSummary(
  date: Date,
  activities: ActivityItem[],
): WeekSummary {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
  const allDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const allActivitiesMap = groupByDay(activities);

  const days: DayActivities[] = allDays.map(d => {
    const key = format(d, 'yyyy-MM-dd');
    return allActivitiesMap.get(key) ?? {
      dateKey: key,
      activities: [],
      totalDistance: 0,
      totalDuration: 0,
      estimatedCalories: 0,
      types: new Set(),
    };
  });

  let totalDistance = 0;
  let totalDuration = 0;
  let totalActivities = 0;
  let estimatedCalories = 0;

  for (const day of days) {
    totalDistance += day.totalDistance;
    totalDuration += day.totalDuration;
    totalActivities += day.activities.length;
    estimatedCalories += day.estimatedCalories;
  }

  return {
    weekStart,
    days,
    totalDistance,
    totalDuration,
    totalActivities,
    estimatedCalories,
  };
}

/**
 * 计算指定年份汇总
 */
export function computeYearSummary(
  year: number,
  activities: ActivityItem[],
): YearSummary {
  const months: (MonthSummary | null)[] = [];
  let totalDistance = 0;
  let totalDuration = 0;
  let totalActivities = 0;
  let estimatedCalories = 0;
  let activeDays = 0;

  for (let m = 1; m <= 12; m++) {
    const summary = computeMonthSummary(year, m, activities);
    if (summary.totalActivities > 0) {
      months.push(summary);
      totalDistance += summary.totalDistance;
      totalDuration += summary.totalDuration;
      totalActivities += summary.totalActivities;
      estimatedCalories += summary.estimatedCalories;
      activeDays += summary.activeDays;
    } else {
      months.push(null);
    }
  }

  return { year, months, totalDistance, totalDuration, totalActivities, estimatedCalories, activeDays };
}

/**
 * 计算全时段汇总
 */
export function computeLifetimeStats(activities: ActivityItem[]): LifetimeStats {
  const byType: LifetimeStats['byType'] = {
    HIKING: { count: 0, distance: 0, duration: 0, calories: 0 },
    RUNNING: { count: 0, distance: 0, duration: 0, calories: 0 },
    CYCLING: { count: 0, distance: 0, duration: 0, calories: 0 },
  };

  let totalDistance = 0;
  let totalDuration = 0;
  let totalElevationGain = 0;
  let estimatedCalories = 0;

  for (const act of activities) {
    const t = act.type;
    const cal = estimateCalories(act.distance, act.duration, act.elevationGain, t);

    totalDistance += act.distance;
    totalDuration += act.duration;
    totalElevationGain += act.elevationGain;
    estimatedCalories += cal;

    if (byType[t]) {
      byType[t].count += 1;
      byType[t].distance += act.distance;
      byType[t].duration += act.duration;
      byType[t].calories += cal;
    }
  }

  const { current, longest } = computeStreak(activities);

  return {
    totalDistance,
    totalDuration,
    totalActivities: activities.length,
    totalElevationGain,
    estimatedCalories,
    byType,
    currentStreak: current,
    longestStreak: longest,
  };
}

/**
 * 计算连续打卡天数
 * 返回当前连续天数和最长连续天数
 */
export function computeStreak(activities: ActivityItem[]): { current: number; longest: number } {
  if (activities.length === 0) return { current: 0, longest: 0 };

  // 提取所有有活动的日期（去重）
  const dateSet = new Set<string>();
  for (const a of activities) {
    dateSet.add(format(new Date(a.startTime), 'yyyy-MM-dd'));
  }

  const sortedDates = Array.from(dateSet).sort();
  if (sortedDates.length === 0) return { current: 0, longest: 0 };

  // 计算最长连续
  let longest = 1;
  let streak = 1;
  for (let i = 1; i < sortedDates.length; i++) {
    const diff = differenceInCalendarDays(
      new Date(sortedDates[i]),
      new Date(sortedDates[i - 1]),
    );
    if (diff === 1) {
      streak += 1;
      longest = Math.max(longest, streak);
    } else {
      streak = 1;
    }
  }

  // 计算当前连续（从今天/昨天往前算）
  const today = format(new Date(), 'yyyy-MM-dd');
  const yesterday = format(new Date(Date.now() - 86400000), 'yyyy-MM-dd');
  let current = 0;

  // 当前连续必须包含今天或昨天
  if (dateSet.has(today) || dateSet.has(yesterday)) {
    const startDate = dateSet.has(today) ? today : yesterday;
    const startIdx = sortedDates.indexOf(startDate);
    if (startIdx >= 0) {
      current = 1;
      for (let i = startIdx - 1; i >= 0; i--) {
        const diff = differenceInCalendarDays(
          new Date(sortedDates[i + 1]),
          new Date(sortedDates[i]),
        );
        if (diff === 1) {
          current += 1;
        } else {
          break;
        }
      }
    }
  }

  return { current, longest };
}

/**
 * 获取指定日期的活动数据
 */
export function getDayActivities(
  date: Date,
  allActivities: ActivityItem[],
): DayActivities {
  const dateKey = format(date, 'yyyy-MM-dd');
  const dayActs = allActivities.filter(a =>
    format(new Date(a.startTime), 'yyyy-MM-dd') === dateKey,
  );

  if (dayActs.length === 0) {
    return { dateKey, activities: [], totalDistance: 0, totalDuration: 0, estimatedCalories: 0, types: new Set() };
  }

  const grouped = groupByDay(dayActs);
  return grouped.get(dateKey) ?? {
    dateKey,
    activities: [],
    totalDistance: 0,
    totalDuration: 0,
    estimatedCalories: 0,
    types: new Set(),
  };
}

/**
 * 计算上周（基于 selectedDate 的前一周）汇总
 */
export function computePreviousWeekSummary(
  selectedDate: Date,
  activities: ActivityItem[],
): WeekSummary {
  const prevWeekDate = subWeeks(selectedDate, 1);
  return computeWeekSummary(prevWeekDate, activities);
}

/**
 * 计算上月（基于 selectedDate 的前一月）汇总
 */
export function computePreviousMonthSummary(
  selectedDate: Date,
  activities: ActivityItem[],
): MonthSummary {
  const prevMonthDate = subMonths(selectedDate, 1);
  return computeMonthSummary(prevMonthDate.getFullYear(), prevMonthDate.getMonth() + 1, activities);
}
