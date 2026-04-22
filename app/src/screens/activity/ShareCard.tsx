/**
 * 离屏分享卡片（SVG 轨迹 + 数据）
 */

import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Polyline as SvgPolyline } from 'react-native-svg';
import { formatDuration, formatPace } from '../../utils/format';
import { ACTIVITY_TYPE_META } from '../../constants/activityMeta';
import { styles } from './styles';
import type { RecordingStats, ActivityType } from '../../types';

interface ShareCardProps {
  shareCardRef: React.RefObject<View>;
  shareTrackPoints: Array<Array<{ x: number; y: number }>>;
  stats: RecordingStats;
  activityType: ActivityType;
  dynamicStyles: any;
  colors: any;
  weather?: { condition: string; temperature: number } | null;
}

export const ShareCard: React.FC<ShareCardProps> = ({
  shareCardRef,
  shareTrackPoints,
  stats,
  activityType,
  dynamicStyles,
  colors,
  weather,
}) => {
  const meta = ACTIVITY_TYPE_META[activityType];
  const Icon = meta.icon;

  return (
    <View ref={shareCardRef} style={[styles.shareCard, dynamicStyles.shareCard]}>
      {/* SVG Track */}
      <View style={styles.shareCardTrackArea}>
        <Svg width="100%" height="100%" viewBox="0 0 200 200">
          {shareTrackPoints.map((points, idx) =>
            points.length >= 2 ? (
              <SvgPolyline
                key={idx}
                points={points.map(p => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke={colors.PRIMARY}
                strokeWidth="3"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ) : null
          )}
        </Svg>
      </View>

      {/* Divider */}
      <View style={[styles.shareCardDivider, dynamicStyles.shareCardDivider]} />

      {/* Data Area */}
      <View style={styles.shareCardDataArea}>
        <View style={styles.shareCardTypeRow}>
          <Icon size={16} color={colors.TEXT.PRIMARY} />
          <Text style={[styles.shareCardTypeText, dynamicStyles.shareCardTypeText]}>{meta.label}</Text>
        </View>
        <View style={styles.shareCardStatsRow}>
          <View style={styles.shareCardStatItem}>
            <Text style={[styles.shareCardStatLabel, dynamicStyles.shareCardStatLabel]}>距离</Text>
            <Text style={[styles.shareCardStatValue, dynamicStyles.shareCardStatValue]}>
              {(stats.distance / 1000).toFixed(2)} km
            </Text>
          </View>
          <View style={styles.shareCardStatItem}>
            <Text style={[styles.shareCardStatLabel, dynamicStyles.shareCardStatLabel]}>时长</Text>
            <Text style={[styles.shareCardStatValue, dynamicStyles.shareCardStatValue]}>
              {formatDuration(stats.duration)}
            </Text>
          </View>
          <View style={styles.shareCardStatItem}>
            <Text style={[styles.shareCardStatLabel, dynamicStyles.shareCardStatLabel]}>配速</Text>
            <Text style={[styles.shareCardStatValue, dynamicStyles.shareCardStatValue]}>
              {formatPace(stats.currentPace)}
            </Text>
          </View>
          <View style={styles.shareCardStatItem}>
            <Text style={[styles.shareCardStatLabel, dynamicStyles.shareCardStatLabel]}>爬升</Text>
            <Text style={[styles.shareCardStatValue, dynamicStyles.shareCardStatValue]}>
              {Math.round(stats.elevationGain)} m
            </Text>
          </View>
        </View>
        {weather && (
          <Text style={[styles.shareCardStatValue, dynamicStyles.shareCardStatValue, { fontSize: 12, textAlign: 'center', marginTop: 4 }]}>
            {weather.condition} {weather.temperature}°C
          </Text>
        )}
        <Text style={[styles.shareCardWatermark, dynamicStyles.shareCardWatermark]}>途迹 · TrekTrace</Text>
      </View>
    </View>
  );
};
