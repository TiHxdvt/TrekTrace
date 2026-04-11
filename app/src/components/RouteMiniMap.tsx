/**
 * 迷你路线预览
 * 使用高德地图 MapView 渲染轨迹
 * pointerEvents="none" 防止拦截 ScrollView / 拖拽手势
 */

import React, { useRef, useEffect, useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { MapView, MapType, Polyline } from 'react-native-amap3d';
import { COLORS, BORDER_RADIUS } from '../theme';
import type { TrackPointUploadDTO } from '../types';

interface RouteMiniMapProps {
  points: TrackPointUploadDTO[];
}

const MAP_HEIGHT = 180;

export const RouteMiniMap: React.FC<RouteMiniMapProps> = ({ points }) => {
  const mapViewRef = useRef<MapView>(null);

  // 下采样到 200 点，转为地图坐标
  const coords = useMemo(() => {
    if (points.length < 2) return [];
    const maxPts = 200;
    let sampled = points;
    if (points.length > maxPts) {
      const step = (points.length - 1) / (maxPts - 1);
      sampled = [];
      for (let i = 0; i < maxPts; i++) {
        sampled.push(points[Math.min(Math.round(i * step), points.length - 1)]);
      }
    }
    return sampled.map(p => ({ latitude: p.latitude, longitude: p.longitude }));
  }, [points]);

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

  if (coords.length < 2 || !cameraTarget) return null;

  return (
    <View style={styles.container}>
      <MapView
        ref={mapViewRef}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
        mapType={MapType.Night}
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
          points={coords}
          color={COLORS.PRIMARY}
          width={4}
          zIndex={10}
        />
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: MAP_HEIGHT,
    marginHorizontal: 20,
    borderRadius: BORDER_RADIUS.MD,
    overflow: 'hidden',
    backgroundColor: COLORS.OVERLAY.LIGHT,
    borderWidth: 1,
    borderColor: COLORS.BORDER.LIGHT,
  },
});
