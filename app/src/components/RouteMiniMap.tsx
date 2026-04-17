/**
 * 迷你路线预览
 * 使用高德地图 MapView 渲染轨迹
 * 支持：速度/海拔渐变色切换、轨迹回放
 * pointerEvents="none" 防止拦截 ScrollView / 拖拽手势
 */

import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { View, StyleSheet, Dimensions, Pressable } from 'react-native';
import { MapView, MapType, Polyline } from 'react-native-amap3d';
import { BORDER_RADIUS } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import { IconLayersBold, IconPlaybackSpeedBold, IconWalkingBold } from './SolarIcons';
import { haversineDistance } from '../utils/trackData';
import { wgs84ToGcj02 } from '../utils/geo';
import type { TrackPointUploadDTO } from '../types';

type TrailStyle = 'speed' | 'elevation';

interface RouteMiniMapProps {
  points: TrackPointUploadDTO[];
}

const MAP_HEIGHT = 200;
const REPLAY_INTERVAL = 50;
const REPLAY_STEP = 3;

// 速度色带：慢(绿) → 中(黄) → 快(红)
const SPEED_COLORS = ['#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444'];
// 海拔色带：低(蓝) → 中(青) → 高(橙) → 极高(白)
const ELEVATION_COLORS = ['#3b82f6', '#06b6d4', '#22c55e', '#f97316', '#fbbf24'];

