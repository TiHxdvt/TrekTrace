/**
 * 数据统计页面
 * 周/月/年/总视图 + 时间范围选择 + 数据图表
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { TYPOGRAPHY, SPACING } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import { FullScreenBlur } from '../components/FullScreenBlur';
import { ActivityDetailSheet } from '../components/ActivityDetailSheet';
import { IconChart } from '../components/SolarIcons';
import { useStatsData } from './stats/useStatsData';
import { StatsTabSelector } from '../components/stats/StatsTabSelector';
import { StatsTimeRange } from '../components/stats/StatsTimeRange';
import { DataChart, niceScale } from '../components/stats/StatsChart';
import { StatsTypeFilter } from '../components/stats/StatsTypeFilter';
import { StatsSummary } from '../components/stats/StatsSummary';
import { PersonalRecordsCard } from '../components/stats/PersonalRecordsCard';
import { TrendIndicator } from '../components/stats/TrendIndicator';

export const StatsScreen: React.FC = () => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const {
    serverStats, loading, error, isEmpty,
    viewMode, selectedDate, typeFilter, selectedActivity,
    weekSummary, monthSummary, yearSummary, lifetimeStats,
    prevWeekSummary, prevMonthSummary,
    currentWeekStats, currentMonthStats, currentYearStats,
    filteredDayMap, availableTypes, totalRangeLabel,
    getHasData,
    setViewMode, setSelectedDate, setTypeFilter, setSelectedActivity, handleCloseSheet,
  } = useStatsData();

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
          <StatsTabSelector mode={viewMode} onChange={setViewMode} />

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
            { value: fmtKm(currentWeekStats?.totalDistance ?? weekSummary.totalDistance), label: '距离', trend: <TrendIndicator current={weekSummary.totalDistance} previous={prevWeekSummary.totalDistance} /> },
            { value: fmtH(currentWeekStats?.totalDuration ?? weekSummary.totalDuration), label: '时长', trend: <TrendIndicator current={weekSummary.totalDuration} previous={prevWeekSummary.totalDuration} /> },
            { value: String(currentWeekStats?.totalCalories ?? weekSummary.estimatedCalories), label: '消耗', trend: <TrendIndicator current={weekSummary.estimatedCalories} previous={prevWeekSummary.estimatedCalories} /> },
            { value: String(currentWeekStats?.totalActivities ?? weekSummary.totalActivities), label: '次数' },
          ]} />}
          {viewMode === 'month' && <InlineSummary items={[
            { value: String(currentMonthStats?.activeDays ?? monthSummary.activeDays), label: '活跃天', trend: <TrendIndicator current={monthSummary.activeDays} previous={prevMonthSummary.activeDays} /> },
            { value: fmtKm(currentMonthStats?.totalDistance ?? monthSummary.totalDistance), label: '距离', trend: <TrendIndicator current={monthSummary.totalDistance} previous={prevMonthSummary.totalDistance} /> },
            { value: fmtH(currentMonthStats?.totalDuration ?? monthSummary.totalDuration), label: '时长', trend: <TrendIndicator current={monthSummary.totalDuration} previous={prevMonthSummary.totalDuration} /> },
            { value: String(currentMonthStats?.totalActivities ?? monthSummary.totalActivities), label: '次数' },
          ]} />}
          {viewMode === 'year' && <InlineSummary items={[
            { value: String(currentYearStats?.activeDays ?? yearSummary.activeDays), label: '活跃天' },
            { value: fmtKm(currentYearStats?.totalDistance ?? yearSummary.totalDistance), label: '距离' },
            { value: fmtH(currentYearStats?.totalDuration ?? yearSummary.totalDuration), label: '时长' },
            { value: String(currentYearStats?.totalCalories ?? yearSummary.estimatedCalories), label: '消耗' },
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
              <>
                <StatsSummary stats={lifetimeStats} />
                {serverStats?.personalRecords && Object.keys(serverStats.personalRecords).length > 0 && (
                  <PersonalRecordsCard records={serverStats.personalRecords} />
                )}
              </>
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
function fmtH(s: number) { return String(Math.round(s / 3600) / 10); }

// ---- 内部组件：无背景概览行 ----
function InlineSummary({ items }: { items: { value: string; label: string; trend?: React.ReactNode }[] }) {
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
            <View style={inlineStaticStyles.valRow}>
              <Text style={inlineDynamicStyles.val}>{item.value}</Text>
              {item.trend}
            </View>
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
  valRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
