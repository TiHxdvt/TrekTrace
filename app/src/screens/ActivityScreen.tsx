/**
 * 运动记录页面
 * 地图卡片底部控制面板：四角数据 + 中间双按钮
 * 集成 TrackRecordingService 实现实时轨迹记录
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  PermissionsAndroid,
  Platform,
  Animated,
  Alert,
  StatusBar,
  Dimensions,
} from 'react-native';
import { BlurView } from '@react-native-community/blur';
import { MapView, AMapSdk, MapType, Polyline } from 'react-native-amap3d';
import type { NativeSyntheticEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { COLORS, BORDER_RADIUS, TYPOGRAPHY } from '../theme';
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
import { mockLocationService, MOCK_ROUTES } from '../services/mockLocationService';
import type {
  ActivityType,
  RecordingSession,
  RecordingStats,
  RawLocationPoint,
} from '../types';

type ActivityTypeLocal = 'running' | 'cycling' | 'hiking';
type GpsStrength = 'none' | 'weak' | 'medium' | 'strong';

// Same as SPEED_FILTER in trackRecordingService — points below this are rejected
const SPEED_FILTER = 1; // m/s

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
  const navigation = useNavigation();
  const [activityIndex, setActivityIndex] = useState(1); // 默认跑步
  const insets = useSafeAreaInsets();
  const mapViewRef = useRef<MapView>(null);
  const hasMovedToLocation = useRef(false);
  const latestLocation = useRef<{ latitude: number; longitude: number } | null>(null);
  const shouldFollowRef = useRef(true);
  const currentZoomRef = useRef(16);
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

  // Summary overlay state — reuses main map, no second MapView
  const [showSummary, setShowSummary] = useState(false);
  const showSummaryRef = useRef(false);

  // Long press stop state
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressProgress = useRef<Animated.Value>(new Animated.Value(0)).current;

  // Use ref for isRecording to avoid handleLocation re-creation
  const isRecordingRef = useRef(false);

  // Mock GPS simulation state (__DEV__ only)
  const [isSimulating, setIsSimulating] = useState(false);

  // Derived state
  const isIdle = !session || session.status === 'idle' || session.status === 'stopped';
  const isRecording = session?.status === 'recording';
  const isPaused = session?.status === 'paused';

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

  // Hide/show floating tab bar when summary is visible
  useEffect(() => {
    navigation.setOptions({ tabBarVisible: !showSummary });
  }, [navigation, showSummary]);

  // Derive colored segments from polyline data + session type (computed only when data changes)
  const coloredSegments = useMemo(() => {
    if (!session || polylineSegments.length === 0) return [];

    const activityType = session.activityType;

    const SPEED_THRESHOLDS: Record<ActivityType, { slow: number; fast: number }> = {
      HIKING: { slow: 1.0, fast: 2.0 },
      RUNNING: { slow: 2.0, fast: 4.0 },
      CYCLING: { slow: 5.0, fast: 10.0 },
    };

    const { slow, fast } = SPEED_THRESHOLDS[activityType];

    // Colors: green(#22c55e) → yellow(#f59e0b) → red(#ef4444)
    const GREEN = { r: 34, g: 197, b: 94 };
    const YELLOW = { r: 245, g: 158, b: 11 };
    const RED = { r: 239, g: 68, b: 68 };

    const lerpColor = (
      c1: { r: number; g: number; b: number },
      c2: { r: number; g: number; b: number },
      t: number,
    ): string => {
      const r = Math.round(c1.r + (c2.r - c1.r) * t);
      const g = Math.round(c1.g + (c2.g - c1.g) * t);
      const b = Math.round(c1.b + (c2.b - c1.b) * t);
      return `rgb(${r},${g},${b})`;
    };

    // Map speed to color, accounting for SPEED_FILTER so green range is reachable
    const speedToColor = (speed: number): string => {
      if (speed <= slow) {
        const t = Math.max(0, (speed - SPEED_FILTER)) / Math.max(0.01, slow - SPEED_FILTER);
        return lerpColor(GREEN, YELLOW, Math.min(1, t));
      } else if (speed <= fast) {
        const t = (speed - slow) / (fast - slow);
        return lerpColor(YELLOW, RED, t);
      }
      return `rgb(${RED.r},${RED.g},${RED.b})`;
    };

    return session.segments
      .filter(s => s.points.length >= 2)
      .map(s => {
        const coords = s.points.map(p => ({ latitude: p.latitude, longitude: p.longitude }));
        const colors = s.points.map(p => speedToColor(p.speed ?? 0));
        return { coords, colors };
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only session.segments and activityType are used; full session dependency would recompute every second
  }, [polylineSegments, session?.activityType, session?.segments]);

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
  }, [gpsStrength, pulseAnim]);

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
          { target: { latitude, longitude }, zoom: currentZoomRef.current },
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
            { target: { latitude, longitude }, zoom: currentZoomRef.current },
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
        { target: { latitude: loc.latitude, longitude: loc.longitude }, zoom: currentZoomRef.current },
        500,
      );
    }
  };

  // ======================== Mock GPS Simulation (__DEV__) ========================

  const handleStartSim = () => {
    const routeKeys = Object.keys(MOCK_ROUTES);
    const routeOptions = routeKeys.map(key => MOCK_ROUTES[key].name);

    Alert.alert(
      'GPS 模拟',
      '选择模拟路线：',
      [
        ...routeOptions.map((name, idx) => ({
          text: name,
          onPress: () => startSimWithRoute(routeKeys[idx]),
        })),
        { text: '取消', style: 'cancel' },
      ],
    );
  };

  const startSimWithRoute = (routeKey: string) => {
    const route = MOCK_ROUTES[routeKey];
    setIsSimulating(true);

    // Simulate GPS being acquired
    setHasGps(true);
    gpsStrengthRef.current = 'strong';
    setGpsStrength('strong');

    mockLocationService.start(routeKey, route.defaultSpeed, (point: RawLocationPoint) => {
      // Update latestLocation
      latestLocation.current = { latitude: point.latitude, longitude: point.longitude };

      // Move camera on first point
      if (!hasMovedToLocation.current) {
        hasMovedToLocation.current = true;
        mapViewRef.current?.moveCamera(
          { target: { latitude: point.latitude, longitude: point.longitude }, zoom: 16 },
          500,
        );
      }

      // Feed to recording service if recording
      if (isRecordingRef.current) {
        trackRecordingService.processLocation(point);

        if (shouldFollowRef.current) {
          mapViewRef.current?.moveCamera(
            { target: { latitude: point.latitude, longitude: point.longitude }, zoom: currentZoomRef.current },
            300,
          );
        }
      } else if (!showSummaryRef.current) {
        // Follow simulated position only when not showing summary
        mapViewRef.current?.moveCamera(
          { target: { latitude: point.latitude, longitude: point.longitude }, zoom: currentZoomRef.current },
          300,
        );
      }
    });
  };

  const handleStopSim = () => {
    mockLocationService.stop();
    setIsSimulating(false);
  };

  const handleSimButton = () => {
    if (isSimulating) {
      handleStopSim();
    } else {
      handleStartSim();
    }
  };

  // Sync mock pause/resume with recording state
  useEffect(() => {
    if (!isSimulating) return;
    if (isPaused) {
      mockLocationService.pause();
    } else if (isRecording) {
      mockLocationService.resume();
    }
  }, [isSimulating, isPaused, isRecording]);

  // Cleanup mock on unmount
  useEffect(() => {
    return () => {
      if (mockLocationService.isRunning) {
        mockLocationService.stop();
      }
    };
  }, []);

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
      } else {
        // Show summary overlay — reuse main map with same colored segments
        showSummaryRef.current = true;
        setShowSummary(true);
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

  // Close summary overlay and discard recording data
  const handleCloseSummary = () => {
    showSummaryRef.current = false;
    setShowSummary(false);
    trackRecordingService.discardRecording();
  };

  // When summary overlay opens, fit main map camera to show full track
  useEffect(() => {
    if (!showSummary || coloredSegments.length === 0) return;
    const timer = setTimeout(() => {
      const allPoints = coloredSegments.flatMap(s => s.coords);
      if (allPoints.length === 0) return;

      const lats = allPoints.map(p => p.latitude);
      const lons = allPoints.map(p => p.longitude);
      const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
      const centerLon = (Math.min(...lons) + Math.max(...lons)) / 2;

      const { width, height } = Dimensions.get('window');
      const latSpan = Math.max(...lats) - Math.min(...lats);
      const lonSpan = Math.max(...lons) - Math.min(...lons);
      const paddedLatSpan = latSpan * 1.3 || 0.01;
      const paddedLonSpan = lonSpan * 1.3 || 0.01;
      const zoomByLat = Math.log2(360 * (height / width) / paddedLatSpan);
      const zoomByLon = Math.log2(360 / paddedLonSpan);
      const zoom = Math.min(zoomByLat, zoomByLon);
      const clampedZoom = Math.max(3, Math.min(20, Math.round(zoom)));

      mapViewRef.current?.moveCamera(
        {
          target: { latitude: centerLat, longitude: centerLon },
          zoom: clampedZoom,
        },
        500,
      );
    }, 300);
    return () => clearTimeout(timer);
  }, [showSummary, coloredSegments]);

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
          overlayColor={COLORS.OVERLAY.CARD}
          blurType="dark"
          blurAmount={24}
          autoUpdate
        />
      </View>

      {/* Header — hidden during summary */}
      {!showSummary && (
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
      )}

      {/* Map Card — expands to full screen during summary */}
      <View style={[styles.mapCard, showSummary && styles.mapCardSummary]}>
        {/* 高德地图 */}
        <MapView
          ref={mapViewRef}
          style={StyleSheet.absoluteFillObject}
          mapType={MapType.Night}
          initialCameraPosition={{
            target: { latitude: 35.86, longitude: 104.19 },
            zoom: 16,
          }}
          minZoom={3}
          maxZoom={20}
          myLocationEnabled={locationEnabled && !isSimulating && !showSummary}
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
          onCameraMove={(e) => {
            currentZoomRef.current = e.nativeEvent.cameraPosition.zoom ?? currentZoomRef.current;
          }}
        >
          {/* Speed-colored Track Polylines */}
          {coloredSegments.map((seg, idx) => (
            <Polyline
              key={`segment-${idx}`}
              points={seg.coords}
              colors={seg.colors}
              gradient
              width={8}
              zIndex={10}
            />
          ))}
        </MapView>

        {/* GPS Status Indicator - 左上角 */}
        {!showSummary && (
        <TouchableOpacity style={styles.mapGpsStatusWrapper} activeOpacity={0.7}>
          <BlurView
            style={StyleSheet.absoluteFillObject}
            blurRadius={12}
            overlayColor={COLORS.OVERLAY.HEAVY}
            blurType="dark"
            blurAmount={12}
            autoUpdate
            pointerEvents="none"
          />
          <Animated.View style={{ opacity: pulseAnim }}>
            <IconCompass size={18} color={GPS_COLORS[gpsStrength]} />
          </Animated.View>
        </TouchableOpacity>
        )}

        {/* Mock GPS Button - 左下角 (__DEV__ only) */}
        {__DEV__ && !showSummary && (
          <TouchableOpacity
            style={[
              styles.mapSimWrapper,
              isSimulating && styles.mapSimActive,
            ]}
            onPress={handleSimButton}
            activeOpacity={0.7}
          >
            <Text style={[styles.simText, isSimulating && styles.simTextActive]}>SIM</Text>
          </TouchableOpacity>
        )}

        {/* Locate Button - 右下角 */}
        {!showSummary && (
        <TouchableOpacity
          style={[styles.mapLocateWrapper, !hasGps && styles.mapLocateDisabled]}
          onPress={handleLocate}
          disabled={!hasGps}
        >
          <BlurView
            style={StyleSheet.absoluteFillObject}
            blurRadius={12}
            overlayColor={COLORS.OVERLAY.BLUR_LIGHT}
            blurType="dark"
            blurAmount={12}
            autoUpdate
            pointerEvents="none"
          />
          <IconGps size={18} color={hasGps ? COLORS.TEXT.SECONDARY : COLORS.TEXT.DISABLED} />
        </TouchableOpacity>
        )}

        {/* ========== Summary Overlay ========== */}
        {showSummary && (
          <>
            <StatusBar barStyle="light-content" />
            {/* Top stats overlay */}
            <View style={[styles.summaryStatsOverlay, { paddingTop: insets.top + 16 }]}>
              <View style={styles.summaryStatsCard}>
                <View style={styles.summaryStatsRow}>
                  <View style={styles.summaryStatItem}>
                    <Text style={styles.summaryStatLabel}>距离</Text>
                    <Text style={styles.summaryStatValue}>{(stats.distance / 1000).toFixed(2)} km</Text>
                  </View>
                  <View style={styles.summaryStatItem}>
                    <Text style={styles.summaryStatLabel}>时长</Text>
                    <Text style={styles.summaryStatValue}>{formatDuration(stats.duration)}</Text>
                  </View>
                  <View style={styles.summaryStatItem}>
                    <Text style={styles.summaryStatLabel}>配速</Text>
                    <Text style={styles.summaryStatValue}>{formatPace(stats.currentPace)}</Text>
                  </View>
                  <View style={styles.summaryStatItem}>
                    <Text style={styles.summaryStatLabel}>爬升</Text>
                    <Text style={styles.summaryStatValue}>{Math.round(stats.elevationGain)} m</Text>
                  </View>
                </View>
              </View>
            </View>
            {/* Bottom done button */}
            <View style={[styles.summaryBottomBar, { paddingBottom: insets.bottom + 24 }]}>
              <TouchableOpacity
                style={styles.summaryDoneBtn}
                onPress={handleCloseSummary}
                activeOpacity={0.7}
              >
                <Text style={styles.summaryDoneText}>完成</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ========== Control Panel — hidden during summary ========== */}
        {!showSummary && (
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
        )}
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
    fontSize: TYPOGRAPHY.FONT_SIZE.MD,
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

  // Mock GPS Button
  mapSimWrapper: {
    position: 'absolute', bottom: PANEL_HEIGHT + 12, left: 12,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.OVERLAY.GPS_SIM,
    borderWidth: 1, borderColor: COLORS.BORDER.MEDIUM,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapSimActive: {
    backgroundColor: COLORS.ERROR_OVERLAY.SIM_BG,
    borderColor: COLORS.ERROR_OVERLAY.SIM_BORDER,
  },
  simText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.XS,
    fontWeight: '600',
    color: COLORS.TEXT.SECONDARY,
    letterSpacing: 0.5,
  },
  simTextActive: {
    color: COLORS.TEXT.PRIMARY,
  },

  // ========== Control Panel ==========
  panelWrapper: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: COLORS.BACKGROUND,
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
    fontSize: TYPOGRAPHY.FONT_SIZE.XS,
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
    fontSize: TYPOGRAPHY.FONT_SIZE.MD,
    fontWeight: '600',
    color: COLORS.TEXT.PRIMARY,
  },
  statValueDim: {
    color: COLORS.TEXT.DISABLED,
  },
  statUnit: {
    fontSize: TYPOGRAPHY.FONT_SIZE.XS,
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
    backgroundColor: COLORS.ERROR_OVERLAY.BUTTON_BG,
    borderWidth: 1,
    borderColor: COLORS.ERROR_OVERLAY.BUTTON_BORDER,
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

  // ========== Summary Overlay ==========
  mapCardSummary: {
    marginHorizontal: 0,
    marginBottom: 0,
    borderRadius: 0,
  },
  summaryStatsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
  },
  summaryStatsCard: {
    backgroundColor: COLORS.OVERLAY.SUMMARY,
    borderRadius: BORDER_RADIUS.G2.LG,
    borderWidth: 1,
    borderColor: COLORS.BORDER.MEDIUM,
    padding: 16,
  },
  summaryStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryStatItem: {
    alignItems: 'center',
  },
  summaryStatLabel: {
    fontSize: TYPOGRAPHY.FONT_SIZE.XS,
    color: COLORS.TEXT.QUATERNARY,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
    marginBottom: 4,
  },
  summaryStatValue: {
    fontSize: TYPOGRAPHY.FONT_SIZE.MD,
    fontWeight: '600',
    color: COLORS.TEXT.PRIMARY,
  },
  summaryBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 40,
    paddingTop: 16,
  },
  summaryDoneBtn: {
    backgroundColor: COLORS.PRIMARY,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  summaryDoneText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.MD,
    fontWeight: '600',
    color: COLORS.TEXT.PRIMARY,
  },
});
