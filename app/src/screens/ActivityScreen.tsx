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
  Dimensions,
  Alert,
  Linking,
} from 'react-native';
import { BlurView } from '@react-native-community/blur';
import { MapView, AMapSdk, MapType, Polyline } from 'react-native-amap3d';
import type { NativeSyntheticEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from '../navigation/types';
import { DrawerOverlay } from '../components/DrawerOverlay';
import {
  IconHamburgerMenu,
  IconMagnifer,
  IconMicrophone,
} from '../components/SolarIcons';
import { captureRef } from 'react-native-view-shot';
import Share from 'react-native-share';
import { Dialog } from '../components/Dialog';
import { Toast } from '../components/Toast';
import { useTheme } from '../contexts/ThemeContext';
import { APP_CONFIG } from '../config';
import { trackRecordingService } from '../services/trackRecordingService';
import { backgroundLocationService } from '../services/backgroundLocationService';
import { weatherService } from '../services/weatherService';
import type { RawLocationPoint, ActivityType } from '../types';

// Extracted modules
import { ACTIVITY_CYCLE, ACTIVITY_TYPE_MAP, MIN_RECORDING_DISTANCE } from './activity/constants';
import type { ActivityTypeLocal, GpsStrength } from './activity/constants';
import { styles } from './activity/styles';
import { createDynamicStyles } from './activity/dynamicStyles';
import { useRecordingState } from './activity/useRecordingState';
import { useSummaryReplay } from './activity/useSummaryReplay';
import { useMockGps } from './activity/useMockGps';
import { useTrackVisualization } from './activity/useTrackVisualization';
import { MapOverlayButtons } from './activity/MapOverlayButtons';
import { RecordingStatsPanel } from './activity/RecordingStatsPanel';
import { SummaryOverlay } from './activity/SummaryOverlay';
import { ShareCard } from './activity/ShareCard';
import { calculateLaps } from '../utils/lapCalculator';
import { toElevationProfile } from '../utils/elevationProfile';

export const ActivityScreen: React.FC = () => {
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList, 'ActivityTab'>>();
  const { colors, isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();

  // ---- Core state ----
  const [activityIndex, setActivityIndex] = useState(0);
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
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);

  // ---- Recording state ----
  const isRecordingRef = useRef(false);
  const isStoppingRef = useRef(false);
  const longPressProgress = useRef<Animated.Value>(new Animated.Value(0)).current;

  const {
    session, stats, polylineSegments,
    isIdle, isRecording, isPaused,
    showSummary, setShowSummary, lockedActivityType,
  } = useRecordingState();

  const showSummaryRef = useRef(false);
  useEffect(() => { showSummaryRef.current = showSummary; }, [showSummary]);

  // ---- Summary replay ----
  const { replayProgress, startSummaryReplay, stopSummaryReplay } = useSummaryReplay();

  // ---- Track visualization ----
  const { coloredSegments, displaySegments, shareTrackPoints, animatedStats } =
    useTrackVisualization(session, polylineSegments, stats, replayProgress, showSummary, showShareCard);

  // F2: Lap stats (only computed when summary is shown)
  const laps = useMemo(() => {
    if (!showSummary || !session?.segments) return [];
    return calculateLaps(session.segments, session.activityType);
  }, [showSummary, session?.segments, session?.activityType]);

  // F3: Elevation profile
  const elevationProfile = useMemo(() => {
    if (!session?.segments) return [];
    return toElevationProfile(session.segments);
  }, [session?.segments]);

  // ---- Share card ----
  const [showShareCard, setShowShareCard] = useState(false);
  const shareCardRef = useRef<View>(null);

  // ---- Mock GPS ----
  const {
    isSimulating, isSimulatingRef,
    startSim, handleStopSim, handleSimButton,
  } = useMockGps({
    mapViewRef, latestLocation, hasMovedToLocation, currentZoomRef,
    isRecordingRef, shouldFollowRef, showSummaryRef,
    setHasGps, setGpsStrength, gpsStrengthRef,
  });

  // Keep Drawer callback refs up to date
  const startSimRef = useRef(startSim);
  startSimRef.current = startSim;
  const stopSimRef = useRef(handleStopSim);
  stopSimRef.current = handleStopSim;

  // ---- Derived state ----
  useEffect(() => { isRecordingRef.current = isRecording; }, [isRecording]);
  const mapType = useMemo(() => isDarkMode ? MapType.Night : MapType.Standard, [isDarkMode]);
  const selectedType = ACTIVITY_CYCLE[activityIndex];

  // Hide/show floating tab bar when summary is visible
  useEffect(() => {
    navigation.setOptions({ tabBarVisible: !showSummary } as any);
  }, [navigation, showSummary]);

  // GPS strength colors
  const gpsColors: Record<GpsStrength, string> = useMemo(() => ({
    none: colors.TEXT.DISABLED,
    weak: colors.ERROR,
    medium: colors.WARNING,
    strong: colors.SUCCESS,
  }), [colors]);

  // Dynamic styles
  const dynamicStyles = useMemo(() => createDynamicStyles(colors, isDarkMode), [colors, isDarkMode]);

  // ---- GPS pulse animation ----
  useEffect(() => {
    if (gpsStrength === 'none') { pulseAnim.setValue(1); return; }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [gpsStrength, pulseAnim]);

  // ---- Init map SDK ----
  useEffect(() => {
    const init = async () => {
      try {
        AMapSdk.init(APP_CONFIG.AMAP_API_KEY);
        if (Platform.OS === 'android') {
          const granted = await PermissionsAndroid.requestMultiple([
            'android.permission.ACCESS_FINE_LOCATION',
            'android.permission.ACCESS_COARSE_LOCATION',
          ]).catch(() => null as any);
          if (granted) setLocationEnabled(true);
        } else {
          setLocationEnabled(true);
        }
        setMapReady(true);
      } catch { setMapError(true); }
    };
    init();
    return () => { if (gpsTimeoutRef.current) clearTimeout(gpsTimeoutRef.current); };
  }, []);

  // ---- Location handler ----
  const handleLocation = useCallback((event: NativeSyntheticEvent<{
    timestamp: number;
    coords: { latitude: number; longitude: number; accuracy: number; altitude: number; speed: number; heading: number; };
  }>) => {
    const { coords } = event.nativeEvent;
    const { latitude, longitude, accuracy, altitude, speed, heading } = coords;
    if (latitude && longitude) {
      latestLocation.current = { latitude, longitude };
      if (!hasGps) setHasGps(true);

      let newStrength: GpsStrength;
      if (accuracy <= 10) newStrength = 'strong';
      else if (accuracy <= 30) newStrength = 'medium';
      else newStrength = 'weak';

      if (newStrength !== gpsStrengthRef.current) {
        gpsStrengthRef.current = newStrength;
        setGpsStrength(newStrength);
      }

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
          { target: { latitude, longitude }, zoom: currentZoomRef.current }, 500,
        );
      }

      if (isRecordingRef.current) {
        if (isSimulatingRef.current) {
          const rawPoint: RawLocationPoint = {
            latitude, longitude, altitude: altitude ?? 0, accuracy,
            speed: speed ?? 0, heading: heading ?? 0,
            timestamp: event.nativeEvent.timestamp,
          };
          trackRecordingService.processLocation(rawPoint);
        }
        if (shouldFollowRef.current) {
          mapViewRef.current?.moveCamera(
            { target: { latitude, longitude }, zoom: currentZoomRef.current }, 300,
          );
        }
      }
    }
  }, [hasGps]);

  // ---- Locate button ----
  const handleLocate = useCallback(() => {
    const loc = latestLocation.current;
    if (loc) {
      shouldFollowRef.current = true;
      mapViewRef.current?.moveCamera(
        { target: { latitude: loc.latitude, longitude: loc.longitude }, zoom: currentZoomRef.current }, 500,
      );
    }
  }, []);

  // ---- Sync mock pause/resume with recording state ----
  useEffect(() => {
    if (!isSimulating) return;
    if (isPaused) { backgroundLocationService.pause(); }
    else if (isRecording) { backgroundLocationService.resume(); }
  }, [isSimulating, isPaused, isRecording]);

  // ---- Recording control handlers ----
  const retryUploadWithDialog = async () => {
    let ok = false;
    while (!ok) {
      ok = await trackRecordingService.retryUpload();
      if (!ok) {
        const action = await new Promise<'discard' | 'retry'>(resolve => {
          Dialog.show('上传失败', '网络不可用，记录已保留在本地，请稍后再试。', [
            { text: '丢弃', style: 'destructive', onPress: () => resolve('discard') },
            { text: '重试', onPress: () => resolve('retry') },
          ]);
        });
        if (action === 'discard') { trackRecordingService.discardRecording(); return; }
      }
    }
  };

  const handleStart = async () => {
    if (isStoppingRef.current) return;
    const activityType = ACTIVITY_TYPE_MAP[selectedType];
    lockedActivityType.current = activityType;
    try {
      await trackRecordingService.startRecording(activityType);
      if (!isSimulatingRef.current) {
        try { await backgroundLocationService.start(activityType); }
        catch (bgErr: any) {
          trackRecordingService.discardRecording();
          lockedActivityType.current = null;
          Alert.alert(
            '定位权限不足',
            '途迹需要后台定位权限才能在后台持续记录轨迹。请在系统设置中开启"始终允许"定位权限。',
            [
              { text: '取消', style: 'cancel' },
              { text: '去设置', onPress: () => Linking.openSettings() },
            ],
          );
          return;
        }
      }
    } catch (e: any) {
      lockedActivityType.current = null;
      if (e.message === 'UNSYNCED_RECORD') {
        Dialog.show('未上传的记录', '存在未上传的运动记录，请先处理后再开始新记录。', [
          { text: '丢弃旧记录', style: 'destructive', onPress: () => trackRecordingService.discardRecording() },
          { text: '重试上传', onPress: () => retryUploadWithDialog() },
        ]);
      } else {
        console.error('Failed to start recording:', e);
      }
    }
  };

  const handlePause = () => {
    trackRecordingService.pauseRecording();
    if (!isSimulatingRef.current) backgroundLocationService.pause();
  };

  const handleResume = () => {
    trackRecordingService.resumeRecording();
    if (!isSimulatingRef.current) backgroundLocationService.resume();
  };

  // F4: Fetch weather when recording starts and refresh every 30 min
  useEffect(() => {
    if (!isRecording) return;
    const loc = latestLocation.current;
    if (!loc) return;

    const fetchWeather = async () => {
      const currentLoc = latestLocation.current;
      if (!currentLoc) return;
      const weather = await weatherService.getCurrentWeather(currentLoc.latitude, currentLoc.longitude);
      if (weather) {
        trackRecordingService.updateWeather(weather);
      }
    };

    fetchWeather();
    const interval = setInterval(fetchWeather, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isRecording]);

  const handleStopComplete = async () => {
    isStoppingRef.current = true;
    const distance = trackRecordingService.getStats().distance;
    if (distance < MIN_RECORDING_DISTANCE) {
      if (!isSimulatingRef.current) await backgroundLocationService.stop();
      await trackRecordingService.discardRecording();
      longPressProgress.setValue(0);
      lockedActivityType.current = null;
      Toast.show('运动距离太短，记录已丢弃');
      setTimeout(() => { isStoppingRef.current = false; }, 500);
      return;
    }
    if (!isSimulatingRef.current) await backgroundLocationService.stop();
    await trackRecordingService.stopRecording();
    longPressProgress.setValue(0);
    setTimeout(() => { showSummaryRef.current = true; setShowSummary(true); }, 400);
  };

  const handleStopCancelled = () => { isStoppingRef.current = false; };

  const handleDiscardFromSummary = () => {
    stopSummaryReplay();
    showSummaryRef.current = false;
    setShowSummary(false);
    isStoppingRef.current = false;
    lockedActivityType.current = null;
    backgroundLocationService.stop();
    trackRecordingService.discardRecording();
  };

  const isSavingRef = useRef(false);
  const handleSaveFromSummary = async () => {
    if (isSavingRef.current) return;
    stopSummaryReplay();
    isSavingRef.current = true;
    try {
      const ok = await trackRecordingService.retryUpload();
      if (ok) {
        trackRecordingService.discardRecording();
      } else {
        await retryUploadWithDialog();
      }
      showSummaryRef.current = false;
      setShowSummary(false);
      isStoppingRef.current = false;
      lockedActivityType.current = null;
    } finally { isSavingRef.current = false; }
  };

  const handleShareFromSummary = async () => {
    try {
      setShowShareCard(true);
      await new Promise<void>(r => setTimeout(() => r(), 150));
      if (!shareCardRef.current) throw new Error('Share card not rendered');
      const uri = await captureRef(shareCardRef, { format: 'png', quality: 1, result: 'tmpfile' });
      setShowShareCard(false);
      await Share.open({ url: uri.startsWith('file://') ? uri : `file://${uri}`, type: 'image/png' });
    } catch (e: any) {
      setShowShareCard(false);
      if (e?.message !== 'User did not share') console.error('Share failed:', e);
    }
  };

  // ---- Summary camera + replay ----
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
        { target: { latitude: centerLat, longitude: centerLon }, zoom: clampedZoom }, 500,
      );
    }, 300);
    return () => clearTimeout(timer);
  }, [showSummary, coloredSegments]);

  useEffect(() => {
    let delayTimer: ReturnType<typeof setTimeout> | null = null;
    if (showSummary && coloredSegments.length > 0 && replayProgress === 0) {
      delayTimer = setTimeout(() => { startSummaryReplay(); }, 1000);
    }
    return () => { if (delayTimer) clearTimeout(delayTimer); stopSummaryReplay(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSummary, coloredSegments]);

  // ---- Summary type info ----
  const summaryType = lockedActivityType.current ?? session?.activityType ?? 'RUNNING';

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      {/* Background Ambient Glow */}
      <View style={styles.ambientGlow} pointerEvents="none">
        <View style={[styles.glowOrb, dynamicStyles.glowOrbTop]} />
        <View style={[styles.glowOrb, dynamicStyles.glowOrbCenter]} />
        <View style={[styles.glowOrb, dynamicStyles.glowOrbBottom]} />
      </View>

      {/* 全屏模糊层 */}
      <View style={styles.fullScreenBlur} pointerEvents="none">
        <BlurView
          style={StyleSheet.absoluteFillObject}
          blurRadius={24}
          overlayColor={colors.OVERLAY.CARD}
          blurType="dark"
          blurAmount={24}
        />
      </View>

      {/* Header — hidden during summary */}
      {!showSummary && (
      <View style={[styles.headerBar, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity style={[styles.headerIconButton, dynamicStyles.headerIconButton]} onPress={() => DrawerOverlay.open()}>
          <IconHamburgerMenu size={20} color={colors.TEXT.PRIMARY} />
        </TouchableOpacity>
        <View style={[styles.searchBar, dynamicStyles.searchBar]}>
          <IconMagnifer size={18} color={colors.TEXT.TERTIARY} />
          <Text style={[styles.searchPlaceholder, dynamicStyles.searchPlaceholder]}>搜索路线...</Text>
        </View>
        <TouchableOpacity style={[styles.headerIconButton, dynamicStyles.headerIconButton]}>
          <IconMicrophone size={20} color={colors.TEXT.PRIMARY} />
        </TouchableOpacity>
      </View>
      )}

      {/* Map Card — expands to full screen during summary */}
      <View style={[styles.mapCard, showSummary && styles.mapCardSummary]}>
        {mapReady && <MapView
          ref={mapViewRef}
          style={StyleSheet.absoluteFillObject}
          mapType={mapType}
          initialCameraPosition={{ target: { latitude: 35.86, longitude: 104.19 }, zoom: 16 }}
          minZoom={3}
          maxZoom={20}
          myLocationEnabled={locationEnabled && !isSimulating && !showSummary}
          scaleControlsEnabled={false}
          zoomControlsEnabled={false}
          compassEnabled={false}
          rotateGesturesEnabled={showSummary}
          tiltGesturesEnabled={showSummary}
          labelsEnabled
          buildingsEnabled={false}
          trafficEnabled={false}
          distanceFilter={2}
          onLocation={handleLocation}
          onCameraMove={(e) => {
            currentZoomRef.current = e.nativeEvent.cameraPosition.zoom ?? currentZoomRef.current;
          }}
        >
          {displaySegments.map((seg, idx) => (
            <Polyline
              key={`segment-${idx}`}
              points={seg.coords}
              color={colors.PRIMARY}
              width={8}
              zIndex={10}
            />
          ))}
        </MapView>}
        {mapError && (
          <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
            <Text style={{ color: colors.TEXT.TERTIARY, textAlign: 'center', marginTop: 80 }}>
              地图加载失败
            </Text>
          </View>
        )}

        <MapOverlayButtons
          showSummary={showSummary}
          hasGps={hasGps}
          gpsStrength={gpsStrength}
          pulseAnim={pulseAnim}
          gpsColors={gpsColors}
          isSimulating={isSimulating}
          colors={colors}
          onLocate={handleLocate}
          onSimToggle={handleSimButton}
        />

        {showSummary && (
          <SummaryOverlay
            paddingTop={insets.top + 16}
            paddingBottom={insets.bottom + 24}
            animatedStats={animatedStats}
            activityType={summaryType as ActivityType}
            dynamicStyles={dynamicStyles}
            colors={colors}
            laps={laps}
            elevationProfile={elevationProfile}
            weather={session?.weather}
            onDiscard={handleDiscardFromSummary}
            onShare={handleShareFromSummary}
            onSave={handleSaveFromSummary}
          />
        )}

        {!showSummary && (
          <RecordingStatsPanel
            activityIndex={activityIndex}
            stats={stats}
            isIdle={isIdle}
            isRecording={isRecording}
            isPaused={isPaused}
            isStopping={!!isStoppingRef.current}
            colors={colors}
            dynamicStyles={dynamicStyles}
            longPressProgress={longPressProgress}
            elevationProfile={elevationProfile}
            onCycleType={() => {
              if (!isIdle || isStoppingRef.current || lockedActivityType.current) return;
              setActivityIndex(prev => (prev + 1) % ACTIVITY_CYCLE.length);
            }}
            onStart={handleStart}
            onPause={handlePause}
            onResume={handleResume}
            onStopComplete={handleStopComplete}
            onStopCancelled={handleStopCancelled}
          />
        )}
      </View>

      {showShareCard && (
        <ShareCard
          shareCardRef={shareCardRef}
          shareTrackPoints={shareTrackPoints}
          stats={stats}
          activityType={summaryType as ActivityType}
          dynamicStyles={dynamicStyles}
          colors={colors}
          weather={session?.weather}
        />
      )}
    </View>
  );
};
