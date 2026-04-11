/**
 * 手风琴折叠组件
 * 按运动类型分组展示活动列表
 */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  LayoutAnimation,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { COLORS, BORDER_RADIUS, TYPOGRAPHY, ANIMATION } from '../theme';
import { IconArrowDown } from './SolarIcons';
import { ACTIVITY_TYPE_META } from '../constants/activityMeta';
import { formatDistance, formatDuration } from '../utils/format';
import type { ActivityResponseDTO, ActivityType } from '../types';

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
  const rotationAnim = useRef(new Animated.Value(isExpanded ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(rotationAnim, {
      toValue: isExpanded ? 1 : 0,
      duration: ANIMATION.NORMAL,
      useNativeDriver: true,
    }).start();
  }, [isExpanded, rotationAnim]);

  const meta = ACTIVITY_TYPE_META[type];
  const TypeIcon = meta.icon;
  const count = activities.length;
  const totalDistance = activities.reduce((sum, a) => sum + (a.distance ?? 0), 0);

  const handleToggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onToggle();
  };

  const rotateInterpolate = rotationAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={handleToggle}
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
        <Animated.View style={[styles.arrowWrapper, { transform: [{ rotate: rotateInterpolate }] }]}>
          <IconArrowDown size={16} color={COLORS.TEXT.QUATERNARY} />
        </Animated.View>
      </TouchableOpacity>

      {/* Expanded content */}
      {isExpanded && (
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
      )}
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
    padding: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER.LIGHT,
  },
  emptyText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    color: COLORS.TEXT.QUATERNARY,
    textAlign: 'center',
    paddingVertical: 16,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 8,
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
