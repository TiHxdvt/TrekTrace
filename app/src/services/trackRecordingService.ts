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

// ======================== 过滤常量 ========================
const DISTANCE_FILTER = 5; // 米 - 两点间最小距离
const SPEED_FILTER = 1; // m/s - 最小有效速度
const ACCURACY_FILTER = 30; // 米 - 最大允许精度
const ELEVATION_BUFFER_SIZE = 5; // 滑动平均窗口

// ======================== 瞬移检测常量 ========================
const MAX_SPEED_BY_ACTIVITY: Record<string, number> = {
  HIKING: 6,   // 21.6 km/h — 极限越野跑下坡
  RUNNING: 12, // 43.2 km/h — 短跑冲刺
  CYCLING: 25, // 90 km/h   — 职业下坡
};
const SIGNAL_LOSS_THRESHOLD = 30; // 秒 — 超过此时长视为信号丢失
const MAX_JUMP_DURING_SIGNAL_LOSS: Record<string, number> = {
  HIKING: 200,  // 米
  RUNNING: 400,
  CYCLING: 800,
};
const NOTIFY_THROTTLE_MS = 500; // notify 节流间隔
const PERSIST_INTERVAL_MS = 5000; // 批量持久化间隔
const PERSIST_POINT_THRESHOLD = 10; // 每积累 N 个点强制持久化

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
  private elevationBuffer: number[] = [];
  private elevationGainAccum = 0;
  private lastSmoothedAltitude: number | null = null;
  private listeners: Set<StateCallback> = new Set();
  private lastNotifyTime = 0;
  private notifyPending = false;
  private persistTimer: ReturnType<typeof setInterval> | null = null;
  private pointsSinceLastPersist = 0;

  // 瞬移检测状态
  private suspiciousPoint: ProcessedPoint | null = null;
  private lastAcceptedTimestamp: number = 0;

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
          // 恢复最后接受点的时间戳
          const lastTs = allPoints[allPoints.length - 1].timestamp;
          this.lastAcceptedTimestamp = new Date(lastTs).getTime();
        }

        // 瞬移检测状态重置
        this.suspiciousPoint = null;

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
    this.elevationBuffer = [];
    this.elevationGainAccum = 0;
    this.lastSmoothedAltitude = null;
    this.suspiciousPoint = null;
    this.lastAcceptedTimestamp = 0;
    this.recordingStartWallTime = 0;
    this.pausedAccum = 0;

    this.pointsSinceLastPersist = 0;
    this.startTimer();
    this.startPersistTimer();
    await this.persist();
    this.doNotify();
  }

  // ---------- Process Location ----------
  async processLocation(raw: RawLocationPoint): Promise<boolean> {
    if (!this.session || this.session.status !== 'recording') return false;

    // Filter 1: accuracy
    if (raw.accuracy > ACCURACY_FILTER) return false;

    // Filter 2: speed (skip for first point)
    if (this.lastAcceptedPoint !== null && raw.speed < SPEED_FILTER) return false;

    // Filter 3: distance (reuse computed distance)
    let dist = 0;
    if (this.lastAcceptedPoint) {
      dist = haversineDistance(
        this.lastAcceptedPoint.latitude,
        this.lastAcceptedPoint.longitude,
        raw.latitude,
        raw.longitude,
      );
      if (dist < DISTANCE_FILTER) return false;
    }

    // Filter 4: 瞬移检测 — 基于活动类型的最大速度 / 信号丢失距离上限
    if (this.lastAcceptedPoint && dist > 0) {
      const rawTs = raw.timestamp;
      const prevTs = this.lastAcceptedTimestamp;
      const timeDeltaSec = prevTs > 0 ? Math.abs(rawTs - prevTs) / 1000 : 0;

      // 如果存在可疑缓冲点，对比距离应从可疑点而非上一个接受点计算
      const referencePoint = this.suspiciousPoint ?? this.lastAcceptedPoint;
      const distFromRef = this.suspiciousPoint
        ? haversineDistance(referencePoint.latitude, referencePoint.longitude, raw.latitude, raw.longitude)
        : dist;

      const activityType = this.session.activityType;
      const maxSpeed = MAX_SPEED_BY_ACTIVITY[activityType] ?? MAX_SPEED_BY_ACTIVITY.HIKING;
      const maxJump = MAX_JUMP_DURING_SIGNAL_LOSS[activityType] ?? MAX_JUMP_DURING_SIGNAL_LOSS.HIKING;

      let isTeleport = false;
      if (timeDeltaSec > 0 && timeDeltaSec < SIGNAL_LOSS_THRESHOLD) {
        // 正常间隔：严格速度检查
        const impliedSpeed = distFromRef / timeDeltaSec;
        isTeleport = impliedSpeed > maxSpeed;
      } else if (timeDeltaSec >= SIGNAL_LOSS_THRESHOLD) {
        // 信号丢失后恢复：距离上限检查
        isTeleport = distFromRef > maxJump;
      }

      if (isTeleport) {
        // 缓冲可疑点（不直接丢弃，等下一个点确认）
        this.suspiciousPoint = {
          latitude: raw.latitude,
          longitude: raw.longitude,
          altitude: this.smoothElevation(raw.altitude),
          timestamp: normalizeTimestamp(raw.timestamp),
          speed: raw.speed,
        };
        // 回滚平滑海拔（因为 smoothing side effect 不应保留）
        this.elevationBuffer.pop();
        return false;
      }

      // 新点正常 → 如果之前有可疑点则确认丢弃
      if (this.suspiciousPoint) {
        this.suspiciousPoint = null;
      }
    }

    // Accept point
    const altitude = this.smoothElevation(raw.altitude);
    this.lastSmoothedAltitude = altitude;

    const point: ProcessedPoint = {
      latitude: raw.latitude,
      longitude: raw.longitude,
      altitude,
      timestamp: normalizeTimestamp(raw.timestamp),
      speed: raw.speed,
    };

    // Accumulate distance (reuse already computed value)
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
    this.lastAcceptedTimestamp = raw.timestamp;

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
    this.suspiciousPoint = null;
    this.lastAcceptedTimestamp = 0;
    this.pointsSinceLastPersist = 0;
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
    this.elevationBuffer = [];
    this.elevationGainAccum = 0;
    this.lastSmoothedAltitude = null;
    this.suspiciousPoint = null;
    this.lastAcceptedTimestamp = 0;
    this.recordingStartWallTime = 0;
    this.pausedAccum = 0;
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
