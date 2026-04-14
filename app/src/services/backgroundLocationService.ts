/**
 * 后台定位服务
 * 使用 react-native-background-actions（Android 前台服务 + 通知 / iOS 后台保活）
 * 和 react-native-geolocation-service（独立 GPS 数据流）实现后台持续轨迹记录。
 */

import { Platform, PermissionsAndroid } from 'react-native';
import BackgroundService from 'react-native-background-actions';
import Geolocation from 'react-native-geolocation-service';
import { trackRecordingService } from './trackRecordingService';
import type { ActivityType, RawLocationPoint } from '../types';

const ACTIVITY_LABEL: Record<ActivityType, string> = {
  HIKING: '徒步',
  RUNNING: '跑步',
  CYCLING: '骑行',
};

class BackgroundLocationServiceImpl {
  private watchId: number | null = null;
  private isRunning = false;
  private isPaused = false;
  private activityType: ActivityType = 'RUNNING';
  private notificationTimer: ReturnType<typeof setInterval> | null = null;

  // ---------- Permissions ----------

  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'android') {
      // Android 10+ 需要后台定位权限（ACCESS_BACKGROUND_LOCATION 已在 Manifest 中声明）
      // 先确保前台权限已授予
      const fineGranted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      );
      if (!fineGranted) {
        const fgResult = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        );
        if (fgResult !== PermissionsAndroid.RESULTS.GRANTED) {
          return false;
        }
      }

      // Android 10+ 请求后台定位
      if (Platform.Version >= 29) {
        const bgGranted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION as any,
        );
        if (!bgGranted) {
          const bgResult = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION as any,
          );
          // 用户可能拒绝后台但允许前台 —— 后台定位会失败但至少不崩溃
          if (bgResult !== PermissionsAndroid.RESULTS.GRANTED) {
            return false;
          }
        }
      }
      return true;
    }

    // iOS
    const auth = await Geolocation.requestAuthorization('always');
    return auth === 'granted';
  }

  // ---------- Start ----------

  async start(activityType: ActivityType): Promise<void> {
    if (this.isRunning) return;

    this.activityType = activityType;

    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      const err = new Error('LOCATION_PERMISSION_DENIED') as Error & { code?: string };
      err.code = 'LOCATION_PERMISSION_DENIED';
      throw err;
    }

    this.isRunning = true;
    this.isPaused = false;

    const taskName = `trektrace_${activityType.toLowerCase()}`;

    const options = {
      taskName,
      taskTitle: `途迹正在${ACTIVITY_LABEL[activityType]}`,
      taskDesc: '正在记录运动轨迹',
      taskIcon: { name: 'ic_notification', type: 'drawable' },
      color: '#3b82f6',
      linkingURI: 'trektrace://activity',
      progressBar: { max: 0, value: 0, indeterminate: false },
      foregroundServiceType: ['location' as const],
    };

    await BackgroundService.start(this.backgroundTask.bind(this), options);

    // Start geolocation watch after background service is up
    this.startWatch();
  }

  // ---------- Pause ----------

  pause(): void {
    if (!this.isRunning || this.isPaused) return;
    this.isPaused = true;
    this.stopWatch();
    // Keep the background service + notification alive
  }

  // ---------- Resume ----------

  resume(): void {
    if (!this.isRunning || !this.isPaused) return;
    this.isPaused = false;
    this.startWatch();
  }

  // ---------- Stop ----------

  async stop(): Promise<void> {
    this.stopWatch();
    this.stopNotificationTimer();
    this.isRunning = false;
    this.isPaused = false;
    if (BackgroundService.isRunning()) {
      await BackgroundService.stop();
    }
  }

  // ---------- Getters ----------

  get running(): boolean {
    return this.isRunning;
  }

  get paused(): boolean {
    return this.isPaused;
  }

  // ---------- Private ----------

  private async backgroundTask(): Promise<void> {
    // Keep the background task alive — the actual work is done by Geolocation.watchPosition
    // This function must not resolve until stop() is called
    this.startNotificationTimer();
    await new Promise<void>(() => {
      // Never resolves — stop() cancels the BackgroundService
    });
  }

  private startWatch(): void {
    this.stopWatch();

    this.watchId = Geolocation.watchPosition(
      (position) => {
        if (!this.isRunning || this.isPaused) return;

        const { coords } = position;
        if (!coords.latitude || !coords.longitude) return;

        const rawPoint: RawLocationPoint = {
          latitude: coords.latitude,
          longitude: coords.longitude,
          altitude: coords.altitude ?? 0,
          accuracy: coords.accuracy ?? 999,
          speed: coords.speed ?? 0,
          heading: coords.heading ?? 0,
          timestamp: position.timestamp,
        };

        trackRecordingService.processLocation(rawPoint);
      },
      (error) => {
        console.warn('[BackgroundLocation] watchPosition error:', error.message);
      },
      {
        enableHighAccuracy: true,
        distanceFilter: 2,
        interval: 1000,
        fastestInterval: 500,
        forceLocationManager: true, // 中国安卓设备兼容，不依赖 Google Play Services
        showsBackgroundLocationIndicator: true, // iOS 状态栏蓝色指示条
      },
    );
  }

  private stopWatch(): void {
    if (this.watchId !== null) {
      Geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  private startNotificationTimer(): void {
    this.stopNotificationTimer();
    // Update notification text every 5 seconds with current distance & duration
    this.notificationTimer = setInterval(() => {
      if (!BackgroundService.isRunning()) return;

      const stats = trackRecordingService.getStats();
      const distKm = (stats.distance / 1000).toFixed(2);
      const durationMin = Math.floor(stats.duration / 60);
      const durationSec = stats.duration % 60;
      const durationStr = durationMin > 0
        ? `${durationMin}分${durationSec}秒`
        : `${durationSec}秒`;

      BackgroundService.updateNotification({
        taskTitle: `途迹正在${ACTIVITY_LABEL[this.activityType]}`,
        taskDesc: `${distKm} km · ${durationStr}`,
      });
    }, 5000);
  }

  private stopNotificationTimer(): void {
    if (this.notificationTimer) {
      clearInterval(this.notificationTimer);
      this.notificationTimer = null;
    }
  }
}

export const backgroundLocationService = new BackgroundLocationServiceImpl();
