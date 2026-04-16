/**
 * 轨迹记录核心服务
 * 单例模式，管理整个记录生命周期
 * 离线优先：所有数据实时写入 AsyncStorage，结束后一次性上传后端
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  RecordingSession,
  RecordingStats,
  TrackSegment,
  ProcessedPoint,
  RawLocationPoint,
  ActivityType,
  TrackPointUploadDTO,
} from '../types';
import { activityService } from './activityService';
import { haversineDistance } from '../utils/geo';
import { GpsKalmanFilter } from '../utils/gpsKalmanFilter';

// ======================== 过滤常量 ========================
const OUTLIER_ACCURACY_THRESHOLD = 200; // 米 - 精度差于此值直接丢弃（极端漂移）
const OUTLIER_JUMP_SPEED = 150;         // m/s - 超过此速度视为异常跳跃
const ELEVATION_BUFFER_SIZE = 5; // 滑动平均窗口

const NOTIFY_THROTTLE_MS = 500; // notify 节流间隔
const PERSIST_INTERVAL_MS = 5000; // 批量持久化间隔
const PERSIST_POINT_THRESHOLD = 10; // 每积累 N 个点强制持久化

// ======================== Storage Keys ========================
const SESSION_KEY = '@trektrace:recording_session';

// ======================== UID ========================
function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ======================== Timestamp ========================
function normalizeTimestamp(ts: number): string {
  // Android GPS timestamp 通常是毫秒，某些设备可能返回秒
  const ms = ts > 1e12 ? ts : ts * 1000;
  return new Date(ms).toISOString();
}

// ======================== Callbacks ========================
type StateCallback = (session: RecordingSession | null, stats: RecordingStats) => void;

// ======================== Service ========================
class TrackRecordingServiceImpl {
  private session: RecordingSession | null = null;
  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private lastAcceptedPoint: ProcessedPoint | null = null;
  private lastAcceptedTimestampMs = 0; // 缓存原始毫秒时间戳，避免重复解析 ISO
  private elevationBuffer: number[] = [];
  private elevationGainAccum = 0;
  private lastSmoothedAltitude: number | null = null;
  private listeners: Set<StateCallback> = new Set();
  private lastNotifyTime = 0;
  private notifyPending = false;
  private persistTimer: ReturnType<typeof setInterval> | null = null;
  private pointsSinceLastPersist = 0;
  private kalmanFilter: GpsKalmanFilter = new GpsKalmanFilter();

  // 真实时间计时
  private recordingStartWallTime = 0; // 当前 recording 段开始的 Date.now()
  private pausedAccum = 0;            // 之前所有 recording 段累计的真实秒数

  // ---------- Subscribe ----------
  subscribe(cb: StateCallback): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify(): void {
    const now = Date.now();
    const elapsed = now - this.lastNotifyTime;

    if (elapsed >= NOTIFY_THROTTLE_MS) {
      this.lastNotifyTime = now;
      this.doNotify();
    } else if (!this.notifyPending) {
      this.notifyPending = true;
      setTimeout(() => {
        this.notifyPending = false;
        this.lastNotifyTime = Date.now();
        this.doNotify();
      }, NOTIFY_THROTTLE_MS - elapsed);
    }
  }

  private doNotify(): void {
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
        const allPoints = this.getAllPoints();
        if (allPoints.length > 0) {
          this.lastAcceptedPoint = allPoints[allPoints.length - 1];
          this.lastAcceptedTimestampMs = new Date(this.lastAcceptedPoint.timestamp).getTime();
        }

        // Reset Kalman filter and seed from last persisted point
        this.kalmanFilter.reset();
        if (allPoints.length > 0) {
          const last = allPoints[allPoints.length - 1];
          this.kalmanFilter.seedPosition(last.latitude, last.longitude, 10);
        }

        // Restore elevation state from persisted data
        this.elevationGainAccum = saved.elevationGain;
        if (allPoints.length > 0) {
          this.lastSmoothedAltitude = allPoints[allPoints.length - 1].altitude;
          // Rebuild buffer with recent points for smooth continuation
          const recent = allPoints.slice(-ELEVATION_BUFFER_SIZE);
          this.elevationBuffer = recent.map(p => p.altitude);
        }

        // Restart timers if actively recording
        if (saved.status === 'recording') {
          // 恢复计时：已持久化的 totalDuration 作为 pausedAccum，
          // startTimer 会用 recordingStartWallTime = Date.now() 开始新段
          this.pausedAccum = saved.totalDuration;
          this.recordingStartWallTime = 0;
          this.pointsSinceLastPersist = 0;
          this.startTimer(); // 会设置 recordingStartWallTime 并用 pausedAccum 计算真实时长
          this.startPersistTimer();
        } else {
          // paused 状态：totalDuration 已经是暂停前的真实值
          this.pausedAccum = saved.totalDuration;
          this.recordingStartWallTime = 0;
        }

        this.doNotify();
        return saved;
      }
    } catch {
      // ignore parse errors
    }
    return null;
  }

  // ---------- Start ----------
  async startRecording(activityType: ActivityType): Promise<void> {
    // 保护：如果存在未上传的记录，拒绝启动新记录
    if (this.session && this.session.status === 'stopped' && !this.session.uploadedToServer) {
      throw new Error('UNSYNCED_RECORD');
    }

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
    this.lastAcceptedTimestampMs = 0;
    this.elevationBuffer = [];
    this.elevationGainAccum = 0;
    this.lastSmoothedAltitude = null;
    this.recordingStartWallTime = 0;
    this.pausedAccum = 0;
    this.kalmanFilter.reset();

    this.pointsSinceLastPersist = 0;
    this.startTimer();
    this.startPersistTimer();
    await this.persist();
    this.doNotify();
  }

  // ---------- Process Location ----------
  async processLocation(raw: RawLocationPoint): Promise<boolean> {
    if (!this.session || this.session.status !== 'recording') return false;

    // Pre-filter 1: extreme accuracy — discard GPS in very bad conditions
    if (raw.accuracy > OUTLIER_ACCURACY_THRESHOLD) return false;

    // Pre-filter 2: sudden jump with unreasonable speed
    if (this.lastAcceptedTimestampMs > 0) {
      const jumpDist = haversineDistance(
        this.lastAcceptedPoint!.latitude,
        this.lastAcceptedPoint!.longitude,
        raw.latitude,
        raw.longitude,
      );
      const timeDiff = (raw.timestamp - this.lastAcceptedTimestampMs) / 1000;
      if (timeDiff > 0 && jumpDist / timeDiff > OUTLIER_JUMP_SPEED) {
        return false;
      }
    }

    // Kalman filter smoothing
    const filtered = this.kalmanFilter.process({
      latitude: raw.latitude,
      longitude: raw.longitude,
      accuracy: raw.accuracy,
      timestamp: raw.timestamp,
    });

    // Discard outliers flagged by the Kalman filter
    if (filtered.isOutlier) return false;

    // Compute distance using smoothed coordinates
    let dist = 0;
    if (this.lastAcceptedPoint) {
      dist = haversineDistance(
        this.lastAcceptedPoint.latitude,
        this.lastAcceptedPoint.longitude,
        filtered.latitude,
        filtered.longitude,
      );
    }

    // Accept point with smoothed coordinates
    const altitude = this.smoothElevation(raw.altitude);
    this.lastSmoothedAltitude = altitude;

    const point: ProcessedPoint = {
      latitude: filtered.latitude,
      longitude: filtered.longitude,
      altitude,
      timestamp: normalizeTimestamp(raw.timestamp),
      speed: raw.speed,
    };

    // Accumulate distance
    if (dist > 0) {
      this.session.totalDistance += dist;
    }

    // Update elevation
    this.session.elevationGain = this.elevationGainAccum;

    // Add to current segment
    const currentSegment = this.session.segments[this.session.segments.length - 1];
    currentSegment.points.push(point);
    currentSegment.endTime = point.timestamp;

    this.lastAcceptedPoint = point;
    this.lastAcceptedTimestampMs = raw.timestamp;

    this.pointsSinceLastPersist++;
    this.schedulePersist();
    this.notify();
    return true;
  }

  // ---------- Pause ----------
  async pauseRecording(): Promise<void> {
    if (!this.session || this.session.status !== 'recording') return;
    // 暂停前把当前段的真实耗时累加到 pausedAccum
    this.finalizeDuration();
    this.pausedAccum = this.session.totalDuration;
    this.recordingStartWallTime = 0;
    this.session.status = 'paused';
    this.stopTimer();
    await this.persist();
    this.doNotify();
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
    this.lastAcceptedPoint = null;
    this.lastAcceptedTimestampMs = 0;
    this.pointsSinceLastPersist = 0;
    this.kalmanFilter.reset();
    this.startTimer();
    this.startPersistTimer();
    await this.persist();
    this.doNotify();
  }

  // ---------- Stop ----------
  async stopRecording(): Promise<boolean> {
    if (!this.session) return false;
    // 最终校正 totalDuration
    this.finalizeDuration();
    this.stopTimer();
    this.session.endTime = new Date().toISOString();
    this.session.status = 'stopped';
    await this.persist();
    this.doNotify();
    return true;
  }

  // ---------- Retry upload (for failed uploads) ----------
  async retryUpload(): Promise<boolean> {
    if (!this.session || this.session.status !== 'stopped') return false;
    this.session.endTime = this.session.endTime ?? new Date().toISOString();

    try {
      await this.uploadToServer();
      this.session.status = 'idle';
      this.session.uploadedToServer = true;
      await this.clearStorage();
      this.doNotify();
      return true;
    } catch (err) {
      console.error('Retry upload failed:', err);
      return false;
    }
  }

  // ---------- Discard ----------
  async discardRecording(): Promise<void> {
    this.session = null;
    this.lastAcceptedPoint = null;
    this.lastAcceptedTimestampMs = 0;
    this.elevationBuffer = [];
    this.elevationGainAccum = 0;
    this.lastSmoothedAltitude = null;
    this.recordingStartWallTime = 0;
    this.pausedAccum = 0;
    this.kalmanFilter.reset();
    this.stopTimer();
    await this.clearStorage();
    this.doNotify();
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
      if (diff > 0) {
        this.elevationGainAccum += diff;
      }
    }

    return avg;
  }

  private startTimer(): void {
    this.stopTimer();
    this.recordingStartWallTime = Date.now();
    this.timerInterval = setInterval(() => {
      if (this.session && this.session.status === 'recording') {
        this.syncDuration();
        this.doNotify();
      }
    }, 1000);
  }

  /** 根据 wall clock 校正 totalDuration */
  private syncDuration(): void {
    if (!this.session || this.recordingStartWallTime === 0) return;
    const elapsed = Math.floor((Date.now() - this.recordingStartWallTime) / 1000);
    this.session.totalDuration = this.pausedAccum + elapsed;
  }

  /** 停止/暂停前调用，确保 totalDuration 是最终准确值 */
  private finalizeDuration(): void {
    this.syncDuration();
  }

  private startPersistTimer(): void {
    if (this.persistTimer) clearInterval(this.persistTimer);
    this.persistTimer = setInterval(() => {
      if (this.pointsSinceLastPersist > 0) {
        this.persist();
        this.pointsSinceLastPersist = 0;
      }
    }, PERSIST_INTERVAL_MS);
  }

  /** Persist now if point threshold reached, otherwise rely on the interval timer */
  private schedulePersist(): void {
    if (this.pointsSinceLastPersist >= PERSIST_POINT_THRESHOLD) {
      this.persist();
      this.pointsSinceLastPersist = 0;
    }
  }

  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    if (this.persistTimer) {
      clearInterval(this.persistTimer);
      this.persistTimer = null;
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
