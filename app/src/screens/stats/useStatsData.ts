/**
 * useStatsData — StatsScreen 的状态管理和数据加载逻辑
 * 从 StatsScreen 抽取，UI 组件仅消费返回值
 *
 * 统计概览数据从后端 API 获取，图表的逐日数据仍从本地活动列表计算
 */

import { useState, useMemo, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { format, startOfWeek, addDays } from 'date-fns';

import { activityService } from '../../services/activityService';
import { statsService } from '../../services/statsService';
import type { StatsSummaryResponse, TimePeriodSummary } from '../../services/statsService';
import {
  computeLifetimeStats,
  computeMonthSummary,
  computeWeekSummary,
  computeYearSummary,
  computePreviousWeekSummary,
  computePreviousMonthSummary,
  groupByDay,
} from '../../utils/statsComputations';
import type { ActivityItem, ActivityType, WeekSummary, MonthSummary, YearSummary } from '../../utils/statsComputations';

import { type ViewMode } from '../../components/stats/StatsTabSelector';
import { type TypeFilter } from '../../components/stats/StatsTypeFilter';

import type { ActivityResponseDTO } from '../../types';

function toActivityItem(dto: ActivityResponseDTO): ActivityItem {
  return {
    id: dto.id,
    type: dto.type as ActivityItem['type'],
    startTime: dto.startTime,
    endTime: dto.endTime,
    duration: dto.duration,
    distance: dto.distance,
    elevationGain: dto.elevationGain,
  };
}

export function useStatsData() {
  const [activities, setActivities] = useState<ActivityResponseDTO[]>([]);
  const [serverStats, setServerStats] = useState<StatsSummaryResponse | null>(null);
  const [weekStats, setWeekStats] = useState<TimePeriodSummary | null>(null);
  const [monthStats, setMonthStats] = useState<TimePeriodSummary | null>(null);
  const [yearStats, setYearStats] = useState<TimePeriodSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoaded = useRef(false);

  const [viewMode, setViewModeState] = useState<ViewMode>('week');
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');
  const [selectedActivity, setSelectedActivity] = useState<ActivityResponseDTO | null>(null);

  // 加载概览统计数据（从后端 API）
  const loadPeriodStats = useCallback(async (mode: ViewMode, date: Date) => {
    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      if (mode === 'week') {
        const data = await statsService.getWeekSummary(dateStr);
        setWeekStats(data);
      } else if (mode === 'month') {
        const data = await statsService.getMonthSummary(date.getFullYear(), date.getMonth() + 1);
        setMonthStats(data);
      } else if (mode === 'year') {
        const data = await statsService.getYearSummary(date.getFullYear());
        setYearStats(data);
      }
    } catch {
      // 静默失败，本地计算的摘要会作为 fallback
    }
  }, []);

  // 初次加载
  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        const isFirst = !hasLoaded.current;
        try {
          if (isFirst) setLoading(true);
          setError(null);
          const [data, stats] = await Promise.all([
            activityService.getActivities(),
            statsService.getSummary(),
          ]);
          setActivities(data);
          setServerStats(stats);
          hasLoaded.current = true;

          // 加载当前视图的统计
          await loadPeriodStats('week', new Date());
        } catch {
          if (isFirst) setError('加载失败，请重试');
        } finally {
          if (isFirst) setLoading(false);
        }
      };
      load();
    }, []),
  );

  const activityItems = useMemo(() => activities.map(toActivityItem), [activities]);
  const dayMap = useMemo(() => groupByDay(activityItems), [activityItems]);
  const lifetimeStats = useMemo(() => computeLifetimeStats(activityItems), [activityItems]);

  // ---- 按 typeFilter 过滤活动（图表数据） ----
  const filteredItems = useMemo(() => {
    if (typeFilter === 'ALL') return activityItems;
    return activityItems.filter(a => a.type === typeFilter);
  }, [activityItems, typeFilter]);

  const filteredDayMap = useMemo(() => groupByDay(filteredItems), [filteredItems]);

  // ---- 计算当前视图数据（基于筛选后，用于图表渲染） ----
  const weekSummary = useMemo(() => computeWeekSummary(selectedDate, filteredItems), [selectedDate, filteredItems]);
  const monthSummary = useMemo(() => {
    return computeMonthSummary(selectedDate.getFullYear(), selectedDate.getMonth() + 1, filteredItems);
  }, [selectedDate, filteredItems]);
  const yearSummary = useMemo(() => computeYearSummary(selectedDate.getFullYear(), filteredItems), [selectedDate, filteredItems]);

  // ---- 趋势对比（前一周/前一月） ----
  const prevWeekSummary = useMemo(() => computePreviousWeekSummary(selectedDate, filteredItems), [selectedDate, filteredItems]);
  const prevMonthSummary = useMemo(() => computePreviousMonthSummary(selectedDate, filteredItems), [selectedDate, filteredItems]);

  // ---- 后端统计概览（优先使用后端数据） ----
  const currentWeekStats = useMemo(() => {
    if (!weekStats) return null;
    // 如果有 typeFilter，需要从本地重新过滤计算
    if (typeFilter !== 'ALL') return null;
    return weekStats;
  }, [weekStats, typeFilter]);

  const currentMonthStats = useMemo(() => {
    if (!monthStats) return null;
    if (typeFilter !== 'ALL') return null;
    return monthStats;
  }, [monthStats, typeFilter]);

  const currentYearStats = useMemo(() => {
    if (!yearStats) return null;
    if (typeFilter !== 'ALL') return null;
    return yearStats;
  }, [yearStats, typeFilter]);

  // ---- 可用类型（基于未筛选的全量数据，避免筛选后消失） ----
  const availableTypes = useMemo(() => {
    const types = new Set<ActivityType>();
    const unfilteredWeek = computeWeekSummary(selectedDate, activityItems);
    const unfilteredMonth = computeMonthSummary(selectedDate.getFullYear(), selectedDate.getMonth() + 1, activityItems);
    const unfilteredYear = computeYearSummary(selectedDate.getFullYear(), activityItems);

    if (viewMode === 'week') {
      unfilteredWeek.days.forEach(d => d.types.forEach(t => types.add(t)));
    } else if (viewMode === 'month') {
      unfilteredMonth.days.forEach(d => d.types.forEach(t => types.add(t)));
    } else if (viewMode === 'year') {
      unfilteredYear.months.forEach(ms => {
        if (ms) ms.days.forEach(d => d.types.forEach(t => types.add(t)));
      });
    }
    return Array.from(types);
  }, [viewMode, selectedDate, activityItems]);

  // ---- 时间范围 hasData 检测 ----
  const hasDataForWeek = useCallback((date: Date) => {
    const ws = startOfWeek(date, { weekStartsOn: 1 });
    for (let i = 0; i < 7; i++) {
      const key = format(addDays(ws, i), 'yyyy-MM-dd');
      if (dayMap.has(key)) return true;
    }
    return false;
  }, [dayMap]);

  const hasDataForMonth = useCallback((date: Date) => {
    const key = format(date, 'yyyy-MM');
    for (const [k] of dayMap) {
      if (k.startsWith(key)) return true;
    }
    return false;
  }, [dayMap]);

  const hasDataForYear = useCallback((date: Date) => {
    const yr = date.getFullYear().toString();
    for (const [k] of dayMap) {
      if (k.startsWith(yr)) return true;
    }
    return false;
  }, [dayMap]);

  const getHasData = useCallback((date: Date) => {
    if (viewMode === 'week') return hasDataForWeek(date);
    if (viewMode === 'month') return hasDataForMonth(date);
    if (viewMode === 'year') return hasDataForYear(date);
    return false;
  }, [viewMode, hasDataForWeek, hasDataForMonth, hasDataForYear]);

  // ---- 总视图日期范围 ----
  const totalRangeLabel = useMemo(() => {
    if (activityItems.length === 0) return '暂无数据';
    const sorted = [...activityItems].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    const first = format(new Date(sorted[0].startTime), 'yyyy年M月d日');
    const last = format(new Date(), 'yyyy年M月d日');
    return `${first} - ${last}`;
  }, [activityItems]);

  const isEmpty = !loading && !error && activities.length === 0;

  const handleModeChange = useCallback((mode: ViewMode) => {
    setViewModeState(mode);
    setTypeFilter('ALL');
    loadPeriodStats(mode, selectedDate);
  }, [selectedDate, loadPeriodStats]);

  const handleDateChange = useCallback((date: Date) => {
    setSelectedDate(date);
    loadPeriodStats(viewMode, date);
  }, [viewMode, loadPeriodStats]);

  const handleCloseSheet = useCallback(() => setSelectedActivity(null), []);

  return {
    // Data
    activities,
    serverStats,
    loading,
    error,
    isEmpty,
    // View state
    viewMode,
    selectedDate,
    typeFilter,
    selectedActivity,
    // Computed summaries (from local data for charts)
    weekSummary,
    monthSummary,
    yearSummary,
    lifetimeStats,
    prevWeekSummary,
    prevMonthSummary,
    // Backend API summaries (for inline display)
    currentWeekStats,
    currentMonthStats,
    currentYearStats,
    filteredDayMap,
    availableTypes,
    totalRangeLabel,
    // Navigation helpers
    getHasData,
    // Setters
    setViewMode: handleModeChange,
    setSelectedDate: handleDateChange,
    setTypeFilter,
    setSelectedActivity,
    handleCloseSheet,
  };
}
