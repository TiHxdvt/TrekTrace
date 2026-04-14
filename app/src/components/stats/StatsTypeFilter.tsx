/**
 * 运动类型筛选 — 胶囊按钮 + 点击展开下拉列表
 * 下拉列表与按钮等宽，紧贴按钮下方，每项高度与按钮一致
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { COLORS, BORDER_RADIUS, TYPOGRAPHY, SPACING, ANIMATION } from '../../theme';
import { IconChecklistMinimalistic, IconArrowDown } from '../SolarIcons';
import { ACTIVITY_TYPE_META } from '../../constants/activityMeta';
import type { ActivityType } from '../../utils/statsComputations';

export type TypeFilter = 'ALL' | ActivityType;

interface StatsTypeFilterProps {
  selected: TypeFilter;
  onChange: (filter: TypeFilter) => void;
  availableTypes: ActivityType[];
}

const MENU_OPTIONS: TypeFilter[] = ['ALL', 'HIKING', 'RUNNING', 'CYCLING'];

// 按钮行高（paddingVertical * 2 + icon 16）≈ 26，加上下拉每项也用同样的 padding
const ITEM_HEIGHT = 34; // paddingVertical * 2 + 内容
const MENU_MAX_ITEMS = 4;

export const StatsTypeFilter: React.FC<StatsTypeFilterProps> = ({
  selected,
  onChange,
  availableTypes,
}) => {
  const [open, setOpen] = React.useState(false);
  const expandAnim = useRef(new Animated.Value(0)).current;
  const menuMaxH = useRef(new Animated.Value(0)).current;

  const validOptions = MENU_OPTIONS.filter(
    f => f === 'ALL' || availableTypes.includes(f as ActivityType),
  );

  const maxMenuH = validOptions.length * ITEM_HEIGHT;

  useEffect(() => {
    Animated.timing(expandAnim, {
      toValue: open ? 1 : 0,
      duration: ANIMATION.FAST,
      useNativeDriver: true,
    }).start();

    Animated.timing(menuMaxH, {
      toValue: open ? maxMenuH : 0,
      duration: ANIMATION.FAST,
      useNativeDriver: false,
    }).start();
  }, [open, expandAnim, menuMaxH, maxMenuH]);

  const arrowRotate = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const contentOpacity = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const meta = selected !== 'ALL' ? ACTIVITY_TYPE_META[selected as ActivityType] : null;
  const TypeIcon = meta?.icon;
  const label = selected === 'ALL' ? '全部' : (meta?.label ?? '全部');

  const handleSelect = (filter: TypeFilter) => {
    onChange(filter);
    setOpen(false);
  };

  return (
    <View style={styles.wrapper}>
      {/* 胶囊按钮 */}
      <Pressable style={styles.btn} onPress={() => setOpen(prev => !prev)}>
        {selected === 'ALL' ? (
          <IconChecklistMinimalistic size={16} color={COLORS.TEXT.PRIMARY} />
        ) : (
          TypeIcon && <TypeIcon size={16} color={COLORS.TEXT.PRIMARY} />
        )}
        <Text style={styles.label}>{label}</Text>
        <Animated.View style={[styles.arrowWrapper, { transform: [{ rotate: arrowRotate }] }]}>
          <IconArrowDown size={14} color={COLORS.TEXT.TERTIARY} />
        </Animated.View>
      </Pressable>

      {/* 下拉列表：紧贴按钮下方，等宽 */}
      <Animated.View
        style={[styles.menuClip, { maxHeight: menuMaxH }]}
        pointerEvents={open ? 'auto' : 'none'}
      >
        <Animated.View style={{ opacity: contentOpacity }}>
          <View style={styles.menu}>
            {validOptions.map(filter => {
              const fMeta = filter !== 'ALL' ? ACTIVITY_TYPE_META[filter as ActivityType] : null;
              const FIcon = fMeta?.icon;
              const fLabel = filter === 'ALL' ? '全部' : (fMeta?.label ?? '全部');
              const isActive = filter === selected;

              return (
                <Pressable
                  key={filter}
                  style={[styles.menuItem, isActive && styles.menuItemActive]}
                  onPress={() => handleSelect(filter)}
                >
                  {filter === 'ALL' ? (
                    <IconChecklistMinimalistic size={16} color={isActive ? COLORS.TEXT.PRIMARY : COLORS.TEXT.SECONDARY} />
                  ) : (
                    FIcon && <FIcon size={16} color={isActive ? COLORS.TEXT.PRIMARY : COLORS.TEXT.SECONDARY} />
                  )}
                  <Text style={[styles.menuLabel, isActive && styles.menuLabelActive]}>
                    {fLabel}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.XS,
    paddingVertical: SPACING.XS + 2,
    paddingHorizontal: SPACING.MD,
    backgroundColor: COLORS.OVERLAY.LIGHT,
    borderWidth: 1,
    borderColor: COLORS.BORDER.LIGHT,
    borderRadius: BORDER_RADIUS.FULL,
  },
  label: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    fontWeight: '600',
    color: COLORS.TEXT.PRIMARY,
  },
  arrowWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  /* 下拉裁剪容器：紧贴按钮下方，等宽 */
  menuClip: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    overflow: 'hidden',
    zIndex: 50,
  },
  menu: {
    marginTop: SPACING.XS,
    backgroundColor: 'rgba(28, 30, 38, 0.95)',
    borderWidth: 1,
    borderColor: COLORS.BORDER.MEDIUM,
    borderRadius: BORDER_RADIUS.LG,
    overflow: 'hidden',
  },
  /* 每项高度、内间距与按钮一致 */
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.XS,
    paddingVertical: SPACING.XS + 2,
    paddingHorizontal: SPACING.MD,
  },
  menuItemActive: {
    backgroundColor: COLORS.PRIMARY,
  },
  menuLabel: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    fontWeight: '500',
    color: COLORS.TEXT.SECONDARY,
  },
  menuLabelActive: {
    color: COLORS.TEXT.PRIMARY,
    fontWeight: '600',
  },
});
