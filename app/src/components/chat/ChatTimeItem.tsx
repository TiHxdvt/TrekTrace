/**
 * 聊天时间标签组件
 * 消息间隔超过 5 分钟时显示，智能格式化时间
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../../theme';

interface ChatTimeItemProps {
  timestamp: string;
}

function formatTimeLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();

  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);

  // 时间字符串 HH:mm
  const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date
    .getMinutes()
    .toString()
    .padStart(2, '0')}`;

  // 5 分钟内
  if (diffSec < 300) return '刚刚';
  // 1 小时内
  if (diffMin < 60) return `${diffMin}分钟前`;
  // 今天
  if (diffHour < 24 && isSameDay(date, now)) {
    return diffHour < 6 ? `${diffHour}小时前` : `今天 ${timeStr}`;
  }
  // 昨天
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameDay(date, yesterday)) return `昨天 ${timeStr}`;
  // 今年
  if (date.getFullYear() === now.getFullYear()) {
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${m}-${d} ${timeStr}`;
  }
  // 其他年份
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date
    .getDate()
    .toString()
    .padStart(2, '0')} ${timeStr}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export const ChatTimeItem: React.FC<ChatTimeItemProps> = ({ timestamp }) => {
  const { colors } = useTheme();

  const label = useMemo(() => formatTimeLabel(timestamp), [timestamp]);

  return (
    <View style={styles.container}>
      <Text
        style={[
          styles.timeText,
          {
            color: colors.TEXT.QUATERNARY,
            backgroundColor: colors.OVERLAY.LIGHT,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: SPACING.SM,
  },
  timeText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    paddingHorizontal: SPACING.MD,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.FULL,
    overflow: 'hidden',
  },
});
