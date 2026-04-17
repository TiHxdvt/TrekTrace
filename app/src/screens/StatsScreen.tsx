/**
 * 数据统计页面
 * 周/月/年/总视图 + 时间范围选择 + 数据图表
 */

import React, { useState, useMemo, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { format, startOfWeek, addDays } from 'date-fns';
import { TYPOGRAPHY, SPACING } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import { FullScreenBlur } from '../components/FullScreenBlur';
import { ActivityDetailSheet } from '../components/ActivityDetailSheet';
import { IconChart } from '../components/SolarIcons';
import { activityService } from '../services/activityService';
import {
  computeLifetimeStats,
  computeMonthSummary,
  computeWeekSummary,
  computeYearSummary,
  groupByDay,
} from '../utils/statsComputations';
import type { ActivityItem, ActivityType, WeekSummary, MonthSummary, YearSummary } from '../utils/statsComputations';

import { StatsTabSelector, type ViewMode } from '../components/stats/StatsTabSelector';
import { StatsTimeRange } from '../components/stats/StatsTimeRange';
import { DataChart, niceScale } from '../components/stats/StatsChart';
import { StatsTypeFilter, type TypeFilter } from '../components/stats/StatsTypeFilter';
import { StatsSummary } from '../components/stats/StatsSummary';

import type { ActivityResponseDTO } from '../types';

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

export const StatsScreen: React.FC = () => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [activities, setActivities] = useState<ActivityResponseDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoaded = useRef(false);

  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');
  const [selectedActivity, setSelectedActivity] = useState<ActivityResponseDTO | null>(null);

  const dynamicStyles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.BACKGROUND,
    },
    glowOrb: {
      position: 'absolute',
      top: -40,
      right: '20%',
      width: 250,
      height: 250,
      borderRadius: 125,
      backgroundColor: colors.GRADIENT.BLUE_LIGHT,
    },
    headerTitle: {
      fontSize: TYPOGRAPHY.FONT_SIZE.XXXL,
      fontWeight: '600',
      color: colors.TEXT.PRIMARY,
      letterSpacing: -0.5,
    },
    loadingText: {
      fontSize: TYPOGRAPHY.FONT_SIZE.SM,
      color: colors.TEXT.QUATERNARY,
    },
    iconWrap: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.OVERLAY.LIGHT,
      borderWidth: 1,
      borderColor: colors.BORDER.LIGHT,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: SPACING.XXL,
    },
    emptyTitle: {
      fontSize: TYPOGRAPHY.FONT_SIZE.XL,
      fontWeight: '600',
      color: colors.TEXT.SECONDARY,
      marginBottom: SPACING.SM,
    },
    emptySubtitle: {
      fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
      color: colors.TEXT.QUATERNARY,
    },
  }), [colors]);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        const isFirst = !hasLoaded.current;
        try {
          if (isFirst) setLoading(true);
          setError(null);
          const data = await activityService.getActivities();
          setActivities(data);
          hasLoaded.current = true;
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

  // ---- 计算当前视图数据（基于筛选后） ----
  const weekSummary = useMemo(() => computeWeekSummary(selectedDate, filteredItems), [selectedDate, filteredItems]);
  const monthSummary = useMemo(() => {
    return computeMonthSummary(selectedDate.getFullYear(), selectedDate.getMonth() + 1, filteredItems);
  }, [selectedDate, filteredItems]);
  const yearSummary = useMemo(() => computeYearSummary(selectedDate.getFullYear(), filteredItems), [selectedDate, filteredItems]);

  // ---- 可用类型（基于未筛选的全量数据，避免筛选后消失） ----
  const availableTypes = useMemo(() => {
    const types = new Set<ActivityType>();
    // 用全量 activityItems 计算当前时段有哪些类型
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

  // ---- 图表数据 ----

  const weekXLabels = ['一', '二', '三', '四', '五', '六', '日'];

  const weekCalData = useMemo(() =>
    weekSummary.days.map(d => Math.round(d.estimatedCalories)),
    [weekSummary],
  );
  const weekDistValues = useMemo(() =>
    weekSummary.days.map(d => Math.round(d.totalDistance / 100) / 10),
    [weekSummary],
  );
  const weekCalTicks = useMemo(() => niceScale(Math.max(...weekCalData, 0)).ticks, [weekCalData]);
  const weekDistTicks = useMemo(() => niceScale(Math.max(...weekDistValues, 0)).ticks, [weekDistValues]);

  // 月图表：X 轴标签为均匀分布的日期（如 4/1 4/7 4/13 4/19 4/25 4/30）
  const monthXLabels = useMemo(() => {
    const daysInMonth = new Date(monthSummary.year, monthSummary.month, 0).getDate();
    const step = Math.ceil(daysInMonth / 5);
    const m = monthSummary.month;
    const labels: string[] = [];
    for (let d = 1; d <= daysInMonth; d += step) {
      labels.push(`${m}/${d}`);
    }
    const lastLabel = `${m}/${daysInMonth}`;
    if (labels[labels.length - 1] !== lastLabel) labels.push(lastLabel);
    return labels;
  }, [monthSummary]);

  const monthCalData = useMemo(() => {
    const y = monthSummary.year;
    const m = monthSummary.month;
    const daysInMonth = new Date(y, m, 0).getDate();
    const values: number[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayData = filteredDayMap.get(key);
      values.push(dayData ? dayData.estimatedCalories : 0);
    }
    return values;
  }, [monthSummary, filteredDayMap]);

  const monthDistValues = useMemo(() => {
    const y = monthSummary.year;
    const m = monthSummary.month;
    const daysInMonth = new Date(y, m, 0).getDate();
    const values: number[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayData = filteredDayMap.get(key);
      values.push(dayData ? Math.round(dayData.totalDistance / 100) / 10 : 0);
    }
    return values;
  }, [monthSummary, filteredDayMap]);

  const monthCalTicks = useMemo(() => niceScale(Math.max(...monthCalData, 0)).ticks, [monthCalData]);
  const monthDistTicks = useMemo(() => niceScale(Math.max(...monthDistValues, 0)).ticks, [monthDistValues]);

  const yearXLabels = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

  const yearCalData = useMemo(() =>
    yearSummary.months.map(ms => ms ? ms.estimatedCalories : 0),
    [yearSummary],
  );
  const yearDistValues = useMemo(() =>
    yearSummary.months.map(ms => ms ? Math.round(ms.totalDistance / 100) / 10 : 0),
    [yearSummary],
  );
  const yearCalTicks = useMemo(() => niceScale(Math.max(...yearCalData, 0)).ticks, [yearCalData]);
  const yearDistTicks = useMemo(() => niceScale(Math.max(...yearDistValues, 0)).ticks, [yearDistValues]);

  const handleCloseSheet = useCallback(() => setSelectedActivity(null), []);
  const isEmpty = !loading && !error && activities.length === 0;

  const handleModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    setTypeFilter('ALL');
  }, []);

  return (
    <View style={dynamicStyles.container}>
      <View style={styles.ambientGlow} pointerEvents="none">
        <View style={dynamicStyles.glowOrb} />
      </View>
      <FullScreenBlur />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <Text style={dynamicStyles.headerTitle}>数据统计</Text>
          <StatsTypeFilter
            selected={typeFilter}
            onChange={setTypeFilter}
            availableTypes={availableTypes}
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.PRIMARY} />
          <Text style={dynamicStyles.loadingText}>加载中...</Text>
        </View>
      ) : error ? (
        <View style={styles.emptyState}>
          <View style={dynamicStyles.iconWrap}>
            <IconChart size={48} color={colors.TEXT.QUATERNARY} />
          </View>
          <Text style={dynamicStyles.emptyTitle}>{error}</Text>
          <Text style={dynamicStyles.emptySubtitle}>下拉刷新或检查网络连接</Text>
        </View>
      ) : isEmpty ? (
        <View style={styles.emptyState}>
          <View style={dynamicStyles.iconWrap}>
            <IconChart size={48} color={colors.TEXT.QUATERNARY} />
          </View>
          <Text style={dynamicStyles.emptyTitle}>暂无数据</Text>
          <Text style={dynamicStyles.emptySubtitle}>完成一次运动后，数据会出现在这里</Text>
        </View>
      ) : (
        <View style={styles.body}>
          {/* Tab 选择器 */}
          <StatsTabSelector mode={viewMode} onChange={handleModeChange} />

          {/* 时间范围选择器 */}
          <StatsTimeRange
            mode={viewMode}
            selectedDate={selectedDate}
            onSelect={setSelectedDate}
            getHasData={getHasData}
            totalRangeLabel={totalRangeLabel}
          />

          {/* 时段统计概览（无背景纯文字） */}
          {viewMode === 'week' && <InlineSummary items={[
            { value: fmtKm(weekSummary.totalDistance), label: '距离' },
            { value: fmtH(weekSummary.totalDuration), label: '时长' },
            { value: String(weekSummary.estimatedCalories), label: '消耗' },
            { value: String(weekSummary.totalActivities), label: '次数' },
          ]} />}
          {viewMode === 'month' && <InlineSummary items={[
            { value: String(monthSummary.activeDays), label: '活跃天' },
            { value: fmtKm(monthSummary.totalDistance), label: '距离' },
            { value: fmtH(monthSummary.totalDuration), label: '时长' },
            { value: String(monthSummary.totalActivities), label: '次数' },
          ]} />}
          {viewMode === 'year' && <InlineSummary items={[
            { value: String(yearSummary.activeDays), label: '活跃天' },
            { value: fmtKm(yearSummary.totalDistance), label: '距离' },
            { value: fmtH(yearSummary.totalDuration), label: '时长' },
            { value: String(yearSummary.estimatedCalories), label: '消耗' },
          ]} />}

          {/* 图表区域（不滚动） */}
          <View style={styles.chartArea}>
            {viewMode === 'week' && (
              <>
                <DataChart title="热量消耗" data={weekCalData} xLabels={weekXLabels} yTicks={weekCalTicks} unit="kcal" chartType="bar" />
                <DataChart title="运动距离" data={weekDistValues} xLabels={weekXLabels} yTicks={weekDistTicks} unit="km" chartType="bar" />
              </>
            )}

            {viewMode === 'month' && (
              <>
                <DataChart title="热量消耗" data={monthCalData} xLabels={monthXLabels} yTicks={monthCalTicks} unit="kcal" chartType="bar" />
                <DataChart title="运动距离" data={monthDistValues} xLabels={monthXLabels} yTicks={monthDistTicks} unit="km" chartType="bar" />
              </>
            )}

            {viewMode === 'year' && (
              <>
                <DataChart title="热量消耗" data={yearCalData} xLabels={yearXLabels} yTicks={yearCalTicks} unit="kcal" chartType="bar" />
                <DataChart title="运动距离" data={yearDistValues} xLabels={yearXLabels} yTicks={yearDistTicks} unit="km" chartType="bar" />
              </>
            )}

            {viewMode === 'total' && (
              <StatsSummary stats={lifetimeStats} />
            )}
          </View>
        </View>
      )}

      <ActivityDetailSheet activity={selectedActivity} onClose={handleCloseSheet} />
    </View>
  );
};

