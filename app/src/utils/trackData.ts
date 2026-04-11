/**
 * GPS 轨迹数据处理工具
 * haversine 距离、图表数据准备、下采样、相机适配
 */

import type { TrackPointUploadDTO } from '../types';

export interface ChartDataPoint {
  distanceKm: number;
  value: number;
}

// 地球半径（米）
const EARTH_RADIUS = 6_371_000;

/**
 * Haversine 公式计算两个 GPS 点之间的距离（米）
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS * c;
}

/**
 * 从原始轨迹点计算三组图表数据
 */
export function prepareChartData(points: TrackPointUploadDTO[]): {
  elevationData: ChartDataPoint[];
  paceData: ChartDataPoint[];
  speedData: ChartDataPoint[];
  totalDistance: number;
} {
  if (points.length === 0) {
    return { elevationData: [], paceData: [], speedData: [], totalDistance: 0 };
  }

  const elevationData: ChartDataPoint[] = [];
  const paceData: ChartDataPoint[] = [];
  const speedData: ChartDataPoint[] = [];

  let cumulativeDistance = 0;

  // 第一个点
  elevationData.push({ distanceKm: 0, value: points[0].altitude });

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];

    // 累积距离
    const dist = haversineDistance(prev.latitude, prev.longitude, curr.latitude, curr.longitude);
    cumulativeDistance += dist;

    // 海拔
    elevationData.push({ distanceKm: cumulativeDistance / 1000, value: curr.altitude });

    // 时间差（秒）
    const tPrev = new Date(prev.timestamp).getTime();
    const tCurr = new Date(curr.timestamp).getTime();
    const dtSeconds = (tCurr - tPrev) / 1000;

    if (dtSeconds > 0 && dist > 0) {
      const speedKmH = (dist / dtSeconds) * 3.6;
      const paceSecKm = dtSeconds / (dist / 1000);

      // 过滤无效值（速度过高/过低导致 Infinity 或 NaN）
      if (isFinite(speedKmH) && speedKmH <= 300 && isFinite(paceSecKm) && paceSecKm <= 3600) {
        speedData.push({ distanceKm: cumulativeDistance / 1000, value: speedKmH });
        paceData.push({ distanceKm: cumulativeDistance / 1000, value: paceSecKm });
      }
    } else if (curr.speed > 0) {
      const speedKmH = curr.speed * 3.6;
      const paceSecKm = 3600 / speedKmH;

      if (isFinite(speedKmH) && isFinite(paceSecKm) && paceSecKm <= 3600) {
        speedData.push({ distanceKm: cumulativeDistance / 1000, value: speedKmH });
        paceData.push({ distanceKm: cumulativeDistance / 1000, value: paceSecKm });
      }
    }
  }

  return {
    elevationData,
    paceData,
    speedData,
    totalDistance: cumulativeDistance,
  };
}

/**
 * 下采样到 maxPoints 个点（均匀间隔）
 */
export function downsample(data: ChartDataPoint[], maxPoints: number = 100): ChartDataPoint[] {
  if (data.length <= maxPoints) return data;

  const step = (data.length - 1) / (maxPoints - 1);
  const result: ChartDataPoint[] = [];
  for (let i = 0; i < maxPoints; i++) {
    const idx = Math.min(Math.round(i * step), data.length - 1);
    result.push(data[idx]);
  }
  return result;
}

/**
 * 计算地图相机中心和缩放级别
 * 复用 ActivityScreen 的算法
 */
export function fitCameraToTrack(
  points: TrackPointUploadDTO[],
  viewportWidth: number = 400,
  viewportHeight: number = 180,
): { center: { latitude: number; longitude: number }; zoom: number } {
  if (points.length === 0) {
    return { center: { latitude: 35.86, longitude: 104.19 }, zoom: 16 };
  }

  if (points.length === 1) {
    return { center: { latitude: points[0].latitude, longitude: points[0].longitude }, zoom: 16 };
  }

  // 用循环代替 Math.min/max(...spread)，避免大数组调用栈溢出
  let minLat = Infinity, maxLat = -Infinity;
  let minLon = Infinity, maxLon = -Infinity;
  for (const p of points) {
    if (p.latitude < minLat) minLat = p.latitude;
    if (p.latitude > maxLat) maxLat = p.latitude;
    if (p.longitude < minLon) minLon = p.longitude;
    if (p.longitude > maxLon) maxLon = p.longitude;
  }

  const centerLat = (minLat + maxLat) / 2;
  const centerLon = (minLon + maxLon) / 2;

  const latSpan = maxLat - minLat;
  const lonSpan = maxLon - minLon;
  const paddedLatSpan = latSpan * 1.3 || 0.01;
  const paddedLonSpan = lonSpan * 1.3 || 0.01;
  const zoomByLat = Math.log2((360 * viewportHeight) / viewportWidth / paddedLatSpan);
  const zoomByLon = Math.log2(360 / paddedLonSpan);
  const zoom = Math.min(zoomByLat, zoomByLon);
  const clampedZoom = Math.max(3, Math.min(20, Math.round(zoom)));

  return { center: { latitude: centerLat, longitude: centerLon }, zoom: clampedZoom };
}
