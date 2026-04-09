/**
 * 运动记录页面
 * 地图卡片底部控制面板：四角数据 + 中间双按钮
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import { BlurView } from '@react-native-community/blur';
import { MapView, AMapSdk, MapType } from 'react-native-amap3d';
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
  IconHeartBold,
  IconGps,
} from '../components/SolarIcons';

type ActivityType = 'running' | 'cycling' | 'hiking';
type RecordState = 'idle' | 'recording' | 'paused';

const ACTIVITY_CYCLE: ActivityType[] = ['hiking', 'running', 'cycling'];

const ACTIVITY_ICONS: Record<ActivityType, React.FC<{ size?: number; color?: string }>> = {
  running: IconRunning,
  cycling: IconBicycle,
  hiking: IconBonfire,
};

export const ActivityScreen: React.FC = () => {
  const [activityIndex, setActivityIndex] = useState(1); // 默认跑步
  const insets = useSafeAreaInsets();
  const mapViewRef = useRef<MapView>(null);
  const hasMovedToLocation = useRef(false);
  const latestLocation = useRef<{ latitude: number; longitude: number } | null>(null);

  // 初始化高德地图 SDK + 请求定位权限
  useEffect(() => {
    AMapSdk.init(APP_CONFIG.AMAP_API_KEY);

    if (Platform.OS === 'android') {
      PermissionsAndroid.requestMultiple([
        'android.permission.ACCESS_FINE_LOCATION',
        'android.permission.ACCESS_COARSE_LOCATION',
      ]).catch(() => {});
    }
  }, []);

  // 首次获取定位后，移动相机到当前位置
  const handleLocation = (event: any) => {
    const { latitude, longitude } = event.nativeEvent;
    if (latitude && longitude) {
      latestLocation.current = { latitude, longitude };
      if (!hasMovedToLocation.current) {
        hasMovedToLocation.current = true;
        mapViewRef.current?.moveCamera(
          { target: { latitude, longitude }, zoom: 15 },
          500,
        );
      }
    }
  };

  // 自定义定位按钮：移动到当前位置
  const handleLocate = () => {
    const loc = latestLocation.current;
    if (loc) {
      mapViewRef.current?.moveCamera(
        { target: { latitude: loc.latitude, longitude: loc.longitude }, zoom: 15 },
        500,
      );
    }
  };
  const [recordState, setRecordState] = useState<RecordState>('idle');

  const selectedType = ACTIVITY_CYCLE[activityIndex];
  const isIdle = recordState === 'idle';
  const isRecording = recordState === 'recording';
  const isPaused = recordState === 'paused';

  // 循环切换运动模式
  const cycleType = () => {
    if (!isIdle) return;
    setActivityIndex(prev => (prev + 1) % ACTIVITY_CYCLE.length);
  };

  const handleStart = () => setRecordState('recording');
  const handlePause = () => setRecordState('paused');
  const handleResume = () => setRecordState('recording');
  const handleStop = () => setRecordState('idle');

  // 左按钮：空闲=模式选择，记录中=暂停，暂停中=继续
  const handleLeftButton = () => {
    if (isIdle) cycleType();
    else if (isRecording) handlePause();
    else if (isPaused) handleResume();
  };

  // 右按钮：空闲=开始，记录中/暂停中=停止
  const handleRightButton = () => {
    if (isIdle) handleStart();
    else handleStop();
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
            target: { latitude: 39.9042, longitude: 116.4074 },
            zoom: 15,
          }}
          myLocationEnabled
          scaleControlsEnabled
          zoomControlsEnabled={false}
          compassEnabled={false}
          labelsEnabled
          buildingsEnabled
          trafficEnabled={false}
          onLocation={handleLocation}
        />

        {/* Heart Button - 左上角 */}
        <View style={styles.mapHeartWrapper}>
          <BlurView
            style={StyleSheet.absoluteFillObject}
            blurRadius={12}
            overlayColor="rgba(255, 255, 255, 0.2)"
            blurType="dark"
            blurAmount={12}
            autoUpdate
          />
          <TouchableOpacity style={styles.mapHeartContent}>
            <IconHeartBold size={16} />
          </TouchableOpacity>
        </View>

        {/* Locate Button - 右下角 */}
        <View style={styles.mapLocateWrapper}>
          <BlurView
            style={StyleSheet.absoluteFillObject}
            blurRadius={12}
            overlayColor="rgba(28, 30, 38, 0.7)"
            blurType="dark"
            blurAmount={12}
            autoUpdate
          />
          <TouchableOpacity style={styles.mapLocateContent} onPress={handleLocate}>
            <IconGps size={18} color={COLORS.TEXT.SECONDARY} />
          </TouchableOpacity>
        </View>

        {/* ========== Control Panel ========== */}
        <View style={styles.panelWrapper}>
          <View style={styles.panelContent}>

            {/* 一行数据 */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>距离</Text>
                <View style={styles.statValueRow}>
                  <Text style={[styles.statValue, isIdle && styles.statValueDim]}>
                    {isIdle ? '--' : '0.00'}
                  </Text>
                  <Text style={styles.statUnit}>km</Text>
                </View>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statItem}>
                <Text style={styles.statLabel}>时长</Text>
                <View style={styles.statValueRow}>
                  <Text style={[styles.statValue, isIdle && styles.statValueDim]}>
                    {isIdle ? '--' : '00:00'}
                  </Text>
                  <Text style={styles.statUnit}> </Text>
                </View>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statItem}>
                <Text style={styles.statLabel}>配速</Text>
                <View style={styles.statValueRow}>
                  <Text style={[styles.statValue, isIdle && styles.statValueDim]}>
                    {isIdle ? '--' : "0'00\""}
                  </Text>
                  <Text style={styles.statUnit}>min/km</Text>
                </View>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statItem}>
                <Text style={styles.statLabel}>海拔</Text>
                <View style={styles.statValueRow}>
                  <Text style={[styles.statValue, isIdle && styles.statValueDim]}>
                    {isIdle ? '--' : '0'}
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
                  isRecording ? styles.pauseBtnBg : null,
                  isPaused ? styles.resumeBtnBg : null,
                ]}
              >
                {isIdle ? (
                  <ActiveIcon size={20} color={COLORS.TEXT.SECONDARY} />
                ) : isRecording ? (
                  <Text style={styles.pauseIcon}>❚❚</Text>
                ) : (
                  <Text style={styles.resumeIcon}>▶</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleRightButton}
                activeOpacity={0.7}
                style={[
                  styles.actionBtn,
                  isIdle ? styles.startBtnBg : styles.stopBtnBg,
                ]}
              >
                {isIdle ? (
                  <Text style={styles.startIcon}>▶</Text>
                ) : (
                  <Text style={styles.stopIcon}>■</Text>
                )}
              </TouchableOpacity>
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
    borderRadius: BORDER_RADIUS.XXXL,
    overflow: 'hidden',
    zIndex: 10,
  },

  // Heart
  mapHeartWrapper: {
    position: 'absolute', top: 16, left: 16,
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 1, borderColor: COLORS.BORDER.MEDIUM,
    overflow: 'hidden',
  },
  mapHeartContent: {
    width: 36, height: 36,
    justifyContent: 'center', alignItems: 'center',
  },

  // Locate Button
  mapLocateWrapper: {
    position: 'absolute', bottom: 130, right: 12,
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 1, borderColor: COLORS.BORDER.MEDIUM,
    overflow: 'hidden',
  },
  mapLocateContent: {
    width: 36, height: 36,
    justifyContent: 'center', alignItems: 'center',
  },

  // ========== Control Panel ==========
  panelWrapper: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: COLORS.OVERLAY.NAV,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER.MEDIUM,
    borderBottomLeftRadius: BORDER_RADIUS.XXXL,
    borderBottomRightRadius: BORDER_RADIUS.XXXL,
  },
  panelContent: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },

  // 一行数据
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: COLORS.BORDER.MEDIUM,
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
  },

  // 图标样式
  startIcon: {
    fontSize: 18, color: COLORS.TEXT.PRIMARY, marginLeft: 2,
  },
  stopIcon: {
    fontSize: 14, color: COLORS.ERROR,
  },
  pauseIcon: {
    fontSize: 12, color: COLORS.TEXT.PRIMARY, letterSpacing: -2,
  },
  resumeIcon: {
    fontSize: 16, color: COLORS.TEXT.PRIMARY, marginLeft: 2,
  },
});
