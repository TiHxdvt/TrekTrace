/**
 * GPS 模拟服务
 * 仅在 __DEV__ 模式下可用
 *
 * 从当前位置出发，随机一个 2~5km 外的终点，直直走过去。
 * 速度、精度、海拔有自然波动。
 */

import type { RawLocationPoint } from '../types';

// ======================== 运动模式 ========================

export interface SimProfile {
  name: string;
  baseSpeed: number;
  speedSigma: number;
  targetDistMin: number;  // 米
  targetDistMax: number;
}

export const SIM_PROFILES: Record<string, SimProfile> = {
  walk: {
    name: '步行模拟',
    baseSpeed: 1.4,
    speedSigma: 0.2,
    targetDistMin: 2000,
    targetDistMax: 5000,
  },
  run: {
    name: '跑步模拟',
    baseSpeed: 3.0,
    speedSigma: 0.4,
    targetDistMin: 3000,
    targetDistMax: 5000,
  },
  cycle: {
    name: '骑行模拟',
    baseSpeed: 6.0,
    speedSigma: 0.8,
    targetDistMin: 3000,
    targetDistMax: 5000,
  },
};

// ======================== 工具函数 ========================

function gaussianRandom(mean: number, sigma: number): number {
  const u1 = Math.random();
  const u2 = Math.random();
  return mean + Math.sqrt(-2 * Math.log(u1 || 1e-10)) * Math.cos(2 * Math.PI * u2) * sigma;
}

function move(lat: number, lon: number, angle: number, meters: number): { lat: number; lon: number } {
  const dy = Math.cos(angle) * meters;
  const dx = Math.sin(angle) * meters;
  const cosLat = Math.cos((lat * Math.PI) / 180);
  return {
    lat: lat + dy / 111320,
    lon: lon + dx / (111320 * Math.max(cosLat, 0.01)),
  };
}

function distM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = (lat2 - lat1) * 111320;
  const cosLat = Math.cos(((lat1 + lat2) / 2) * Math.PI / 180);
  const dLon = (lon2 - lon1) * 111320 * Math.max(cosLat, 0.01);
  return Math.sqrt(dLat * dLat + dLon * dLon);
}

function bearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = lat2 - lat1;
  const cosLat = Math.cos(((lat1 + lat2) / 2) * Math.PI / 180);
  const dLon = (lon2 - lon1) * cosLat;
  return Math.atan2(dLon, dLat);
}

// ======================== 类型 ========================

export type MockLocationCallback = (point: RawLocationPoint) => void;

export interface StartPosition {
  latitude: number;
  longitude: number;
}

// ======================== Service ========================

class MockLocationService {
  private timer: ReturnType<typeof setInterval> | null = null;
  private callback: MockLocationCallback | null = null;
  private _isRunning = false;
  private _isPaused = false;

  private lat = 0;
  private lon = 0;
  private speed = 0;
  private altitude = 50;
  private heading = 0;
  private profile: SimProfile = SIM_PROFILES.walk;

  // 终点
  private endLat = 0;
  private endLon = 0;
  private arrived = false;

  get isRunning(): boolean {
    return this._isRunning;
  }

  get isPaused(): boolean {
    return this._isPaused;
  }

  start(
    profileKey: string,
    startPos: StartPosition | null,
    callback: MockLocationCallback,
  ): void {
    this.stop();

    const profile = SIM_PROFILES[profileKey];
    if (!profile) {
      console.warn(`[MockLocation] Unknown profile: ${profileKey}`);
      return;
    }

    this.callback = callback;
    this.profile = profile;

    const start = startPos ?? { latitude: 39.9042, longitude: 116.4074 };
    this.lat = start.latitude;
    this.lon = start.longitude;
    this.speed = profile.baseSpeed;
    this.altitude = 50;

    // 随机方向，终点 2~5km
    const angle = Math.random() * 2 * Math.PI;
    const dist = profile.targetDistMin + Math.random() * (profile.targetDistMax - profile.targetDistMin);
    const end = move(this.lat, this.lon, angle, dist);
    this.endLat = end.lat;
    this.endLon = end.lon;
    this.heading = bearing(this.lat, this.lon, this.endLat, this.endLon);
    this.arrived = false;

    this._isRunning = true;
    this._isPaused = false;

    this.emitPoint(Date.now());

    this.timer = setInterval(() => {
      if (this._isPaused) return;
      this.advance();
      this.emitPoint(Date.now());
    }, 1000);
  }

  pause(): void {
    this._isPaused = true;
  }

  resume(): void {
    this._isPaused = false;
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.callback = null;
    this._isRunning = false;
    this._isPaused = false;
  }

  private advance(): void {
    if (this.arrived) return;

    const d = distM(this.lat, this.lon, this.endLat, this.endLon);

    // 到达终点
    if (d < this.speed * 1.5) {
      this.lat = this.endLat;
      this.lon = this.endLon;
      this.arrived = true;
      this.speed = 0;
      return;
    }

    // 朝终点走
    this.heading = bearing(this.lat, this.lon, this.endLat, this.endLon);

    // 速度波动
    this.speed += gaussianRandom(0, this.profile.speedSigma * 0.15);
    this.speed += (this.profile.baseSpeed - this.speed) * 0.05;
    this.speed = Math.max(this.profile.baseSpeed * 0.5, this.speed);

    const p = move(this.lat, this.lon, this.heading, this.speed);
    this.lat = p.lat;
    this.lon = p.lon;

    // 海拔缓慢变
    this.altitude += gaussianRandom(0, 0.2);
  }

  private emitPoint(timestamp: number): void {
    if (!this.callback) return;

    const accuracy = 5 + Math.random() * 10;
    const noise = accuracy / 111320;

    let headingDeg = (this.heading * 180) / Math.PI;
    if (headingDeg < 0) headingDeg += 360;

    this.callback({
      latitude: this.lat + gaussianRandom(0, noise),
      longitude: this.lon + gaussianRandom(0, noise),
      altitude: this.altitude,
      accuracy,
      speed: this.speed,
      heading: headingDeg,
      timestamp,
    });
  }
}

export const mockLocationService = new MockLocationService();
