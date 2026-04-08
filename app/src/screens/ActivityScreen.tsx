/**
 * 运动记录页面
 * 地图卡片底部控制面板：四角数据 + 中间双按钮
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { BlurView } from '@react-native-community/blur';
import { MapView, AMapSdk } from 'react-native-amap3d';
import { COLORS, BORDER_RADIUS } from '../theme';
import {
  IconHamburgerMenu,
  IconMagnifer,
  IconMicrophone,
  IconRunning,
  IconBicycle,
  IconBonfire,
  IconHeartBold,
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

  // 初始化高德地图 SDK
  useEffect(() => {
    AMapSdk.init('6518a83abe3771f3a920bf329cbdefb0');
  }, []);
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
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.headerIconButton}>
          <IconHamburgerMenu size={20} color="#fff" />
        </TouchableOpacity>
        <View style={styles.searchBar}>
          <IconMagnifer size={18} color="rgba(255,255,255,0.5)" />
          <Text style={styles.searchPlaceholder}>搜索路线...</Text>
        </View>
        <TouchableOpacity style={styles.headerIconButton}>
          <IconMicrophone size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Map Card */}
      <View style={styles.mapCard}>
        {/* 高德地图 */}
        <MapView
          style={StyleSheet.absoluteFillObject}
          initialCameraPosition={{
            target: { latitude: 39.9042, longitude: 116.4074 }, // 默认北京
            zoom: 15,
          }}
          myLocationEnabled
          myLocationButtonEnabled
          scaleControlsEnabled
          zoomControlsEnabled={false}
          compassEnabled={false}
          labelsEnabled
          buildingsEnabled
          trafficEnabled={false}
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

        {/* ========== Control Panel ========== */}
        <View style={styles.panelWrapper}>
          <BlurView
            style={StyleSheet.absoluteFillObject}
            blurRadius={20}
            overlayColor="rgba(28, 30, 38, 0.65)"
            blurType="dark"
            blurAmount={20}
            autoUpdate
          />
          <View style={styles.panelContent}>

            {/* 四角数据 */}
            <View style={styles.cornersGrid}>
              {/* 左上：距离 */}
              <View style={styles.cornerItem}>
                <Text style={styles.cornerLabel}>距离</Text>
                <View style={styles.cornerValueRow}>
                  <Text style={[
                    styles.cornerValue,
                    isIdle && styles.cornerValueDim,
                  ]}>
                    {isIdle ? '--' : '0.00'}
                  </Text>
                  <Text style={styles.cornerUnit}>km</Text>
                </View>
              </View>

              {/* 右上：时长 */}
              <View style={[styles.cornerItem, styles.cornerItemRight]}>
                <Text style={styles.cornerLabel}>时长</Text>
                <View style={styles.cornerValueRow}>
                  <Text style={[
                    styles.cornerValue,
                    isIdle && styles.cornerValueDim,
                  ]}>
                    {isIdle ? '--' : '00:00'}
                  </Text>
                  <Text style={styles.cornerUnit}>{isIdle ? '' : ' '}</Text>
                </View>
              </View>

              {/* 左下：配速 */}
              <View style={styles.cornerItem}>
                <Text style={styles.cornerLabel}>配速</Text>
                <View style={styles.cornerValueRow}>
                  <Text style={[
                    styles.cornerValue,
                    isIdle && styles.cornerValueDim,
                  ]}>
                    {isIdle ? '--' : '--'}
                  </Text>
                  <Text style={styles.cornerUnit}>min/km</Text>
                </View>
              </View>

              {/* 右下：海拔 */}
              <View style={[styles.cornerItem, styles.cornerItemRight]}>
                <Text style={styles.cornerLabel}>海拔</Text>
                <View style={styles.cornerValueRow}>
                  <Text style={[
                    styles.cornerValue,
                    isIdle && styles.cornerValueDim,
                  ]}>
                    {isIdle ? '--' : '0'}
                  </Text>
                  <Text style={styles.cornerUnit}>m</Text>
                </View>
              </View>
            </View>

            {/* 中间双按钮 */}
            <View style={styles.centerButtons}>
              {/* 左按钮 */}
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
                  <ActiveIcon size={22} color="rgba(255,255,255,0.7)" />
                ) : isRecording ? (
                  <Text style={styles.pauseIcon}>❚❚</Text>
                ) : (
                  <Text style={styles.resumeIcon}>▶</Text>
                )}
              </TouchableOpacity>

              {/* 右按钮 */}
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
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
  },
  glowOrbCenter: {
    top: '40%', left: '50%', transform: [{ translateX: -150 }],
    width: 400, height: 400,
    backgroundColor: 'rgba(236, 72, 153, 0.08)',
  },
  glowOrbBottom: {
    bottom: -80, left: -60, width: 500, height: 500,
    backgroundColor: 'rgba(147, 51, 234, 0.15)',
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
    paddingTop: 60,
    paddingBottom: 16,
    gap: 12,
    zIndex: 20,
  },
  headerIconButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center', alignItems: 'center',
  },
  searchBar: {
    flex: 1, height: 40,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, gap: 12,
  },
  searchPlaceholder: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.5)',
  },

  // Map Card
  mapCard: {
    flex: 1,
    marginHorizontal: 20,
    marginBottom: 140,
    borderRadius: BORDER_RADIUS.XXXL,
    overflow: 'hidden',
    zIndex: 10,
  },

  // Heart
  mapHeartWrapper: {
    position: 'absolute', top: 16, left: 16,
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  mapHeartContent: {
    width: 36, height: 36,
    justifyContent: 'center', alignItems: 'center',
  },

  // ========== Control Panel ==========
  panelWrapper: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    borderBottomLeftRadius: BORDER_RADIUS.XXXL,
    borderBottomRightRadius: BORDER_RADIUS.XXXL,
    overflow: 'hidden',
  },
  panelContent: {
    paddingVertical: 20,
    paddingHorizontal: 24,
  },

  // 四角数据网格
  cornersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  cornerItem: {
    width: '45%',
    marginBottom: 12,
  },
  cornerItemRight: {
    alignItems: 'flex-end',
  },
  cornerLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
    marginBottom: 2,
  },
  cornerValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  cornerValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  cornerValueDim: {
    color: 'rgba(255,255,255,0.2)',
  },
  cornerUnit: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.3)',
    fontWeight: '400',
    marginLeft: 3,
  },

  // 中间双按钮
  centerButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  actionBtn: {
    width: 52, height: 52,
    borderRadius: 26,
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
    backgroundColor: '#22c55e',
    shadowColor: '#22c55e',
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
    fontSize: 18, color: '#fff', marginLeft: 2,
  },
  stopIcon: {
    fontSize: 14, color: '#ef4444',
  },
  pauseIcon: {
    fontSize: 12, color: '#fff', letterSpacing: -2,
  },
  resumeIcon: {
    fontSize: 16, color: '#fff', marginLeft: 2,
  },
});
