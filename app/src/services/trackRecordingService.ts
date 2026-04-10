/**
 * 轨迹记录核心服务
 * 单例模式，管理整个记录生命周期
 * 离线优先：所有数据实时写入 AsyncStorage，结束后一次性上传后端
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  RecordingSession,
  RecordingStatus,
  RecordingStats,
  TrackSegment,
  ProcessedPoint,
  RawLocationPoint,
  ActivityType,
  TrackPointUploadDTO,
} from '../types';
import { activityService } from './activityService';

// ======================== 过滤常量 ========================
const DISTANCE_FILTER = 5; // 米 - 两点间最小距离
const SPEED_FILTER = 1; // m/s - 最小有效速度
const ACCURACY_FILTER = 30; // 米 - 最大允许精度
const ELEVATION_BUFFER_SIZE = 5; // 滑动平均窗口
const ELEVATION_MIN_DIFF = 3; // 米 - 海拔累计阈值

// ======================== Storage Keys ========================
const SESSION_KEY = '@trektrace:recording_session';

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
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ======================== UID ========================
function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ======================== Callbacks ========================
type StateCallback = (session: RecordingSession | null, stats: RecordingStats) => void;

// ======================== Service ========================
class TrackRecordingServiceImpl {
  private session: RecordingSession | null = null;
  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private lastAcceptedPoint: ProcessedPoint | null = null;
  private elevationBuffer: number[] = [];
  private elevationGainAccum = 0;
  private lastSmoothedAltitude: number | null = null;
  private listeners: Set<StateCallback> = new Set();

  // ---------- Subscribe ----------
  subscribe(cb: StateCallback): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify(): void {
    const stats = this.getStats();
    for (const cb of this.listeners) {
      cb(this.session, stats);
    }
  }

  // ---------- Recover ----------
  async recoverSession(): Promise<RecordingSession | null> {
    try {
      const raw = await AsyncStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const saved: RecordingSession = JSON.parse(raw);
      if (saved && saved.status !== 'idle' && !saved.uploadedToServer) {
        this.session = saved;
        // Restore last point from segments
        const allPoints = this.getAllPoints();
        if (allPoints.length > 0) {
          this.lastAcceptedPoint = allPoints[allPoints.length - 1];
        }
        this.notify();
        return saved;
      }
    } catch {
      // ignore parse errors
    }
    return null;
  }

  // ---------- Start ----------
  async startRecording(activityType: ActivityType): Promise<void> {
    const now = new Date().toISOString();
    const segment: TrackSegment = {
      id: uid(),
      points: [],
      startTime: now,
    };

    this.session = {
      id: uid(),
      activityType,
      startTime: now,
      status: 'recording',
      totalDistance: 0,
      totalDuration: 0,
      elevationGain: 0,
      segments: [segment],
      uploadedToServer: false,
    };

    this.lastAcceptedPoint = null;
    this.elevationBuffer = [];
    this.elevationGainAccum = 0;
    this.lastSmoothedAltitude = null;

    this.startTimer();
    await this.persist();
    this.notify();
  }

  // ---------- Process Location ----------
  async processLocation(raw: RawLocationPoint): Promise<boolean> {
    if (!this.session || this.session.status !== 'recording') return false;

    // Filter 1: accuracy
    if (raw.accuracy > ACCURACY_FILTER) return false;

    // Filter 2: speed (skip for first point)
    if (this.lastAcceptedPoint !== null && raw.speed < SPEED_FILTER) return false;

    // Filter 3: distance
    if (this.lastAcceptedPoint) {
      const dist = haversineDistance(
        this.lastAcceptedPoint.latitude,
        this.lastAcceptedPoint.longitude,
        raw.latitude,
        raw.longitude,
      );
      if (dist < DISTANCE_FILTER) return false;
    }

    // Accept point
    const altitude = this.smoothElevation(raw.altitude);
    this.lastSmoothedAltitude = altitude;

    const point: ProcessedPoint = {
      latitude: raw.latitude,
      longitude: raw.longitude,
      altitude,
      timestamp: new Date(raw.timestamp).toISOString(),
      speed: raw.speed,
    };

    // Update distance
    if (this.lastAcceptedPoint) {
      const dist = haversineDistance(
        this.lastAcceptedPoint.latitude,
        this.lastAcceptedPoint.longitude,
        point.latitude,
        point.longitude,
      );
      this.session.totalDistance += dist;
    }

    // Update elevation
    this.session.elevationGain = this.elevationGainAccum;

    // Add to current segment
    const currentSegment = this.session.segments[this.session.segments.length - 1];
    currentSegment.points.push(point);
    currentSegment.endTime = point.timestamp;

    this.lastAcceptedPoint = point;

    await this.persist();
    this.notify();
    return true;
  }

  // ---------- Pause ----------
  async pauseRecording(): Promise<void> {
    if (!this.session || this.session.status !== 'recording') return;
    this.session.status = 'paused';
    this.stopTimer();
    await this.persist();
    this.notify();
  }

  // ---------- Resume ----------
  async resumeRecording(): Promise<void> {
    if (!this.session || this.session.status !== 'paused') return;
    const now = new Date().toISOString();
    const newSegment: TrackSegment = {
      id: uid(),
      points: [],
      startTime: now,
    };
    this.session.segments.push(newSegment);
    this.session.status = 'recording';
    this.lastAcceptedPoint = null; // Allow first point regardless of distance
    this.startTimer();
    await this.persist();
    this.notify();
  }

  // ---------- Stop ----------
  async stopRecording(): Promise<void> {
    if (!this.session) return;
    this.session.status = 'idle';
    this.session.endTime = new Date().toISOString();
    this.stopTimer();

    try {
      await this.uploadToServer();
      this.session.uploadedToServer = true;
      await this.persist();
    } catch (err) {
      console.error('Upload failed, data preserved locally:', err);
      await this.persist();
    }

    this.notify();
    // Clear local data after successful upload
    if (this.session.uploadedToServer) {
      await this.clearStorage();
    }
  }

  // ---------- Discard ----------
  async discardRecording(): Promise<void> {
    this.session = null;
    this.lastAcceptedPoint = null;
    this.elevationBuffer = [];
    this.elevationGainAccum = 0;
    this.lastSmoothedAltitude = null;
    this.stopTimer();
    await this.clearStorage();
    this.notify();
  }

  // ---------- Get Polyline Segments ----------
  getPolylineSegments(): Array<Array<{ latitude: number; longitude: number }>> {
    if (!this.session) return [];
    return this.session.segments
      .filter(s => s.points.length >= 2)
      .map(s => s.points.map(p => ({ latitude: p.latitude, longitude: p.longitude })));
  }

  // ---------- Get Stats ----------
  getStats(): RecordingStats {
    if (!this.session) {
      return { distance: 0, duration: 0, currentPace: 0, elevationGain: 0, currentSpeed: 0 };
    }
    const pace = this.session.totalDistance > 0
      ? (this.session.totalDuration / (this.session.totalDistance / 1000))
      : 0;

    const lastPoint = this.lastAcceptedPoint;
    return {
      distance: this.session.totalDistance,
      duration: this.session.totalDuration,
      currentPace: pace,
      elevationGain: this.session.elevationGain,
      currentSpeed: lastPoint?.speed ?? 0,
    };
  }

  // ======================== Private ========================

  private smoothElevation(rawAlt: number): number {
    this.elevationBuffer.push(rawAlt);
    if (this.elevationBuffer.length > ELEVATION_BUFFER_SIZE) {
      this.elevationBuffer.shift();
    }
    const avg = this.elevationBuffer.reduce((a, b) => a + b, 0) / this.elevationBuffer.length;

    if (this.lastSmoothedAltitude !== null) {
      const diff = avg - this.lastSmoothedAltitude;
      if (diff > ELEVATION_MIN_DIFF) {
        this.elevationGainAccum += diff;
      }
    }

    return avg;
  }

  private startTimer(): void {
    this.stopTimer();
    this.timerInterval = setInterval(() => {
      if (this.session && this.session.status === 'recording') {
        this.session.totalDuration += 1;
        this.notify();
      }
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private getAllPoints(): ProcessedPoint[] {
    if (!this.session) return [];
    return this.session.segments.flatMap(s => s.points);
  }

  private async persist(): Promise<void> {
    if (this.session && this.session.status !== 'idle') {
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(this.session));
    }
  }

  private async clearStorage(): Promise<void> {
    await AsyncStorage.removeItem(SESSION_KEY);
  }

  private async uploadToServer(): Promise<void> {
    if (!this.session) return;

    const allPoints = this.getAllPoints();
    const trackPoints: TrackPointUploadDTO[] = allPoints.map(p => ({
      latitude: p.latitude,
      longitude: p.longitude,
      altitude: p.altitude,
      speed: p.speed ?? 0,
      timestamp: p.timestamp,
    }));

    await activityService.uploadActivity({
      type: this.session.activityType,
      startTime: this.session.startTime,
      endTime: this.session.endTime ?? new Date().toISOString(),
      duration: this.session.totalDuration,
      distance: this.session.totalDistance,
      elevationGain: this.session.elevationGain,
      trackPoints,
    });
  }
}

// Singleton export
export const trackRecordingService = new TrackRecordingServiceImpl();
