/**
 * SVG 海拔剖面图组件
 * 用于录制时迷你图和摘要中完整图
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Polyline, Line, Defs, LinearGradient, Stop, Polygon } from 'react-native-svg';
import { TYPOGRAPHY } from '../../theme';
import type { ElevationPoint } from '../../utils/elevationProfile';

interface ElevationChartProps {
  data: ElevationPoint[];
  height: number;
  color: string;
  /** Show current position indicator (for recording mode) */
  currentPositionRatio?: number; // 0..1
  /** Limit to last N points (for recording performance) */
  maxPoints?: number;
}

export const ElevationChart: React.FC<ElevationChartProps> = ({
  data,
  height,
  color,
  currentPositionRatio,
  maxPoints,
}) => {
  if (!data || data.length < 2) return null;

  let points = data;
  if (maxPoints && points.length > maxPoints) {
    points = points.slice(points.length - maxPoints);
  }

  const width = 300; // logical SVG width; will stretch to container via flex

  const maxAlt = points.reduce((max, p) => p.altitude > max ? p.altitude : max, points[0].altitude);
  const minAlt = points.reduce((min, p) => p.altitude < min ? p.altitude : min, points[0].altitude);
  const altRange = maxAlt - minAlt || 1;
  const maxDist = points[points.length - 1].distance || 1;

  const padY = 4;
  const chartH = height - padY * 2;

  const toX = (d: number) => (d / maxDist) * width;
  const toY = (alt: number) => padY + chartH - ((alt - minAlt) / altRange) * chartH;

  const linePoints = points
    .map(p => `${toX(p.distance)},${toY(p.altitude)}`)
    .join(' ');

  // Fill polygon (area under the line)
  const fillPoints = `${toX(points[0].distance)},${height} ${linePoints} ${toX(points[points.length - 1].distance)},${height}`;

  // Current position indicator line
  const indicatorX = currentPositionRatio != null ? currentPositionRatio * width : null;


  return (
    <View style={[styles.container, { height }]}>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="elevGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="0.3" />
            <Stop offset="1" stopColor={color} stopOpacity="0.02" />
          </LinearGradient>
        </Defs>
        {/* Fill area */}
        <Polygon points={fillPoints} fill="url(#elevGrad)" />
        {/* Elevation line */}
        <Polyline
          points={linePoints}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinejoin="round"
        />
        {/* Current position indicator */}
        {indicatorX != null && (
          <Line
            x1={indicatorX}
            y1={0}
            x2={indicatorX}
            y2={height}
            stroke={color}
            strokeWidth={1.5}
            strokeDasharray="4,3"
            opacity={0.8}
          />
        )}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
});
