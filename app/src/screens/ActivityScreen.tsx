/**
 * 运动记录页面
 * 地图卡片底部控制面板：四角数据 + 中间双按钮
 * 集成 TrackRecordingService 实现实时轨迹记录
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  PermissionsAndroid,
  Platform,
  Animated,
  Alert,
} from 'react-native';
import { BlurView } from '@react-native-community/blur';
import { MapView, AMapSdk, MapType, Polyline } from 'react-native-amap3d';
import type { NativeSyntheticEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, BORDER_RADIUS } from '../theme';
import { APP_CONFIG } from '../config';
import {
  IconHamburgerMenu,
  IconMagnifer,
  IconMicrophone,
  IconRunning,
  IconBicycle,
  IconBonfire,
  IconCompass,
  IconGps,
  IconPlay,
  IconPause,
  IconStop,
} from '../components/SolarIcons';
import { trackRecordingService } from '../services/trackRecordingService';
import type {
  ActivityType,
  RecordingSession,
  RecordingStats,
  RawLocationPoint,
} from '../types';

type ActivityTypeLocal = 'running' | 'cycling' | 'hiking';
type GpsStrength = 'none' | 'weak' | 'medium' | 'strong';

const GPS_COLORS: Record<GpsStrength, string> = {
  none: COLORS.TEXT.DISABLED,
  weak: COLORS.ERROR,
  medium: COLORS.WARNING,
  strong: COLORS.SUCCESS,
};

const ACTIVITY_CYCLE: ActivityTypeLocal[] = ['hiking', 'running', 'cycling'];
const PANEL_HEIGHT = 105;
const LONG_PRESS_DURATION = 1500;

const ACTIVITY_ICONS: Record<ActivityTypeLocal, React.FC<{ size?: number; color?: string }>> = {
  running: IconRunning,
  cycling: IconBicycle,
  hiking: IconBonfire,
};

const ACTIVITY_TYPE_MAP: Record<ActivityTypeLocal, ActivityType> = {
  hiking: 'HIKING',
  running: 'RUNNING',
  cycling: 'CYCLING',
};

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatPace(secondsPerKm: number): string {
  if (secondsPerKm <= 0 || !isFinite(secondsPerKm)) return "--'--\"";
  const m = Math.floor(secondsPerKm / 60);
  const s = Math.floor(secondsPerKm % 60);
  return `${m}'${String(s).padStart(2, '0')}"`;
}

export const ActivityScreen: React.FC = () => {
  const [activityIndex, setActivityIndex] = useState(1); // 默认跑步
  const insets = useSafeAreaInsets();
  const mapViewRef = useRef<MapView>(null);
  const hasMovedToLocation = useRef(false);
  const latestLocation = useRef<{ latitude: number; longitude: number } | null>(null);
  const shouldFollowRef = useRef(true);
  const [hasGps, setHasGps] = useState(false);
  const [gpsStrength, setGpsStrength] = useState<GpsStrength>('none');
  const gpsStrengthRef = useRef<GpsStrength>('none');
  const gpsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const pulseAnim = useRef<Animated.Value>(new Animated.Value(1)).current;

  // Recording state from service
  const [session, setSession] = useState<RecordingSession | null>(null);
  const [stats, setStats] = useState<RecordingStats>({
    distance: 0,
    duration: 0,
    currentPace: 0,
    elevationGain: 0,
    currentSpeed: 0,
  });
  const [polylineSegments, setPolylineSegments] = useState<Array<Array<{ latitude: number; longitude: number }>>>([]);

  // Long press stop state
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressProgress = useRef<Animated.Value>(new Animated.Value(0)).current;

  // Use ref for isRecording to avoid handleLocation re-creation
  const isRecordingRef = useRef(false);

  // Derived state
  const isIdle = !session || session.status === 'idle' || session.status === 'stopped';
  const isRecording = session?.status === 'recording';
  const isPaused = session?.status === 'paused';
  const isStopped = session?.status === 'stopped';

  // Keep ref in sync
  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  // Subscribe to recording service
  useEffect(() => {
    const unsubscribe = trackRecordingService.subscribe((s, st) => {
      setSession(s);
      setStats(st);
      setPolylineSegments(trackRecordingService.getPolylineSegments());
    });
    return unsubscribe;
  }, []);

  // Crash recovery on mount
  useEffect(() => {
    const checkRecovery = async () => {
      const recovered = await trackRecordingService.recoverSession();
      if (recovered) {
        if (recovered.status === 'stopped') {
          Alert.alert(
            '上传未完成',
            '上次运动的记录上传失败，是否重试？',
            [
              { text: '丢弃', style: 'destructive', onPress: () => trackRecordingService.discardRecording() },
              { text: '重试上传', onPress: () => trackRecordingService.retryUpload() },
            ],
          );
        } else {
          Alert.alert(
            '恢复记录',
            '检测到未完成的运动记录，是否恢复？',
            [
              { text: '丢弃', style: 'destructive', onPress: () => trackRecordingService.discardRecording() },
              { text: '恢复', style: 'default' },
            ],
          );
        }
      }
    };
    checkRecovery();
  }, []);

  // GPS 定位中脉冲动画
  useEffect(() => {
    if (gpsStrength === 'none') {
      pulseAnim.setValue(1);
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [gpsStrength]);

  // 初始化高德地图 SDK + 请求定位权限
  useEffect(() => {
    AMapSdk.init(APP_CONFIG.AMAP_API_KEY);

    const enableLocation = async () => {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.requestMultiple([
          'android.permission.ACCESS_FINE_LOCATION',
          'android.permission.ACCESS_COARSE_LOCATION',
        ]).catch(() => null as any);
        if (granted) {
          setLocationEnabled(true);
        }
      } else {
        setLocationEnabled(true);
      }
    };
    enableLocation();
    return () => {
      if (gpsTimeoutRef.current) clearTimeout(gpsTimeoutRef.current);
    };
  }, []);

  // 首次获取定位后，移动相机到当前位置
  const handleLocation = useCallback((event: NativeSyntheticEvent<{
    timestamp: number;
    coords: {
      latitude: number;
      longitude: number;
      accuracy: number;
      altitude: number;
      speed: number;
      heading: number;
    };
  }>) => {
    const { coords } = event.nativeEvent;
    const { latitude, longitude, accuracy, altitude, speed, heading } = coords;
    if (latitude && longitude) {
      latestLocation.current = { latitude, longitude };
      if (!hasGps) setHasGps(true);

      // 根据 GPS 精度判断信号强度，仅在变化时更新避免高频重渲染
      let newStrength: GpsStrength;
      if (accuracy <= 10) newStrength = 'strong';
      else if (accuracy <= 30) newStrength = 'medium';
      else newStrength = 'weak';

      if (newStrength !== gpsStrengthRef.current) {
        gpsStrengthRef.current = newStrength;
        setGpsStrength(newStrength);
      }

      // 重置 GPS 超时计时器，10s 无更新则降级为 weak
      if (gpsTimeoutRef.current) clearTimeout(gpsTimeoutRef.current);
      gpsTimeoutRef.current = setTimeout(() => {
        if (gpsStrengthRef.current !== 'none') {
          gpsStrengthRef.current = 'weak';
          setGpsStrength('weak');
        }
      }, 10000);

      if (!hasMovedToLocation.current) {
        hasMovedToLocation.current = true;
        mapViewRef.current?.moveCamera(
          { target: { latitude, longitude }, zoom: 16 },
          500,
        );
      }

      // Feed GPS data to recording service
      if (isRecordingRef.current) {
        const rawPoint: RawLocationPoint = {
          latitude,
          longitude,
          altitude: altitude ?? 0,
          accuracy,
          speed: speed ?? 0,
          heading: heading ?? 0,
          timestamp: event.nativeEvent.timestamp,
        };
        trackRecordingService.processLocation(rawPoint);

        // Follow user on map
        if (shouldFollowRef.current) {
          mapViewRef.current?.moveCamera(
            { target: { latitude, longitude }, zoom: 16 },
            300,
          );
        }
      }
    }
  }, [hasGps]);

  // 自定义定位按钮：移动到当前位置
  const handleLocate = () => {
    const loc = latestLocation.current;
    if (loc) {
      shouldFollowRef.current = true;
      mapViewRef.current?.moveCamera(
        { target: { latitude: loc.latitude, longitude: loc.longitude }, zoom: 16 },
        500,
      );
    }
  };

  const selectedType = ACTIVITY_CYCLE[activityIndex];

  // 循环切换运动模式
  const cycleType = () => {
    if (!isIdle) return;
    setActivityIndex(prev => (prev + 1) % ACTIVITY_CYCLE.length);
  };

  const handleStart = () => {
    const activityType = ACTIVITY_TYPE_MAP[selectedType];
    trackRecordingService.startRecording(activityType);
  };

  const handlePause = () => {
    trackRecordingService.pauseRecording();
  };

  const handleResume = () => {
    trackRecordingService.resumeRecording();
  };

  // Long press stop (1.5s)
  const handleStopPressIn = () => {
    longPressProgress.setValue(0);
    Animated.timing(longPressProgress, {
      toValue: 1,
      duration: LONG_PRESS_DURATION,
      useNativeDriver: false,
    }).start();

    longPressTimer.current = setTimeout(async () => {
      const success = await trackRecordingService.stopRecording();
      longPressProgress.setValue(0);
      if (!success) {
        Alert.alert(
          '上传失败',
          '运动记录已保存到本地，请检查网络后重试。',
          [
            { text: '丢弃', style: 'destructive', onPress: () => trackRecordingService.discardRecording() },
            { text: '重试', onPress: () => trackRecordingService.retryUpload() },
          ],
        );
      }
    }, LONG_PRESS_DURATION);
  };

  const handleStopPressOut = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    longPressProgress.stopAnimation();
    longPressProgress.setValue(0);
  };

  // 左按钮：空闲=模式选择，记录中=暂停，暂停中=继续
  const handleLeftButton = () => {
    if (isIdle) cycleType();
    else if (isRecording) handlePause();
    else if (isPaused) handleResume();
  };

  const ActiveIcon = ACTIVITY_ICONS[selectedType];

  return (
    <View style={styles.container}>
      {/* Background Ambient Glow */}
      <View style={styles.ambientGlow} pointerEvents="none">
        <View style={[styles.glowOrb, styles.glowOrbTop]} />
        <View style={[styles.glowOrb, styles.glowOrbCenter]} />
        <View style={[styles.glowOrb, styles.glowOrbBottom]} />
      </View>

      {/* 全屏模糊层 */}
      <View style={styles.fullScreenBlur} pointerEvents="none">
        <BlurView
          style={StyleSheet.absoluteFillObject}
          blurRadius={24}
          overlayColor="rgba(28, 30, 38, 0.6)"
          blurType="dark"
          blurAmount={24}
          autoUpdate
        />
      </View>

      {/* Header */}
      <View style={[styles.headerBar, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity style={styles.headerIconButton}>
          <IconHamburgerMenu size={20} color={COLORS.TEXT.PRIMARY} />
        </TouchableOpacity>
        <View style={styles.searchBar}>
          <IconMagnifer size={18} color={COLORS.TEXT.TERTIARY} />
          <Text style={styles.searchPlaceholder}>搜索路线...</Text>
        </View>
        <TouchableOpacity style={styles.headerIconButton}>
          <IconMicrophone size={20} color={COLORS.TEXT.PRIMARY} />
        </TouchableOpacity>
      </View>

      {/* Map Card */}
      <View style={styles.mapCard}>
        {/* 高德地图 */}
        <MapView
          ref={mapViewRef}
          style={StyleSheet.absoluteFillObject}
          mapType={MapType.Night}
          initialCameraPosition={{
            target: { latitude: 35.86, longitude: 104.19 },
            zoom: 4,
          }}
          minZoom={3}
          maxZoom={20}
          myLocationEnabled={locationEnabled}
          scaleControlsEnabled={false}
          zoomControlsEnabled={false}
          compassEnabled={false}
          rotateGesturesEnabled={false}
          tiltGesturesEnabled={false}
          labelsEnabled
          buildingsEnabled={false}
          trafficEnabled={false}
          distanceFilter={5}
          onLocation={handleLocation}
        >
          {/* Real-time Track Polylines */}
          {polylineSegments.map((coords, idx) => (
            <Polyline
              key={`segment-${idx}`}
              points={coords}
              width={4}
              color={COLORS.PRIMARY}
              zIndex={10}
            />
          ))}
        </MapView>

        {/* GPS Status Indicator - 左上角 */}
        <TouchableOpacity style={styles.mapGpsStatusWrapper} activeOpacity={0.7}>
          <BlurView
            style={StyleSheet.absoluteFillObject}
            blurRadius={12}
            overlayColor="rgba(255, 255, 255, 0.2)"
            blurType="dark"
            blurAmount={12}
            autoUpdate
            pointerEvents="none"
          />
          <Animated.View style={{ opacity: pulseAnim }}>
            <IconCompass size={18} color={GPS_COLORS[gpsStrength]} />
          </Animated.View>
        </TouchableOpacity>

        {/* Locate Button - 右下角 */}
        <TouchableOpacity
          style={[styles.mapLocateWrapper, !hasGps && styles.mapLocateDisabled]}
          onPress={handleLocate}
          disabled={!hasGps}
        >
          <BlurView
            style={StyleSheet.absoluteFillObject}
            blurRadius={12}
            overlayColor="rgba(28, 30, 38, 0.7)"
            blurType="dark"
            blurAmount={12}
            autoUpdate
            pointerEvents="none"
          />
          <IconGps size={18} color={hasGps ? COLORS.TEXT.SECONDARY : COLORS.TEXT.DISABLED} />
        </TouchableOpacity>

        {/* ========== Control Panel ========== */}
        <View style={styles.panelWrapper}>
          <View style={styles.panelContent}>

            {/* 一行数据 */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>距离</Text>
                <View style={styles.statValueRow}>
                  <Text style={[styles.statValue, isIdle && styles.statValueDim]}>
                    {isIdle ? '--' : (stats.distance / 1000).toFixed(2)}
                  </Text>
                  <Text style={styles.statUnit}>km</Text>
                </View>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statItem}>
                <Text style={styles.statLabel}>时长</Text>
                <View style={styles.statValueRow}>
                  <Text style={[styles.statValue, isIdle && styles.statValueDim]}>
                    {isIdle ? '--' : formatDuration(stats.duration)}
                  </Text>
                  <Text style={styles.statUnit}> </Text>
                </View>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statItem}>
                <Text style={styles.statLabel}>配速</Text>
                <View style={styles.statValueRow}>
                  <Text style={[styles.statValue, isIdle && styles.statValueDim]}>
                    {isIdle ? '--' : formatPace(stats.currentPace)}
                  </Text>
                  <Text style={styles.statUnit}>min/km</Text>
                </View>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statItem}>
                <Text style={styles.statLabel}>海拔</Text>
                <View style={styles.statValueRow}>
                  <Text style={[styles.statValue, isIdle && styles.statValueDim]}>
                    {isIdle ? '--' : Math.round(stats.elevationGain)}
                  </Text>
                  <Text style={styles.statUnit}>m</Text>
                </View>
              </View>
            </View>

            {/* 按钮行 */}
            <View style={styles.centerButtons}>
              <TouchableOpacity
                onPress={handleLeftButton}
                activeOpacity={0.7}
                style={[
                  styles.actionBtn,
                  isIdle ? styles.idleBtnBg : null,
                  isRecording ? styles.pauseBtnBg : null,
                  isPaused ? styles.resumeBtnBg : null,
                ]}
              >
                {isIdle ? (
                  <ActiveIcon size={20} color={COLORS.TEXT.SECONDARY} />
                ) : isRecording ? (
                  <IconPause size={18} color={COLORS.TEXT.PRIMARY} />
                ) : (
                  <IconPlay size={18} color={COLORS.TEXT.PRIMARY} />
                )}
              </TouchableOpacity>

              {isIdle ? (
                <TouchableOpacity
                  onPress={handleStart}
                  activeOpacity={0.7}
                  style={[styles.actionBtn, styles.startBtnBg]}
                >
                  <IconPlay size={18} color={COLORS.TEXT.PRIMARY} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPressIn={handleStopPressIn}
                  onPressOut={handleStopPressOut}
                  activeOpacity={0.7}
                  style={[styles.actionBtn, styles.stopBtnBg]}
                >
                  <View style={styles.stopBtnInner}>
                    <IconStop size={18} color={COLORS.ERROR} />
                    <Animated.View
                      style={[
                        styles.stopProgressRing,
                        {
                          width: longPressProgress.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0%', '100%'],
                          }),
                        },
                      ]}
                    />
                  </View>
                </TouchableOpacity>
              )}
            </View>

          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },

  // Glow
  ambientGlow: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 0,
  },
  glowOrb: { position: 'absolute', borderRadius: 9999 },
  glowOrbTop: {
    top: -80, right: -40, width: 300, height: 300,
    backgroundColor: COLORS.GRADIENT.BLUE,
  },
  glowOrbCenter: {
    top: '40%', left: '50%', transform: [{ translateX: -150 }],
    width: 400, height: 400,
    backgroundColor: COLORS.GRADIENT.PINK,
  },
  glowOrbBottom: {
    bottom: -80, left: -60, width: 500, height: 500,
    backgroundColor: COLORS.GRADIENT.PURPLE,
  },
  fullScreenBlur: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },

  // Header
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
    zIndex: 20,
  },
  headerIconButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.OVERLAY.LIGHT,
    borderWidth: 1, borderColor: COLORS.BORDER.LIGHT,
    justifyContent: 'center', alignItems: 'center',
  },
  searchBar: {
    flex: 1, height: 40,
    backgroundColor: COLORS.OVERLAY.LIGHT,
    borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.BORDER.LIGHT,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, gap: 12,
  },
  searchPlaceholder: {
    fontSize: 15,
    color: COLORS.TEXT.TERTIARY,
  },

  // Map Card
  mapCard: {
    flex: 1,
    marginHorizontal: 20,
    marginBottom: 120,
    borderRadius: BORDER_RADIUS.G2.LG,
    overflow: 'hidden',
    zIndex: 10,
  },

  // GPS Status Indicator
  mapGpsStatusWrapper: {
    position: 'absolute', top: 16, left: 16,
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 1, borderColor: COLORS.BORDER.MEDIUM,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Locate Button
  mapLocateWrapper: {
    position: 'absolute', bottom: PANEL_HEIGHT + 12, right: 12,
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 1, borderColor: COLORS.BORDER.MEDIUM,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapLocateDisabled: {
    opacity: 0.4,
  },

  // ========== Control Panel ==========
  panelWrapper: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: '#1c1e26',
  },
  panelContent: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },

  // 一行数据
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: COLORS.BORDER.LIGHT,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 9,
    color: COLORS.TEXT.QUATERNARY,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
    marginBottom: 1,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.TEXT.PRIMARY,
  },
  statValueDim: {
    color: COLORS.TEXT.DISABLED,
  },
  statUnit: {
    fontSize: 9,
    color: COLORS.TEXT.QUINARY,
    fontWeight: '400',
    marginLeft: 2,
  },

  // 中间双按钮
  centerButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  actionBtn: {
    width: 44, height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // 左按钮背景
  idleBtnBg: {
    backgroundColor: COLORS.OVERLAY.MEDIUM,
    borderWidth: 1,
    borderColor: COLORS.BORDER.MEDIUM,
  },
  pauseBtnBg: {
    backgroundColor: COLORS.PRIMARY,
    shadowColor: COLORS.PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  resumeBtnBg: {
    backgroundColor: COLORS.SUCCESS,
    shadowColor: COLORS.SUCCESS,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },

  // 右按钮背景
  startBtnBg: {
    backgroundColor: COLORS.PRIMARY,
    shadowColor: COLORS.PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  stopBtnBg: {
    backgroundColor: 'rgba(239,68,68,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    overflow: 'hidden',
  },
  stopBtnInner: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopProgressRing: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: 2,
    backgroundColor: COLORS.ERROR,
    borderRadius: 1,
  },
});
