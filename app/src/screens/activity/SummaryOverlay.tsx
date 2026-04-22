/**
 * 摘要叠加层（统计 + 回放 + 操作按钮 + 分段统计 + 海拔剖面图）
 */

import React from 'react';
import { View, Text, TouchableOpacity, StatusBar } from 'react-native';
import { IconShareBold } from '../../components/SolarIcons';
import { formatDuration, formatPace } from '../../utils/format';
import { ACTIVITY_TYPE_META } from '../../constants/activityMeta';
import { styles } from './styles';
import { LapStatsView } from './LapStatsView';
import { ElevationChart } from './ElevationChart';
import { WeatherBadge } from '../../components/WeatherBadge';
import type { RecordingStats, ActivityType } from '../../types';
import type { LapData } from '../../utils/lapCalculator';
import type { ElevationPoint } from '../../utils/elevationProfile';

interface AnimatedStats {
  distance: number;
  duration: number;
  currentPace: number;
  elevationGain: number;
}

interface SummaryOverlayProps {
  paddingTop: number;
  paddingBottom: number;
  animatedStats: AnimatedStats;
  activityType: ActivityType;
  dynamicStyles: any;
  colors: any;
  laps: LapData[];
  elevationProfile: ElevationPoint[];
  weather?: { condition: string; temperature: number } | null;
  onDiscard: () => void;
  onShare: () => void;
  onSave: () => void;
}

export const SummaryOverlay: React.FC<SummaryOverlayProps> = ({
  paddingTop,
  paddingBottom,
  animatedStats,
  activityType,
  dynamicStyles,
  colors,
  laps,
  elevationProfile,
  weather,
  onDiscard,
  onShare,
  onSave,
}) => {
  const meta = ACTIVITY_TYPE_META[activityType];
  const SummaryIcon = meta.icon;

  return (
    <>
      <StatusBar barStyle="light-content" />
      {/* Top stats overlay */}
      <View style={[styles.summaryStatsOverlay, { paddingTop }]}>
        {/* Activity type badge */}
        <View style={[styles.summaryTypeBadge, dynamicStyles.summaryTypeBadge]}>
          <SummaryIcon size={16} color={colors.TEXT.PRIMARY} />
          <Text style={[styles.summaryTypeText, dynamicStyles.summaryTypeText]}>{meta.label}</Text>
        </View>
        <View style={[styles.summaryStatsCard, dynamicStyles.summaryStatsCard]}>
          <View style={styles.summaryStatsRow}>
            <View style={styles.summaryStatItem}>
              <Text style={[styles.summaryStatLabel, dynamicStyles.summaryStatLabel]}>距离</Text>
              <Text style={[styles.summaryStatValue, dynamicStyles.summaryStatValue]}>
                {(animatedStats.distance / 1000).toFixed(2)} km
              </Text>
            </View>
            <View style={styles.summaryStatItem}>
              <Text style={[styles.summaryStatLabel, dynamicStyles.summaryStatLabel]}>时长</Text>
              <Text style={[styles.summaryStatValue, dynamicStyles.summaryStatValue]}>
                {formatDuration(animatedStats.duration)}
              </Text>
            </View>
            <View style={styles.summaryStatItem}>
              <Text style={[styles.summaryStatLabel, dynamicStyles.summaryStatLabel]}>配速</Text>
              <Text style={[styles.summaryStatValue, dynamicStyles.summaryStatValue]}>
                {formatPace(animatedStats.currentPace)}
              </Text>
            </View>
            <View style={styles.summaryStatItem}>
              <Text style={[styles.summaryStatLabel, dynamicStyles.summaryStatLabel]}>爬升</Text>
              <Text style={[styles.summaryStatValue, dynamicStyles.summaryStatValue]}>
                {Math.round(animatedStats.elevationGain)} m
              </Text>
            </View>
          </View>

          {/* Weather badge */}
          {weather && (
            <View style={{ marginTop: 8, alignItems: 'center' }}>
              <WeatherBadge
                condition={weather.condition}
                temperature={weather.temperature}
                textColor={colors.TEXT.QUATERNARY}
              />
            </View>
          )}

          {/* Elevation profile chart */}
          {elevationProfile.length >= 2 && (
            <View style={{ marginTop: 12 }}>
              <ElevationChart
                data={elevationProfile}
                height={120}
                color={colors.PRIMARY}
              />
            </View>
          )}

          {/* Lap stats */}
          <LapStatsView laps={laps} colors={colors} />
        </View>
      </View>
      {/* Bottom discard / share / save buttons */}
      <View style={[styles.summaryBottomBar, { paddingBottom }]}>
        <View style={styles.summaryButtonRow}>
          <TouchableOpacity
            style={[styles.summaryDiscardBtn, dynamicStyles.summaryDiscardBtn]}
            onPress={onDiscard}
            activeOpacity={0.7}
          >
            <Text style={[styles.summaryDiscardText, dynamicStyles.summaryDiscardText]}>丢弃</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.summaryShareBtn, dynamicStyles.summaryShareBtn]}
            onPress={onShare}
            activeOpacity={0.7}
          >
            <IconShareBold size={18} color={colors.TEXT.PRIMARY} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.summarySaveBtn, dynamicStyles.summarySaveBtn]}
            onPress={onSave}
            activeOpacity={0.7}
          >
            <Text style={[styles.summarySaveText, dynamicStyles.summarySaveText]}>保存</Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
};
