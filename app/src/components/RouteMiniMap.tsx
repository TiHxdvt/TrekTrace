/**
 * 迷你路线预览
 * 使用 react-native-svg 绘制轨迹折线，避免多个 MapView 实例导致 AMap SDK 崩溃
 */

import React, { useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Polyline, Circle } from 'react-native-svg';
import { COLORS } from '../theme';
import type { TrackPointUploadDTO } from '../types';

interface RouteMiniMapProps {
  points: TrackPointUploadDTO[];
}

const PADDING = 12;

export const RouteMiniMap: React.FC<RouteMiniMapProps> = ({ points }) => {
  const [layout, setLayout] = useState({ width: 0, height: 0 });

  // 将 GPS 坐标映射到 SVG 坐标系
  const svgPath = useMemo(() => {
    if (points.length < 2 || layout.width === 0) return null;

    let minLat = Infinity, maxLat = -Infinity;
    let minLon = Infinity, maxLon = -Infinity;
    for (const p of points) {
      if (p.latitude < minLat) minLat = p.latitude;
      if (p.latitude > maxLat) maxLat = p.latitude;
      if (p.longitude < minLon) minLon = p.longitude;
      if (p.longitude > maxLon) maxLon = p.longitude;
    }

    const drawW = layout.width - PADDING * 2;
    const drawH = layout.height - PADDING * 2;
    const latSpan = maxLat - minLat || 0.0001;
    const lonSpan = maxLon - minLon || 0.0001;

    // 保持纵横比
    const scaleX = drawW / lonSpan;
    const scaleY = drawH / latSpan;
    const scale = Math.min(scaleX, scaleY);

    const actualW = lonSpan * scale;
    const actualH = latSpan * scale;
    const offsetX = PADDING + (drawW - actualW) / 2;
    const offsetY = PADDING + (drawH - actualH) / 2;

    // 下采样到最多 200 个点（SVG 性能）
    const maxPts = 200;
    let sampled = points;
    if (points.length > maxPts) {
      const step = (points.length - 1) / (maxPts - 1);
      sampled = [];
      for (let i = 0; i < maxPts; i++) {
        sampled.push(points[Math.min(Math.round(i * step), points.length - 1)]);
      }
    }

    const coords = sampled.map(p => ({
      x: offsetX + (p.longitude - minLon) * scale,
      y: offsetY + (maxLat - p.latitude) * scale, // Y 轴翻转
    }));

    const pathStr = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');

    return {
      pathStr,
      start: coords[0],
      end: coords[coords.length - 1],
    };
  }, [points, layout]);

  if (!svgPath) return null;

  return (
    <View
      style={styles.container}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setLayout({ width, height });
      }}
    >
      {layout.width > 0 && svgPath && (
        <Svg width={layout.width} height={layout.height}>
          {/* 轨迹线 */}
          <Polyline
            d={svgPath.pathStr}
            stroke={COLORS.PRIMARY}
            strokeWidth={3}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* 起点 */}
          <Circle cx={svgPath.start.x} cy={svgPath.start.y} r={4} fill={COLORS.SUCCESS} />
          {/* 终点 */}
          <Circle cx={svgPath.end.x} cy={svgPath.end.y} r={4} fill={COLORS.ERROR} />
        </Svg>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 180,
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
});
