/**
 * 底部统计面板 + 开始/暂停/停止按钮
 */

import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, Vibration } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { ElevationChart } from './ElevationChart';
import {
  IconRunning,
  IconBicycle,
  IconBonfire,
  IconPlay,
  IconPause,
  IconStop,
} from '../../components/SolarIcons';
import { formatDuration, formatPace } from '../../utils/format';
import { styles } from './styles';
import { ACTIVITY_CYCLE, ACTIVITY_TYPE_MAP, LONG_PRESS_DURATION, MIN_RECORDING_DISTANCE } from './constants';
import type { ActivityTypeLocal } from './constants';
import type { RecordingStats } from '../../types';
import type { ElevationPoint } from '../../utils/elevationProfile';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const ACTIVITY_ICONS: Record<ActivityTypeLocal, React.FC<{ size?: number; color?: string }>> = {
  running: IconRunning,
  cycling: IconBicycle,
  hiking: IconBonfire,
};

interface RecordingStatsPanelProps {
  activityIndex: number;
  stats: RecordingStats;
  isIdle: boolean;
  isRecording: boolean;
  isPaused: boolean;
  isStopping: boolean;
  colors: any;
  dynamicStyles: any;
  longPressProgress: Animated.Value;
  elevationProfile: ElevationPoint[];
  onCycleType: () => void;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStopComplete: () => void;
  onStopCancelled: () => void;
}

export const RecordingStatsPanel: React.FC<RecordingStatsPanelProps> = ({
  activityIndex,
  stats,
  isIdle,
  isRecording,
  isPaused,
  isStopping,
  colors,
  dynamicStyles,
  longPressProgress,
  elevationProfile,
  onCycleType,
  onStart,
  onPause,
  onResume,
  onStopComplete,
  onStopCancelled,
}) => {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedType = ACTIVITY_CYCLE[activityIndex];
  const ActiveIcon = ACTIVITY_ICONS[selectedType];

  const handleLeftButton = () => {
    if (isIdle) onCycleType();
    else if (isRecording) onPause();
    else if (isPaused) onResume();
  };

  const handleStopPressIn = () => {
    longPressProgress.setValue(0);
    Animated.timing(longPressProgress, {
      toValue: 1,
      duration: LONG_PRESS_DURATION,
      useNativeDriver: false,
    }).start();

    longPressTimer.current = setTimeout(() => {
      Vibration.vibrate(100);
      onStopComplete();
    }, LONG_PRESS_DURATION);
  };

  const handleStopPressOut = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    longPressProgress.stopAnimation();
    longPressProgress.setValue(0);
    onStopCancelled();
  };

  return (
    <View style={[styles.panelWrapper, dynamicStyles.panelWrapper]}>
      <View style={styles.panelContent}>
        {/* 一行数据 */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, dynamicStyles.statLabel]}>距离</Text>
            <View style={styles.statValueRow}>
              <Text style={[styles.statValue, dynamicStyles.statValue, isIdle && dynamicStyles.statValueDim]}>
                {isIdle ? '--' : (stats.distance / 1000).toFixed(2)}
              </Text>
              <Text style={[styles.statUnit, dynamicStyles.statUnit]}>km</Text>
            </View>
          </View>

          <View style={[styles.statDivider, dynamicStyles.statDivider]} />

          <View style={styles.statItem}>
            <Text style={[styles.statLabel, dynamicStyles.statLabel]}>时长</Text>
            <View style={styles.statValueRow}>
              <Text style={[styles.statValue, dynamicStyles.statValue, isIdle && dynamicStyles.statValueDim]}>
                {isIdle ? '--' : formatDuration(stats.duration)}
              </Text>
              <Text style={[styles.statUnit, dynamicStyles.statUnit]}> </Text>
            </View>
          </View>

          <View style={[styles.statDivider, dynamicStyles.statDivider]} />

          <View style={styles.statItem}>
            <Text style={[styles.statLabel, dynamicStyles.statLabel]}>配速</Text>
            <View style={styles.statValueRow}>
              <Text style={[styles.statValue, dynamicStyles.statValue, isIdle && dynamicStyles.statValueDim]}>
                {isIdle ? '--' : formatPace(stats.currentPace)}
              </Text>
              <Text style={[styles.statUnit, dynamicStyles.statUnit]}>min/km</Text>
            </View>
          </View>

          <View style={[styles.statDivider, dynamicStyles.statDivider]} />

          <View style={styles.statItem}>
            <Text style={[styles.statLabel, dynamicStyles.statLabel]}>海拔</Text>
            <View style={styles.statValueRow}>
              <Text style={[styles.statValue, dynamicStyles.statValue, isIdle && dynamicStyles.statValueDim]}>
                {isIdle ? '--' : Math.round(stats.elevationGain)}
              </Text>
              <Text style={[styles.statUnit, dynamicStyles.statUnit]}>m</Text>
            </View>
          </View>
        </View>

        {/* Mini elevation chart during recording */}
        {isRecording && elevationProfile.length >= 2 && (
          <View style={{ marginTop: 8, marginBottom: 4 }}>
            <ElevationChart
              data={elevationProfile}
              height={60}
              color={colors.PRIMARY}
              maxPoints={200}
              currentPositionRatio={1}
            />
          </View>
        )}

        {/* 按钮行 */}
        <View style={styles.centerButtons}>
          <TouchableOpacity
            onPress={handleLeftButton}
            activeOpacity={0.7}
            style={[
              styles.actionBtn,
              isIdle ? dynamicStyles.idleBtnBg : null,
              isRecording ? dynamicStyles.startBtnBg : null,
              isPaused ? dynamicStyles.resumeBtnBg : null,
            ]}
          >
            {isIdle ? (
              <ActiveIcon size={20} color={colors.TEXT.SECONDARY} />
            ) : isRecording ? (
              <IconPause size={18} color="#ffffff" />
            ) : (
              <IconPlay size={18} color="#ffffff" />
            )}
          </TouchableOpacity>

          {isIdle ? (
            <TouchableOpacity
              onPress={onStart}
              activeOpacity={0.7}
              style={[styles.actionBtn, dynamicStyles.startBtnBg]}
            >
              <IconPlay size={18} color="#ffffff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPressIn={handleStopPressIn}
              onPressOut={handleStopPressOut}
              activeOpacity={0.7}
              style={[styles.actionBtn, dynamicStyles.stopBtnBg]}
            >
              <View style={styles.stopBtnInner}>
                <IconStop size={18} color={colors.ERROR} />
              </View>
              <View style={styles.stopProgressRingContainer} pointerEvents="none">
                <Svg width={44} height={44} viewBox="0 0 44 44">
                  <Circle
                    cx={22}
                    cy={22}
                    r={20}
                    stroke={colors.BORDER.LIGHT}
                    strokeWidth={3}
                    fill="none"
                  />
                  <AnimatedCircle
                    cx={22}
                    cy={22}
                    r={20}
                    transform="rotate(-90 22 22)"
                    stroke={colors.ERROR}
                    strokeWidth={3}
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 20}`}
                    strokeDashoffset={longPressProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [2 * Math.PI * 20, 0],
                    })}
                  />
                </Svg>
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};
