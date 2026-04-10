/**
 * GPS 模拟服务
 * 仅在 __DEV__ 模式下可用
 * 在预设路线上按指定速度生成模拟 GPS 点
 */

import type { RawLocationPoint } from '../types';

// Same as SPEED_FILTER in trackRecordingService — simulated speed must not fall below this
const SPEED_FLOOR = 1.0; // m/s

// ======================== 预设路线 ========================

export interface RoutePoint {
  latitude: number;
  longitude: number;
}

/**
 * 北京奥林匹克森林公园 3km 环形步道（北园）
 * 约 40 个关键点，模拟跑步/徒步
 */
const OLYMPIC_PARK_ROUTE: RoutePoint[] = [
  { latitude: 40.01880, longitude: 116.38380 },
  { latitude: 40.01920, longitude: 116.38360 },
  { latitude: 40.01970, longitude: 116.38350 },
  { latitude: 40.02020, longitude: 116.38360 },
  { latitude: 40.02070, longitude: 116.38380 },
  { latitude: 40.02120, longitude: 116.38390 },
  { latitude: 40.02160, longitude: 116.38420 },
  { latitude: 40.02200, longitude: 116.38460 },
  { latitude: 40.02230, longitude: 116.38510 },
  { latitude: 40.02250, longitude: 116.38570 },
  { latitude: 40.02260, longitude: 116.38630 },
  { latitude: 40.02260, longitude: 116.38700 },
  { latitude: 40.02250, longitude: 116.38770 },
  { latitude: 40.02230, longitude: 116.38830 },
  { latitude: 40.02200, longitude: 116.38880 },
  { latitude: 40.02160, longitude: 116.38920 },
  { latitude: 40.02120, longitude: 116.38950 },
  { latitude: 40.02070, longitude: 116.38970 },
  { latitude: 40.02020, longitude: 116.38980 },
  { latitude: 40.01970, longitude: 116.38990 },
  { latitude: 40.01920, longitude: 116.38980 },
  { latitude: 40.01880, longitude: 116.38960 },
  { latitude: 40.01840, longitude: 116.38930 },
  { latitude: 40.01810, longitude: 116.38890 },
  { latitude: 40.01780, longitude: 116.38840 },
  { latitude: 40.01760, longitude: 116.38780 },
  { latitude: 40.01750, longitude: 116.38720 },
  { latitude: 40.01750, longitude: 116.38650 },
  { latitude: 40.01760, longitude: 116.38590 },
  { latitude: 40.01780, longitude: 116.38530 },
  { latitude: 40.01810, longitude: 116.38480 },
  { latitude: 40.01840, longitude: 116.38440 },
  { latitude: 40.01880, longitude: 116.38410 },
  { latitude: 40.01910, longitude: 116.38390 },
  { latitude: 40.01940, longitude: 116.38380 },
  { latitude: 40.01960, longitude: 116.38375 },
  { latitude: 40.01980, longitude: 116.38370 },
  { latitude: 40.01950, longitude: 116.38360 },
  { latitude: 40.01920, longitude: 116.38365 },
  { latitude: 40.01880, longitude: 116.38380 }, // 回到起点（闭环）
];

/**
 * 城市骑行路线 5km（北京望京 SOHO 一带）
 * 模拟城市骑行
 */
