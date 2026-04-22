/**
 * 趋势指示器徽章 — 显示百分比变化 + 箭头
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TYPOGRAPHY, SPACING } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';

interface TrendIndicatorProps {
  current: number;
  previous: number;
}

export const TrendIndicator: React.FC<TrendIndicatorProps> = ({ current, previous }) => {
  const { colors } = useTheme();

  const { pct, direction } = useMemo(() => {
    if (previous === 0) {
      if (current > 0) return { pct: 100, direction: 'up' as const };
      return { pct: 0, direction: 'neutral' as const };
    }
    const p = Math.round(((current - previous) / previous) * 100);
    if (p > 0) return { pct: p, direction: 'up' as const };
    if (p < 0) return { pct: Math.abs(p), direction: 'down' as const };
    return { pct: 0, direction: 'neutral' as const };
  }, [current, previous]);

  if (direction === 'neutral' || pct === 0) return null;

  const isUp = direction === 'up';

  const dynamicStyles = useMemo(() => StyleSheet.create({
    badge: {
      backgroundColor: isUp ? colors.PRIMARY + '20' : colors.OVERLAY.MEDIUM,
    },
    text: {
      color: isUp ? colors.PRIMARY : colors.TEXT.QUATERNARY,
    },
  }), [colors, isUp]);

  return (
    <View style={[styles.badge, dynamicStyles.badge]}>
      <Text style={[styles.text, dynamicStyles.text]}>
        {isUp ? '↑' : '↓'} {pct}%
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: SPACING.SM,
    paddingVertical: 2,
    borderRadius: 8,
  },
  text: {
    fontSize: TYPOGRAPHY.FONT_SIZE.XS,
    fontWeight: '600',
  },
});
