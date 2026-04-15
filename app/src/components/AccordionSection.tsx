/**
 * 手风琴折叠组件
 * 按运动类型分组展示活动列表
 *
 * 展开动画：opacity + translateY（native driver）+ 内容始终挂载避免重建
 */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { COLORS, BORDER_RADIUS, TYPOGRAPHY, SPACING } from '../theme';
import { IconArrowDown } from './SolarIcons';
import { ACTIVITY_TYPE_META } from '../constants/activityMeta';
import { formatDistance, formatDuration } from '../utils/format';
import type { ActivityResponseDTO, ActivityType } from '../types';

// 内容区最大高度限制（超过此高度可滚动）
const CONTENT_MAX_HEIGHT = 300;

interface AccordionSectionProps {
  type: ActivityType;
  activities: ActivityResponseDTO[];
  isExpanded: boolean;
  onToggle: () => void;
  onActivityPress: (activity: ActivityResponseDTO) => void;
}

export const AccordionSection: React.FC<AccordionSectionProps> = ({
  type,
  activities,
  isExpanded,
  onToggle,
  onActivityPress,
}) => {
  const expandAnim = useRef(new Animated.Value(isExpanded ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(expandAnim, {
      toValue: isExpanded ? 1 : 0,
      useNativeDriver: true,
      overshootClamping: true,
      damping: 24,
      stiffness: 400,
    }).start();
  }, [isExpanded, expandAnim]);

  const meta = ACTIVITY_TYPE_META[type];
  const TypeIcon = meta.icon;
  const count = activities.length;
  const totalDistance = activities.reduce((sum, a) => sum + (a.distance ?? 0), 0);

  const arrowRotate = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  // 内容区：折叠时向上推出可视区 + 透明
  const contentTranslateY = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-20, 0],
  });
  const contentOpacity = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  // 容器高度裁剪：折叠时 maxH=0（完全隐藏），展开时 maxH=CONTENT_MAX_HEIGHT
  const contentMaxH = useRef(new Animated.Value(isExpanded ? CONTENT_MAX_HEIGHT : 0)).current;

  useEffect(() => {
    Animated.spring(contentMaxH, {
      toValue: isExpanded ? CONTENT_MAX_HEIGHT : 0,
      useNativeDriver: false,
      overshootClamping: true,
      damping: 24,
      stiffness: 400,
    }).start();
  }, [isExpanded, contentMaxH]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <View style={styles.typeIconWrapper}>
            <TypeIcon size={18} color={COLORS.TEXT.SECONDARY} />
          </View>
          <Text style={styles.typeLabel}>{meta.label}</Text>
          <Text style={styles.typeStats} numberOfLines={1}>
            {count}次 · {formatDistance(totalDistance)}
          </Text>
        </View>
        <Animated.View style={[styles.arrowWrapper, { transform: [{ rotate: arrowRotate }] }]}>
          <IconArrowDown size={16} color={COLORS.TEXT.QUATERNARY} />
        </Animated.View>
      </TouchableOpacity>

      {/* 内容区：始终挂载，用 maxHeight + opacity + translateY 控制显隐 */}
      <Animated.View
        style={[styles.contentClip, { maxHeight: contentMaxH }]}
        pointerEvents={isExpanded ? 'auto' : 'none'}
      >
        <Animated.View
          style={{
            opacity: contentOpacity,
            transform: [{ translateY: contentTranslateY }],
          }}
        >
          <View style={styles.content}>
            {activities.length === 0 ? (
              <Text style={styles.emptyText}>暂无记录</Text>
            ) : (
              activities.map((activity, index) => {
                const date = new Date(activity.startTime);
                const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
                return (
                  <React.Fragment key={activity.id}>
                    <TouchableOpacity
                      style={styles.activityRow}
                      onPress={() => onActivityPress(activity)}
                      activeOpacity={0.6}
                    >
                      <Text style={styles.activityDate}>{dateStr}</Text>
                      <Text style={styles.activityDistance}>
                        {formatDistance(activity.distance)}
                      </Text>
                      <Text style={styles.activityDuration}>
                        {formatDuration(activity.duration)}
                      </Text>
                      <Text style={styles.activityElevation}>
                        {Math.round(activity.elevationGain)}m
                      </Text>
                      <IconArrowDown
                        size={14}
                        color={COLORS.TEXT.QUINARY}
                        style={{ transform: [{ rotate: '-90deg' }] }}
                      />
                    </TouchableOpacity>
                    {index < activities.length - 1 && <View style={styles.rowDivider} />}
                  </React.Fragment>
                );
              })
            )}
          </View>
        </Animated.View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.OVERLAY.LIGHT,
    borderWidth: 1,
    borderColor: COLORS.BORDER.LIGHT,
    borderRadius: BORDER_RADIUS.XXL,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.LG,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.SM + 2,
    flex: 1,
  },
  typeIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.OVERLAY.MEDIUM,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeLabel: {
    fontSize: TYPOGRAPHY.FONT_SIZE.MD,
    fontWeight: '600',
    color: COLORS.TEXT.PRIMARY,
  },
  typeStats: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    color: COLORS.TEXT.QUATERNARY,
    flex: 1,
  },
  arrowWrapper: {
    width: SPACING.XL + 4,
    height: SPACING.XL + 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // 裁剪容器：用 maxHeight 控制可见高度
  contentClip: {
    overflow: 'hidden',
  },
  content: {
    paddingHorizontal: SPACING.LG,
    paddingBottom: SPACING.MD,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER.LIGHT,
  },
  emptyText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    color: COLORS.TEXT.QUATERNARY,
    textAlign: 'center',
    paddingVertical: SPACING.LG,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.MD,
    gap: SPACING.SM,
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.BORDER.LIGHT,
  },
  activityDate: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    color: COLORS.TEXT.TERTIARY,
    width: 40,
  },
  activityDistance: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    color: COLORS.TEXT.SECONDARY,
    fontWeight: '500',
    flex: 1,
  },
  activityDuration: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    color: COLORS.TEXT.TERTIARY,
    width: 48,
    textAlign: 'center',
  },
  activityElevation: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    color: COLORS.TEXT.TERTIARY,
    width: 40,
    textAlign: 'right',
  },
});