const CITY_RIDE_ROUTE: RoutePoint[] = [
  { latitude: 39.99100, longitude: 116.47400 },
  { latitude: 39.99150, longitude: 116.47420 },
  { latitude: 39.99200, longitude: 116.47450 },
  { latitude: 39.99260, longitude: 116.47480 },
  { latitude: 39.99320, longitude: 116.47500 },
  { latitude: 39.99380, longitude: 116.47530 },
  { latitude: 39.99430, longitude: 116.47570 },
  { latitude: 39.99480, longitude: 116.47620 },
  { latitude: 39.99520, longitude: 116.47680 },
  { latitude: 39.99550, longitude: 116.47750 },
  { latitude: 39.99560, longitude: 116.47830 },
  { latitude: 39.99550, longitude: 116.47910 },
  { latitude: 39.99530, longitude: 116.47980 },
  { latitude: 39.99500, longitude: 116.48050 },
  { latitude: 39.99460, longitude: 116.48100 },
  { latitude: 39.99410, longitude: 116.48140 },
  { latitude: 39.99350, longitude: 116.48170 },
  { latitude: 39.99290, longitude: 116.48190 },
  { latitude: 39.99230, longitude: 116.48200 },
  { latitude: 39.99170, longitude: 116.48190 },
  { latitude: 39.99110, longitude: 116.48170 },
  { latitude: 39.99060, longitude: 116.48140 },
  { latitude: 39.99010, longitude: 116.48100 },
  { latitude: 39.98970, longitude: 116.48050 },
  { latitude: 39.98940, longitude: 116.47980 },
  { latitude: 39.98920, longitude: 116.47910 },
  { latitude: 39.98910, longitude: 116.47830 },
  { latitude: 39.98920, longitude: 116.47750 },
  { latitude: 39.98940, longitude: 116.47680 },
  { latitude: 39.98970, longitude: 116.47620 },
  { latitude: 39.99010, longitude: 116.47570 },
  { latitude: 39.99060, longitude: 116.47530 },
  { latitude: 39.99100, longitude: 116.47480 },
  { latitude: 39.99130, longitude: 116.47440 },
  { latitude: 39.99100, longitude: 116.47400 }, // 回到起点（闭环）
];

export const MOCK_ROUTES: Record<string, { name: string; points: RoutePoint[]; defaultSpeed: number }> = {
  olympic_park: {
    name: '奥森公园 3km 环线',
    points: OLYMPIC_PARK_ROUTE,
    defaultSpeed: 3.0, // 跑步 3.0 m/s
  },
  city_ride: {
    name: '望京骑行 5km',
    points: CITY_RIDE_ROUTE,
    defaultSpeed: 6.0, // 骑行 6.0 m/s
  },
};

// ======================== Haversine ========================

function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * 计算路线上每个点到起点的累积距离
 */
function computeCumulativeDistances(points: RoutePoint[]): number[] {
  const dists: number[] = [0];
  for (let i = 1; i < points.length; i++) {
    const d = haversineDistance(
      points[i - 1].latitude, points[i - 1].longitude,
      points[i].latitude, points[i].longitude,
    );
    dists.push(dists[i - 1] + d);
  }
  return dists;
}

/**
 * 在累积距离数组中，找到 distance 所在的区间索引
 */
function findSegmentIndex(cumDists: number[], distance: number): number {
  if (cumDists.length < 2) return 0;
  for (let i = 1; i < cumDists.length; i++) {
    if (distance <= cumDists[i]) return i - 1;
  }
  // distance exceeds total route — clamp to last valid segment
  return cumDists.length - 2;
}

/**
 * 两点线性插值
 */
function lerp(p1: RoutePoint, p2: RoutePoint, t: number): RoutePoint {
  return {
    latitude: p1.latitude + (p2.latitude - p1.latitude) * t,
    longitude: p1.longitude + (p2.longitude - p1.longitude) * t,
  };
}

// ======================== Callback ========================

export type MockLocationCallback = (point: RawLocationPoint) => void;

// ======================== Service ========================

class MockLocationService {
  private timer: ReturnType<typeof setInterval> | null = null;
  private callback: MockLocationCallback | null = null;
  private cumDists: number[] = [];
  private totalRouteDistance = 0;
  private currentDistance = 0;
  private baseSpeed = 3.0;
  private _isRunning = false;
  private _isPaused = false;

  get isRunning(): boolean {
    return this._isRunning;
  }

  get isPaused(): boolean {
    return this._isPaused;
  }