// ---- 工具函数 ----
function fmtKm(m: number) { return String(Math.round(m / 100) / 10); }
function fmtH(s: number) { return String(Math.round(s / 360) / 10); }

// ---- 内部组件：无背景概览行 ----
function InlineSummary({ items }: { items: { value: string; label: string }[] }) {
  const { colors } = useTheme();
  const inlineDynamicStyles = useMemo(() => StyleSheet.create({
    val: {
      fontSize: TYPOGRAPHY.FONT_SIZE.LG,
      fontWeight: '700',
      color: colors.TEXT.PRIMARY,
    },
    lbl: {
      fontSize: TYPOGRAPHY.FONT_SIZE.SM,
      color: colors.TEXT.QUATERNARY,
    },
    sep: {
      width: 1,
      height: 28,
      backgroundColor: colors.BORDER.LIGHT,
    },
  }), [colors]);

  return (
    <View style={inlineStaticStyles.row}>
      {items.map((item, i) => (
        <React.Fragment key={item.label}>
          {i > 0 && <View style={inlineDynamicStyles.sep} />}
          <View style={inlineStaticStyles.cell}>
            <Text style={inlineDynamicStyles.val}>{item.value}</Text>
            <Text style={inlineDynamicStyles.lbl}>{item.label}</Text>
          </View>
        </React.Fragment>
      ))}
    </View>
  );
}

const inlineStaticStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
});

// ---- 主样式 ----
const styles = StyleSheet.create({
  ambientGlow: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
  },
  header: {
    paddingHorizontal: SPACING.XL,
    paddingBottom: SPACING.MD,
    zIndex: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.MD,
    zIndex: 10,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    paddingBottom: 120,
  },
  body: {
    flex: 1,
    zIndex: 10,
    paddingHorizontal: SPACING.XL,
    gap: SPACING.LG,
  },
  chartArea: {
    gap: SPACING.LG,
  },
});
