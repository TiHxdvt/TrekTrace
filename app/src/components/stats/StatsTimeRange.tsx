/**
 * 时间范围选择器 — 横向 ScrollView，支持 周/月/年/总 模式
 */

import React, { useRef, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { format, addDays, addWeeks, addMonths, addYears, startOfWeek } from 'date-fns';
import { COLORS, BORDER_RADIUS, TYPOGRAPHY, SPACING } from '../../theme';
import type { ViewMode } from './StatsTabSelector';

/** 全局最早日期 */
export const MIN_DATE = new Date(2025, 11, 29); // 2025-12-29

interface TimeRangeItem {
  key: string;
  label: string;
  date: Date;
  hasData: boolean;
}

interface StatsTimeRangeProps {
  mode: ViewMode;
  selectedDate: Date;
  onSelect: (date: Date) => void;
  getHasData: (date: Date) => boolean;
  totalRangeLabel?: string;
}

function makeKey(mode: ViewMode, date: Date): string {
  if (mode === 'week') return format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  if (mode === 'month') return format(date, 'yyyy-MM');
  if (mode === 'year') return format(date, 'yyyy');
  return 'total';
}

function generateItems(mode: ViewMode, getHasData: (d: Date) => boolean): TimeRangeItem[] {
  const now = new Date();
  const items: TimeRangeItem[] = [];

  if (mode === 'week') {
    let cursor = startOfWeek(MIN_DATE, { weekStartsOn: 1 });
    const endWeek = startOfWeek(now, { weekStartsOn: 1 });
    while (cursor <= endWeek) {
      const weekEnd = addDays(cursor, 6);
      items.push({
        key: format(cursor, 'yyyy-MM-dd'),
        label: `${format(cursor, 'M.d')}-${format(weekEnd, 'M.d')}`,
        date: new Date(cursor),
        hasData: getHasData(cursor),
      });
      cursor = addWeeks(cursor, 1);
    }
  } else if (mode === 'month') {
    let cursor = new Date(MIN_DATE.getFullYear(), MIN_DATE.getMonth(), 1);
    const endMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    while (cursor <= endMonth) {
      items.push({
        key: format(cursor, 'yyyy-MM'),
        label: format(cursor, 'M月'),
        date: new Date(cursor),
        hasData: getHasData(cursor),
      });
      cursor = addMonths(cursor, 1);
    }
  } else if (mode === 'year') {
    let cursor = new Date(MIN_DATE.getFullYear(), 0, 1);
    const endYear = new Date(now.getFullYear(), 0, 1);
    while (cursor <= endYear) {
      items.push({
        key: format(cursor, 'yyyy'),
        label: format(cursor, 'yyyy年'),
        date: new Date(cursor),
        hasData: getHasData(cursor),
      });
      cursor = addYears(cursor, 1);
    }
  }

  return items;
}

export const StatsTimeRange: React.FC<StatsTimeRangeProps> = ({
  mode,
  selectedDate,
  onSelect,
  getHasData,
  totalRangeLabel,
}) => {
  const scrollRef = useRef<ScrollView>(null);
  const prevModeRef = useRef<ViewMode>(mode);

  // 稳定生成 items，只在 mode 或 getHasData 变化时重建
  const items = useMemo(() => generateItems(mode, getHasData), [mode, getHasData]);

  // 当前选中项的 key
  const selectedKey = makeKey(mode, selectedDate);

  // 滚动到选中项
  useEffect(() => {
    const idx = items.findIndex(it => it.key === selectedKey);
    if (idx < 0) return;

    // mode 变化时即时跳转，同 mode 内选择日期才动画
    const modeChanged = prevModeRef.current !== mode;
    prevModeRef.current = mode;

    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        x: Math.max(0, idx * 72 - 40),
        animated: !modeChanged,
      });
    });
  }, [selectedKey, items, mode]);

  if (mode === 'total') {
    return (
      <View style={styles.totalContainer}>
        <Text style={styles.totalLabel}>{totalRangeLabel ?? '今日为止'}</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {items.map(item => {
          const isSelected = item.key === selectedKey;
          return (
            <Pressable
              key={item.key}
              style={[styles.item, isSelected && styles.itemSelected]}
              onPress={() => item.hasData && onSelect(item.date)}
              disabled={!item.hasData}
            >
              <Text
                style={[
                  styles.itemLabel,
                  isSelected && styles.itemLabelSelected,
                  !item.hasData && styles.itemLabelDisabled,
                ]}
                numberOfLines={1}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  // 外层固定高度容器，防止 ScrollView 高度变化导致布局跳动
  wrapper: {
    height: 40,
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: SPACING.SM,
    gap: SPACING.XS,
    alignItems: 'center',
  },
  item: {
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.XS + 2,
    borderRadius: BORDER_RADIUS.FULL,
    minWidth: 68,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemSelected: {
  },
  itemLabel: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    fontWeight: '500',
    color: COLORS.TEXT.TERTIARY,
  },
  itemLabelSelected: {
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },
  itemLabelDisabled: {
    opacity: 0.3,
  },
  totalContainer: {
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalLabel: {
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    fontWeight: '500',
    color: COLORS.TEXT.SECONDARY,
  },
});