  /**
   * 开始模拟
   */
  start(routeName: string, baseSpeed: number, callback: MockLocationCallback): void {
    this.stop();

    const route = MOCK_ROUTES[routeName];
    if (!route) {
      console.warn(`[MockLocation] Unknown route: ${routeName}`);
      return;
    }
    if (route.points.length < 2) {
      console.warn(`[MockLocation] Route ${routeName} has fewer than 2 points`);
      return;
    }

    this.callback = callback;
    this.baseSpeed = baseSpeed;
    this.cumDists = computeCumulativeDistances(route.points);
    this.totalRouteDistance = this.cumDists[this.cumDists.length - 1];
    this.currentDistance = 0;
    this._isRunning = true;
    this._isPaused = false;

    // 立即发射第一个点
    this.emitPoint(route.points, Date.now());

    // 每 1 秒发射一个点（模拟 1Hz GPS）
    this.timer = setInterval(() => {
      if (this._isPaused) return;

      // 在基础速度 ±30% 范围内随机波动，但下限不低于 SPEED_FLOOR
      const speedVariation = Math.max(SPEED_FLOOR, this.baseSpeed * (0.7 + Math.random() * 0.6));
      this.currentDistance += speedVariation * 1; // 1 秒间隔

      // 路线循环：到达终点后从头开始
      if (this.currentDistance >= this.totalRouteDistance) {
        this.currentDistance -= this.totalRouteDistance;
        // Extra safety: if still past the end (e.g. very high speed), clamp to 0
        if (this.currentDistance >= this.totalRouteDistance) {
          this.currentDistance = 0;
        }
      }

      this.emitPoint(route.points, Date.now());
    }, 1000);
  }

  /**
   * 暂停模拟
   */
  pause(): void {
    this._isPaused = true;
  }

  /**
   * 恢复模拟
   */
  resume(): void {
    this._isPaused = false;
  }

  /**
   * 停止模拟
   */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.callback = null;
    this._isRunning = false;
    this._isPaused = false;
    this.currentDistance = 0;
  }

  private emitPoint(routePoints: RoutePoint[], timestamp: number): void {
    if (!this.callback) return;

    const segIdx = Math.min(
      findSegmentIndex(this.cumDists, this.currentDistance),
      routePoints.length - 2,
    );
    const segStart = this.cumDists[segIdx];
    const segEnd = this.cumDists[segIdx + 1];
    const segLen = segEnd - segStart;

    // Guard against division by zero when segment has zero length
    const t = segLen > 0 ? (this.currentDistance - segStart) / segLen : 0;

    // Clamp segIdx + 1 to valid range
    const nextIdx = Math.min(segIdx + 1, routePoints.length - 1);
    const pos = lerp(routePoints[segIdx], routePoints[nextIdx], t);

    // 计算瞬时速度（带波动），下限不低于 SPEED_FLOOR
    const speed = Math.max(SPEED_FLOOR, this.baseSpeed * (0.7 + Math.random() * 0.6));

    // 模拟 GPS 精度：5-15 米（始终满足 ACCURACY_FILTER=30 的要求）
    const accuracy = 5 + Math.random() * 10;

    // 模拟海拔：北京奥森约 45-55m
    const altitude = 48 + Math.sin(this.currentDistance / 200) * 5;

    // 计算航向
    let heading = 0;
    if (segIdx < routePoints.length - 1) {
      const dLat = routePoints[nextIdx].latitude - routePoints[segIdx].latitude;
      const dLon = routePoints[nextIdx].longitude - routePoints[segIdx].longitude;
      heading = (Math.atan2(dLon, dLat) * 180) / Math.PI;
      if (heading < 0) heading += 360;
    }

    const point: RawLocationPoint = {
      latitude: pos.latitude,
      longitude: pos.longitude,
      altitude,
      accuracy,
      speed,
      heading,
      timestamp,
    };

    this.callback(point);
  }
}

// Singleton export
export const mockLocationService = new MockLocationService();
