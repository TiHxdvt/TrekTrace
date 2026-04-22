/**
 * 手风琴折叠组件
 * 按运动类型分组展示活动列表
 *
 * 展开动画：opacity + translateY（native driver）+ 内容始终挂载避免重建
 */

import React, { useEffect, useRef, useMemo } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BORDER_RADIUS, TYPOGRAPHY, SPACING } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import { IconArrowDown, IconCheckCircle } from './SolarIcons';
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
  editMode?: boolean;
  selectedIds?: Set<number>;
  onToggleSelect?: (id: number) => void;
}

export const AccordionSection: React.FC<AccordionSectionProps> = ({
  type,
  activities,
  isExpanded,
  onToggle,
  onActivityPress,
  editMode = false,
  selectedIds,
  onToggleSelect,
}) => {
  const expandAnim = useRef(new Animated.Value(isExpanded ? 1 : 0)).current;
  const { colors } = useTheme();

  const dynamicStyles = useMemo(() => StyleSheet.create({
    container: {
      backgroundColor: colors.OVERLAY.LIGHT,
      borderWidth: 1,
      borderColor: colors.BORDER.LIGHT,
      borderRadius: BORDER_RADIUS.XXL,
      overflow: 'hidden',
    },
    typeIconWrapper: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.OVERLAY.MEDIUM,
      justifyContent: 'center',
      alignItems: 'center',
    },
    typeLabel: {
      fontSize: TYPOGRAPHY.FONT_SIZE.MD,
      fontWeight: '600',
      color: colors.TEXT.PRIMARY,
    },
    typeStats: {
      fontSize: TYPOGRAPHY.FONT_SIZE.SM,
      color: colors.TEXT.QUATERNARY,
      flex: 1,
    },
    content: {
      paddingHorizontal: SPACING.LG,
      paddingBottom: SPACING.MD,
      borderTopWidth: 1,
      borderTopColor: colors.BORDER.LIGHT,
    },
    emptyText: {
      fontSize: TYPOGRAPHY.FONT_SIZE.SM,
      color: colors.TEXT.QUATERNARY,
      textAlign: 'center',
      paddingVertical: SPACING.LG,
    },
    rowDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.BORDER.LIGHT,
    },
    activityDate: {
      fontSize: TYPOGRAPHY.FONT_SIZE.SM,
      color: colors.TEXT.TERTIARY,
      width: 40,
    },
    activityDistance: {
      fontSize: TYPOGRAPHY.FONT_SIZE.SM,
      color: colors.TEXT.SECONDARY,
      fontWeight: '500',
      flex: 1,
    },
    activityDuration: {
      fontSize: TYPOGRAPHY.FONT_SIZE.SM,
      color: colors.TEXT.TERTIARY,
      width: 48,
      textAlign: 'center',
    },
    activityElevation: {
      fontSize: TYPOGRAPHY.FONT_SIZE.SM,
      color: colors.TEXT.TERTIARY,
      width: 40,
      textAlign: 'right',
    },
  }), [colors]);

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
    <View style={dynamicStyles.container}>
      {/* Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <View style={dynamicStyles.typeIconWrapper}>
            <TypeIcon size={18} color={colors.TEXT.SECONDARY} />
          </View>
          <Text style={dynamicStyles.typeLabel}>{meta.label}</Text>
          <Text style={dynamicStyles.typeStats} numberOfLines={1}>
            {count}次 · {formatDistance(totalDistance)}
          </Text>
        </View>
        <Animated.View style={[styles.arrowWrapper, { transform: [{ rotate: arrowRotate }] }]}>
          <IconArrowDown size={16} color={colors.TEXT.QUATERNARY} />
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
          <View style={dynamicStyles.content}>
            {activities.length === 0 ? (
              <Text style={dynamicStyles.emptyText}>暂无记录</Text>
            ) : (
              activities.map((activity, index) => {
                const date = new Date(activity.startTime);
                const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
                const isSelected = selectedIds?.has(activity.id);
                return (
                  <React.Fragment key={activity.id}>
                    <TouchableOpacity
                      style={styles.activityRow}
                      onPress={() => {
                        if (editMode && onToggleSelect) {
                          onToggleSelect(activity.id);
                        } else {
                          onActivityPress(activity);
                        }
                      }}
                      activeOpacity={0.6}
                    >
                      {editMode ? (
                        isSelected ? (
                          <IconCheckCircle size={20} color={colors.PRIMARY} />
                        ) : (
                          <View style={[styles.emptyCircle, { borderColor: colors.BORDER.MEDIUM }]} />
                        )
                      ) : null}
                      <Text style={dynamicStyles.activityDate}>{dateStr}</Text>
                      <Text style={dynamicStyles.activityDistance}>
                        {formatDistance(activity.distance)}
                      </Text>
                      <Text style={dynamicStyles.activityDuration}>
                        {formatDuration(activity.duration)}
                      </Text>
                      <Text style={dynamicStyles.activityElevation}>
                        {Math.round(activity.elevationGain)}m
                      </Text>
                      {!editMode && (
                        <IconArrowDown
                          size={14}
                          color={colors.TEXT.QUINARY}
                          style={{ transform: [{ rotate: '-90deg' }] }}
                        />
                      )}
                    </TouchableOpacity>
                    {index < activities.length - 1 && <View style={dynamicStyles.rowDivider} />}
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
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.MD,
    gap: SPACING.SM,
  },
  emptyCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
  },
});