export const RouteMiniMap: React.FC<RouteMiniMapProps> = ({ points }) => {
  const { colors, isDarkMode } = useTheme();
  const mapViewRef = useRef<MapView>(null);
  const replayTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const replayEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [trailStyle, setTrailStyle] = useState<TrailStyle>('speed');
  const [replaying, setReplaying] = useState(false);
  const [replayIndex, setReplayIndex] = useState(0);

  // 清理回放定时器
  useEffect(() => {
    return () => {
      if (replayTimerRef.current) clearInterval(replayTimerRef.current);
      if (replayEndTimerRef.current) clearTimeout(replayEndTimerRef.current);
    };
  }, []);

  // 下采样到 200 点，保留原始数据用于颜色计算
  const sampled = useMemo(() => {
    if (points.length < 2) return [];
    const maxPts = 200;
    if (points.length <= maxPts) return points.slice();
    const step = (points.length - 1) / (maxPts - 1);
    const result: TrackPointUploadDTO[] = [];
    for (let i = 0; i < maxPts; i++) {
      result.push(points[Math.min(Math.round(i * step), points.length - 1)]);
    }
    return result;
  }, [points]);

  const coords = useMemo(
    () => sampled.map(p => wgs84ToGcj02(p.latitude, p.longitude)),
    [sampled],
  );

  // 计算每个采样点的速度（km/h）
  const speeds = useMemo(() => {
    if (sampled.length === 0) return [];
    const firstSpeed = sampled[0].speed > 0 ? sampled[0].speed * 3.6 : 0;
    const result: number[] = [firstSpeed];
    for (let i = 1; i < sampled.length; i++) {
      const prev = sampled[i - 1];
      const curr = sampled[i];
      const dist = haversineDistance(prev.latitude, prev.longitude, curr.latitude, curr.longitude);
      const dtSec = (new Date(curr.timestamp).getTime() - new Date(prev.timestamp).getTime()) / 1000;
      if (dtSec > 0 && dist > 0) {
        result.push((dist / dtSec) * 3.6);
      } else if (curr.speed > 0) {
        result.push(curr.speed * 3.6);
      } else {
        result.push(result[i - 1]);
      }
    }
    return result;
  }, [sampled]);

  // 计算每个采样点的颜色
  const segmentColors = useMemo(() => {
    if (sampled.length < 2) return [];

    if (trailStyle === 'speed') {
      let minS = Infinity, maxS = -Infinity;
      for (const s of speeds) {
        if (s < minS) minS = s;
        if (s > maxS) maxS = s;
      }
      const range = maxS - minS || 1;
      return speeds.map(s => {
        const t = (s - minS) / range;
        return SPEED_COLORS[Math.min(Math.floor(t * SPEED_COLORS.length), SPEED_COLORS.length - 1)];
      });
    }

    // elevation
    let minA = Infinity, maxA = -Infinity;
    for (const p of sampled) {
      if (p.altitude < minA) minA = p.altitude;
      if (p.altitude > maxA) maxA = p.altitude;
    }
    const range = maxA - minA || 1;
    return sampled.map(p => {
      const t = (p.altitude - minA) / range;
      return ELEVATION_COLORS[Math.min(Math.floor(t * ELEVATION_COLORS.length), ELEVATION_COLORS.length - 1)];
    });
  }, [sampled, speeds, trailStyle]);

  // 计算相机中心和缩放
  const cameraTarget = useMemo(() => {
    if (coords.length < 2) return null;

    let minLat = Infinity, maxLat = -Infinity;
    let minLon = Infinity, maxLon = -Infinity;
    for (const c of coords) {
      if (c.latitude < minLat) minLat = c.latitude;
      if (c.latitude > maxLat) maxLat = c.latitude;
      if (c.longitude < minLon) minLon = c.longitude;
      if (c.longitude > maxLon) maxLon = c.longitude;
    }

    const centerLat = (minLat + maxLat) / 2;
    const centerLon = (minLon + maxLon) / 2;
    const latSpan = maxLat - minLat;
    const lonSpan = maxLon - minLon;
    const paddedLatSpan = latSpan * 1.3 || 0.01;
    const paddedLonSpan = lonSpan * 1.3 || 0.01;

    const { width } = Dimensions.get('window');
    const mapWidth = width - 40;
    const mapHeight = MAP_HEIGHT;
    const zoomByLat = Math.log2((360 * mapHeight / mapWidth) / paddedLatSpan);
    const zoomByLon = Math.log2(360 / paddedLonSpan);
    const zoom = Math.min(zoomByLat, zoomByLon);
    const clampedZoom = Math.max(3, Math.min(20, Math.round(zoom)));

    return { latitude: centerLat, longitude: centerLon, zoom: clampedZoom };
  }, [coords]);

  // 地图加载后移动相机到轨迹范围
  useEffect(() => {
    if (!cameraTarget || !mapViewRef.current) return;
    const timer = setTimeout(() => {
      mapViewRef.current?.moveCamera(
        {
          target: { latitude: cameraTarget.latitude, longitude: cameraTarget.longitude },
          zoom: cameraTarget.zoom,
        },
        500,
      );
    }, 300);
    return () => clearTimeout(timer);
  }, [cameraTarget]);

  // 回放时渐进绘制的坐标和颜色
  const replayCoords = useMemo(() => {
    if (!replaying) return coords;
    return coords.slice(0, replayIndex + 1);
  }, [coords, replaying, replayIndex]);

  const replayColors = useMemo(() => {
    if (!replaying) return segmentColors;
    return segmentColors.slice(0, replayIndex + 1);
  }, [segmentColors, replaying, replayIndex]);

  // ---- 回放控制 ----

  const stopReplay = useCallback(() => {
    if (replayTimerRef.current) {
      clearInterval(replayTimerRef.current);
      replayTimerRef.current = null;
    }
    if (replayEndTimerRef.current) {
      clearTimeout(replayEndTimerRef.current);
      replayEndTimerRef.current = null;
    }
    setReplaying(false);
    setReplayIndex(0);
  }, []);

  const startReplay = useCallback(() => {
    stopReplay();
    setReplaying(true);
    setReplayIndex(0);

    let idx = 0;
    replayTimerRef.current = setInterval(() => {
      idx += REPLAY_STEP;
      if (idx >= coords.length - 1) {
        if (replayTimerRef.current) {
          clearInterval(replayTimerRef.current);
          replayTimerRef.current = null;
        }
        setReplayIndex(coords.length - 1);
        replayEndTimerRef.current = setTimeout(() => {
          replayEndTimerRef.current = null;
          setReplaying(false);
          setReplayIndex(0);
        }, 1000);
      } else {
        setReplayIndex(idx);
      }
    }, REPLAY_INTERVAL);
  }, [coords, stopReplay]);

  const dynamicStyles = useMemo(() => StyleSheet.create({
    container: {
      height: MAP_HEIGHT,
      marginHorizontal: 20,
      borderRadius: BORDER_RADIUS.MD,
      overflow: 'hidden',
      backgroundColor: colors.OVERLAY.LIGHT,
      borderWidth: 1,
      borderColor: colors.BORDER.LIGHT,
    },
    btn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.OVERLAY.BLUR_LIGHT,
      borderWidth: 1,
      borderColor: colors.BORDER.MEDIUM,
      alignItems: 'center',
      justifyContent: 'center',
    },
    styleLabelBg: {
      backgroundColor: colors.OVERLAY.BLUR_LIGHT,
      borderWidth: 1,
      borderColor: colors.BORDER.MEDIUM,
      borderRadius: 6,
      padding: 4,
    },
  }), [colors]);

  if (coords.length < 2 || !cameraTarget) return null;

  return (
    <View style={dynamicStyles.container}>
      <MapView
        ref={mapViewRef}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
        mapType={isDarkMode ? MapType.Night : MapType.Standard}
        initialCameraPosition={{
          target: { latitude: cameraTarget.latitude, longitude: cameraTarget.longitude },
          zoom: cameraTarget.zoom,
        }}
        myLocationEnabled={false}
        scaleControlsEnabled={false}
        zoomControlsEnabled={false}
        compassEnabled={false}
        rotateGesturesEnabled={false}
        tiltGesturesEnabled={false}
        scrollGesturesEnabled={false}
        zoomGesturesEnabled={false}
        labelsEnabled
        buildingsEnabled={false}
        trafficEnabled={false}
      >
        <Polyline
          key={trailStyle}
          points={replayCoords}
          colors={replayColors}
          gradient
          width={5}
          zIndex={10}
        />
      </MapView>

      {/* 左上角颜色条 */}
      <View style={styles.styleLabel} pointerEvents="none">
        <View style={dynamicStyles.styleLabelBg}>
          <View style={styles.styleGradientCol}>
            {(trailStyle === 'speed' ? SPEED_COLORS : ELEVATION_COLORS).map((c, i) => (
              <View key={i} style={[styles.styleGradSeg, { backgroundColor: c }]} />
            ))}
          </View>
        </View>
        <View style={[styles.styleDot, {
          backgroundColor: trailStyle === 'speed' ? '#ef4444' : '#3b82f6',
        }]} />
      </View>

      {/* 右上角控制按钮 */}
      <View style={styles.controls} pointerEvents="box-none">
        {/* 样式切换：速度 / 海拔 */}
        <Pressable
          style={dynamicStyles.btn}
          onPress={() => setTrailStyle(prev => prev === 'speed' ? 'elevation' : 'speed')}
          hitSlop={6}
        >
          {trailStyle === 'speed' ? (
            <IconWalkingBold size={18} color={colors.TEXT.SECONDARY} />
          ) : (
            <IconLayersBold size={18} color={colors.TEXT.SECONDARY} />
          )}
        </Pressable>
        {/* 回放 */}
        <Pressable
          style={dynamicStyles.btn}
          onPress={replaying ? stopReplay : startReplay}
          hitSlop={6}
        >
          <IconPlaybackSpeedBold
            size={18}
            color={replaying ? colors.PRIMARY : colors.TEXT.SECONDARY}
          />
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  controls: {
    position: 'absolute',
    right: 8,
    top: 8,
    gap: 6,
    zIndex: 50,
  },
  styleLabel: {
    position: 'absolute',
    left: 8,
    top: 8,
    alignItems: 'center',
    gap: 4,
    zIndex: 50,
  },
  styleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  styleGradientCol: {
    flexDirection: 'column',
    borderRadius: 3,
    overflow: 'hidden',
  },
  styleGradSeg: {
    width: 8,
    height: 8,
  },
});
