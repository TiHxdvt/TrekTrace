/**
 * 周/月/年/总 tab 切换 — 滑动指示器
 */

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, LayoutChangeEvent } from 'react-native';
import { BORDER_RADIUS, TYPOGRAPHY, SPACING } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';

export type ViewMode = 'week' | 'month' | 'year' | 'total';

const TABS: { key: ViewMode; label: string }[] = [
  { key: 'week', label: '周' },
  { key: 'month', label: '月' },
  { key: 'year', label: '年' },
  { key: 'total', label: '总' },
];

interface StatsTabSelectorProps {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export const StatsTabSelector: React.FC<StatsTabSelectorProps> = ({ mode, onChange }) => {
  const { colors } = useTheme();
  const translateX = useRef(new Animated.Value(0)).current;
  const tabWidthRef = useRef(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const index = TABS.findIndex(t => t.key === mode);

  const dynamicStyles = useMemo(() => StyleSheet.create({
    container: {
      backgroundColor: colors.OVERLAY.LIGHT,
      borderColor: colors.BORDER.LIGHT,
    },
    indicator: {
      backgroundColor: colors.PRIMARY,
    },
    tabLabel: {
      color: colors.TEXT.TERTIARY,
    },
    tabLabelActive: {
      color: '#ffffff',
    },
  }), [colors]);

  useEffect(() => {
    if (tabWidthRef.current > 0) {
      Animated.spring(translateX, {
        toValue: index * tabWidthRef.current,
        useNativeDriver: true,
        overshootClamping: true,
        damping: 24,
        stiffness: 400,
      }).start();
    }
  }, [index, translateX]);

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    const w = width / TABS.length;
    tabWidthRef.current = w;
    setContainerHeight(height);
    translateX.setValue(index * w);
  };

  const indicatorPad = 2;
  const indicatorHeight = containerHeight > 0 ? containerHeight - indicatorPad * 2 : 0;

  return (
    <View style={[styles.container, dynamicStyles.container]} onLayout={handleLayout}>
      {tabWidthRef.current > 0 && indicatorHeight > 0 && (
        <Animated.View
          style={[
            styles.indicator,
            dynamicStyles.indicator,
            {
              width: tabWidthRef.current - indicatorPad * 2,
              height: indicatorHeight,
              transform: [{ translateX }],
            },
          ]}
        />
      )}

      {TABS.map(tab => (
        <Pressable
          key={tab.key}
          style={styles.tab}
          onPress={() => onChange(tab.key)}
        >
          <Text
            style={[
              styles.tabLabel,
              dynamicStyles.tabLabel,
              mode === tab.key && dynamicStyles.tabLabelActive,
            ]}
          >
            {tab.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
};

const indicatorPadStatic = 1;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.XXL,
    padding: 2,
  },
  indicator: {
    position: 'absolute',
    top: indicatorPadStatic,
    left: indicatorPadStatic,
    borderRadius: BORDER_RADIUS.XL,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.SM,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  tabLabel: {
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    fontWeight: '500',
  },
  tabLabelActive: {
    fontWeight: '600',
  },
});
