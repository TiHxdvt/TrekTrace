/**
 * 月度分享卡片 — view-shot 截图用
 * 固定尺寸 375×500，positioned off-screen
 */

import React, { forwardRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from 'date-fns';
import { COLORS, BORDER_RADIUS, TYPOGRAPHY, SPACING } from '../../theme';
import type { MonthSummary, LifetimeStats, ActivityType } from '../../utils/statsComputations';

interface StatsShareCardProps {
  monthSummary: MonthSummary;
  lifetimeStats: LifetimeStats;
}

const TYPE_COLORS: Record<ActivityType, string> = {
  HIKING: '#22c55e',
  RUNNING: '#f97316',
  CYCLING: '#3b82f6',
};

export const StatsShareCard = forwardRef<View, StatsShareCardProps>(
  ({ monthSummary, lifetimeStats }, ref) => {
    const monthDate = new Date(monthSummary.year, monthSummary.month - 1, 1);
    const title = format(monthDate, 'yyyy年M月');

    // 迷你日历网格
    const start = startOfMonth(monthDate);
    const end = endOfMonth(monthDate);
    const daysInMonth = eachDayOfInterval({ start, end });
    const startDow = (getDay(start) + 6) % 7;

    const cells: (number | null)[] = [];
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (const d of daysInMonth) cells.push(d.getDate());
    while (cells.length < 42) cells.push(null);

    return (
      <View ref={ref} style={styles.card} collapsable={false}>
        {/* 品牌标识 */}
        <Text style={styles.brand}>途迹 TrekTrace</Text>

        {/* 标题 */}
        <Text style={styles.title}>{title} 运动报告</Text>

        {/* 统计数据 */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{monthSummary.activeDays}</Text>
            <Text style={styles.statLabel}>活跃天数</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {(monthSummary.totalDistance / 1000).toFixed(1)}
            </Text>
            <Text style={styles.statLabel}>总里程(km)</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{monthSummary.totalActivities}</Text>
            <Text style={styles.statLabel}>活动次数</Text>
          </View>
        </View>

        {/* 迷你月历网格 */}
        <View style={styles.miniGrid}>
          {cells.map((day, i) => {
            if (day === null) return <View key={`e-${i}`} style={styles.miniCell} />;
            const dateKey = `${monthSummary.year}-${String(monthSummary.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayData = monthSummary.days.get(dateKey);
            const hasAct = dayData != null && dayData.activities.length > 0;

            return (
              <View key={dateKey} style={styles.miniCell}>
                <Text style={[styles.miniDayText, hasAct && styles.miniDayActive]}>
                  {day}
                </Text>
                {hasAct && <View style={styles.miniDot} />}
              </View>
            );
          })}
        </View>

        {/* 底部标语 */}
        <Text style={styles.slogan}>每一步都值得记录</Text>
      </View>
    );
  },
);

StatsShareCard.displayName = 'StatsShareCard';

const CARD_WIDTH = 375;
const CARD_HEIGHT = 500;
const MINI_CELL = 20;

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: COLORS.BACKGROUND,
    padding: SPACING.XXL,
    position: 'absolute',
    top: -10000,
    left: 0,
  },
  brand: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    color: COLORS.PRIMARY,
    fontWeight: '600',
    letterSpacing: 1,
  },
  title: {
    fontSize: TYPOGRAPHY.FONT_SIZE.XXL,
    fontWeight: '700',
    color: COLORS.TEXT.PRIMARY,
    marginTop: SPACING.LG,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: SPACING.XL,
    paddingVertical: SPACING.LG,
    paddingHorizontal: SPACING.SM,
    backgroundColor: COLORS.OVERLAY.LIGHT,
    borderRadius: BORDER_RADIUS.XL,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: TYPOGRAPHY.FONT_SIZE.LG,
    fontWeight: '700',
    color: COLORS.TEXT.PRIMARY,
  },
  statLabel: {
    fontSize: TYPOGRAPHY.FONT_SIZE.XS,
    color: COLORS.TEXT.QUATERNARY,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: COLORS.BORDER.LIGHT,
  },
  miniGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: SPACING.XL,
  },
  miniCell: {
    width: MINI_CELL,
    height: MINI_CELL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniDayText: {
    fontSize: 8,
    color: COLORS.TEXT.QUINARY,
  },
  miniDayActive: {
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },
  miniDot: {
    position: 'absolute',
    bottom: 1,
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: COLORS.PRIMARY,
  },
  slogan: {
    position: 'absolute',
    bottom: SPACING.XXL,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    color: COLORS.TEXT.QUATERNARY,
    letterSpacing: 2,
  },
});
