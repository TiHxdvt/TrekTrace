/**
 * 月度日历组件
 * 7 列网格，有活动的日期显示小圆点，选中日期高亮
 * 玻璃拟态风格容器
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  format,
  isSameDay,
} from 'date-fns';
import { BORDER_RADIUS, TYPOGRAPHY, SPACING } from '../theme';
import { useTheme } from '../contexts/ThemeContext';

interface CalendarStripProps {
  year: number;
  month: number; // 1-12
  activeDates: Set<string>; // 'YYYY-MM-DD'
  selectedDate: string | null;
  onDatePress: (date: string) => void;
}

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

export const CalendarStrip: React.FC<CalendarStripProps> = ({
  year,
  month,
  activeDates,
  selectedDate,
  onDatePress,
}) => {
  const { colors } = useTheme();

  const days = useMemo(() => {
    const start = startOfMonth(new Date(year, month - 1));
    const end = endOfMonth(start);
    const allDays = eachDayOfInterval({ start, end });
    // day of week for the 1st (0=Sun)
    const firstDayOfWeek = getDay(start);
    // Pad with nulls for empty cells before the 1st
    const padded: (Date | null)[] = Array(firstDayOfWeek).fill(null).concat(allDays);
    return padded;
  }, [year, month]);

  const dynamicStyles = useMemo(() => StyleSheet.create({
    container: {
      marginHorizontal: SPACING.XL,
      marginBottom: SPACING.MD,
      padding: SPACING.MD,
      backgroundColor: colors.OVERLAY.LIGHT,
      borderWidth: 1,
      borderColor: colors.BORDER.LIGHT,
      borderRadius: BORDER_RADIUS.XXL,
    },
    weekdayLabel: {
      fontSize: TYPOGRAPHY.FONT_SIZE.XS,
      color: colors.TEXT.QUINARY,
      textAlign: 'center',
    },
    dayCell: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 18,
    },
    dayCellSelected: {
      backgroundColor: colors.PRIMARY,
    },
    dayText: {
      fontSize: TYPOGRAPHY.FONT_SIZE.SM,
      color: colors.TEXT.SECONDARY,
    },
    dayTextSelected: {
      color: colors.TEXT.PRIMARY,
      fontWeight: '700',
    },
    dot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.PRIMARY,
      position: 'absolute',
      bottom: 3,
    },
  }), [colors]);

  return (
    <View style={dynamicStyles.container}>
      {/* Weekday headers */}
      <View style={styles.weekRow}>
        {WEEKDAY_LABELS.map(label => (
          <View key={label} style={styles.weekdayCell}>
            <Text style={dynamicStyles.weekdayLabel}>{label}</Text>
          </View>
        ))}
      </View>
      {/* Day grid */}
      <View style={styles.daysGrid}>
        {days.map((day, idx) => {
          if (!day) {
            return <View key={`empty-${idx}`} style={dynamicStyles.dayCell} />;
          }
          const dateStr = format(day, 'yyyy-MM-dd');
          const isActive = activeDates.has(dateStr);
          const isSelected = selectedDate === dateStr;
          return (
            <Pressable
              key={dateStr}
              style={[
                dynamicStyles.dayCell,
                isSelected && dynamicStyles.dayCellSelected,
              ]}
              onPress={() => onDatePress(dateStr)}
            >
              <Text style={[
                dynamicStyles.dayText,
                isSelected && dynamicStyles.dayTextSelected,
              ]}>
                {format(day, 'd')}
              </Text>
              {isActive && !isSelected && <View style={dynamicStyles.dot} />}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: SPACING.XS,
  },
  weekdayCell: {
    width: 36,
    alignItems: 'center',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
});
