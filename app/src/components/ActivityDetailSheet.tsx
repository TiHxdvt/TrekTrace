/**
 * 活动详情底部弹窗
 * 使用 Modal 保证层级高于 TabBar
 * MapView 永远不卸载，关闭时只清空数据避免原生崩溃
 */

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  Modal,
  Animated,
  View,
  Text,
  StyleSheet,
  TouchableWithoutFeedback,
  Dimensions,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import { format } from 'date-fns';
import { COLORS, BORDER_RADIUS, TYPOGRAPHY, ANIMATION } from '../theme';
import { ACTIVITY_TYPE_META } from '../constants/activityMeta';
import { formatDuration, formatPaceFromDistance } from '../utils/format';
import { prepareChartData, downsample } from '../utils/trackData';
import { RouteMiniMap } from './RouteMiniMap';
import { ActivityChart } from './ActivityChart';
import { activityService } from '../services/activityService';
import type { ActivityResponseDTO, TrackPointUploadDTO } from '../types';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SHEET_HEIGHT_COLLAPSED = 280;
const SHEET_HEIGHT_EXPANDED = Math.round(SCREEN_HEIGHT * 0.75);
const VELOCITY_THRESHOLD = 500;
const CLOSE_THRESHOLD = 80;

interface ActivityDetailSheetProps {
  activity: ActivityResponseDTO | null;
  onClose: () => void;
}

type SheetState = 'collapsed' | 'expanded';

// 保持 MapView 永远挂载的空数据
const EMPTY_POINTS: TrackPointUploadDTO[] = [];

export const ActivityDetailSheet: React.FC<ActivityDetailSheetProps> = ({
  activity,
  onClose,
}) => {
  const insets = useSafeAreaInsets();

  // Modal 始终挂载，用 slideAnim 控制显隐
  const [sheetVisible, setSheetVisible] = useState(false);
  const [visibleActivity, setVisibleActivity] = useState<ActivityResponseDTO | null>(null);
  const [sheetState, setSheetState] = useState<SheetState>('collapsed');
  const [trackPoints, setTrackPoints] = useState<TrackPointUploadDTO[] | null>(null);
  const [trackLoading, setTrackLoading] = useState(false);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const sheetHeightAnim = useRef(new Animated.Value(SHEET_HEIGHT_COLLAPSED)).current;

  const sheetStateRef = useRef<SheetState>('collapsed');
  useEffect(() => { sheetStateRef.current = sheetState; }, [sheetState]);

  const visibleActivityRef = useRef<ActivityResponseDTO | null>(null);
  useEffect(() => { visibleActivityRef.current = visibleActivity; }, [visibleActivity]);

  const trackCache = useRef<Map<number, TrackPointUploadDTO[]>>(new Map());

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // ---- 打开 ----

  useEffect(() => {
    if (!activity) return;

    setVisibleActivity(activity);
    setSheetVisible(true);
    setSheetState('collapsed');
    sheetHeightAnim.setValue(SHEET_HEIGHT_COLLAPSED);
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: ANIMATION.NORMAL,
      useNativeDriver: true,
    }).start();

    // 预加载轨迹数据
    let stale = false;
    const actId = activity.id;
    if (trackCache.current.has(actId)) {
      setTrackPoints(trackCache.current.get(actId)!);
    } else {
      setTrackLoading(true);
      activityService
        .getTrackPoints(actId)
        .then(points => {
          if (stale) return;
          trackCache.current.set(actId, points);
          setTrackPoints(points);
        })
        .catch(() => {
          if (stale) return;
          setTrackPoints(null);
        })
        .finally(() => {
          if (!stale) setTrackLoading(false);
        });
    }
    return () => { stale = true; };
  }, [activity, slideAnim, sheetHeightAnim]);

  // ---- 关闭：只动画隐藏，不卸载 Modal 内的 MapView ----

  const animateClose = useCallback(() => {
    setSheetState('collapsed');
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: ANIMATION.FAST,
      useNativeDriver: true,
    }).start(() => {
      setSheetVisible(false);
      // 不 setVisibleActivity(null)！保持挂载避免 MapView 崩溃
      // 只清空轨迹数据让地图不画线
      setTrackPoints(null);
      setTrackLoading(false);
      onCloseRef.current();
    });
  }, [slideAnim]);

  const snapToCollapsed = useCallback(() => {
    setSheetState('collapsed');
    Animated.timing(sheetHeightAnim, {
      toValue: SHEET_HEIGHT_COLLAPSED,
      duration: ANIMATION.NORMAL,
      useNativeDriver: false,
    }).start();
  }, [sheetHeightAnim]);

  const snapToExpanded = useCallback(() => {
    const act = visibleActivityRef.current;
    if (!act) return;
    setSheetState('expanded');
    Animated.timing(sheetHeightAnim, {
      toValue: SHEET_HEIGHT_EXPANDED,
      duration: ANIMATION.NORMAL,
      useNativeDriver: false,
    }).start();
  }, [sheetHeightAnim]);

  // ---- 拖拽手势 ----

  const panGesture = useMemo(() => {
    let rafId: number | null = null;
    let pendingEvent: { translationY: number; velocityY: number } | null = null;

    const flushUpdate = () => {
      rafId = null;
      if (!pendingEvent) return;
      const event = pendingEvent;
      pendingEvent = null;
      const current = sheetStateRef.current;
      if (current === 'collapsed') {
        const newHeight = Math.max(
          SHEET_HEIGHT_COLLAPSED * 0.6,
          Math.min(SHEET_HEIGHT_EXPANDED, SHEET_HEIGHT_COLLAPSED - event.translationY),
        );
        sheetHeightAnim.setValue(newHeight);
      } else {
        const newHeight = Math.max(
          SHEET_HEIGHT_COLLAPSED,
          Math.min(SHEET_HEIGHT_EXPANDED, SHEET_HEIGHT_EXPANDED - event.translationY),
        );
        sheetHeightAnim.setValue(newHeight);
      }
    };

    return Gesture.Pan()
      .activeOffsetY([-10, 10])
      .onUpdate((event) => {
        pendingEvent = { translationY: event.translationY, velocityY: event.velocityY };
        if (!rafId) {
          rafId = requestAnimationFrame(flushUpdate);
        }
      })
      .onEnd((event) => {
        // Flush any pending rAF update and cancel future ones
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
        // Apply final position immediately
        pendingEvent = null;
        const { translationY, velocityY } = event;
        const current = sheetStateRef.current;

        // 快速向上 → 展开
        if (velocityY < -VELOCITY_THRESHOLD) {
          snapToExpanded();
          return;
        }
        // 快速向下 → 折叠或关闭
        if (velocityY > VELOCITY_THRESHOLD) {
          if (current === 'collapsed') {
            animateClose();
          } else {
            snapToCollapsed();
          }
          return;
        }

        // 慢速拖拽
        if (current === 'collapsed') {
          if (translationY < -50) {
            snapToExpanded();
          } else if (translationY > CLOSE_THRESHOLD) {
            animateClose();
          } else {
            snapToCollapsed();
          }
        } else {
          if (translationY > 80) {
            snapToCollapsed();
          } else {
            snapToExpanded();
          }
        }
      });
  }, [sheetHeightAnim, snapToCollapsed, snapToExpanded, animateClose]);

  // ---- 图表数据 ----

  const chartDataSets = useMemo(() => {
    if (!trackPoints || trackPoints.length < 2) return null;
    const raw = prepareChartData(trackPoints);
    return {
      elevationData: downsample(raw.elevationData, 80),
      paceData: downsample(raw.paceData, 80),
      speedData: downsample(raw.speedData, 80),
    };
  }, [trackPoints]);

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [SCREEN_HEIGHT, 0],
  });

  // MapView 用空数据保持挂载，有数据时才画线
  const mapPoints = trackPoints && trackPoints.length >= 2 ? trackPoints : EMPTY_POINTS;
  const showContent = sheetVisible && visibleActivity !== null;

  const meta = visibleActivity ? ACTIVITY_TYPE_META[visibleActivity.type as keyof typeof ACTIVITY_TYPE_META] : null;
  const TypeIcon = meta?.icon;
  const startDate = visibleActivity ? new Date(visibleActivity.startTime) : new Date();
  const endDate = visibleActivity ? new Date(visibleActivity.endTime) : new Date();

  return (
    <Modal visible={showContent} transparent animationType="none" onRequestClose={animateClose}>
      <GestureHandlerRootView style={styles.root}>
        <View style={styles.overlay}>
          {/* 点击 sheet 上方空白区域关闭 */}
          <TouchableWithoutFeedback onPress={animateClose}>
            <Animated.View
              style={[
                styles.topArea,
                { height: sheetHeightAnim.interpolate({
                  inputRange: [0, SCREEN_HEIGHT],
                  outputRange: [SCREEN_HEIGHT, 0],
                })},
              ]}
            />
          </TouchableWithoutFeedback>

          <Animated.View style={{ transform: [{ translateY }] }}>
            {/* 顶部阴影渐变 */}
            <View style={styles.topShadow} pointerEvents="none" />
            <Animated.View
              style={[
                styles.sheet,
                {
                  height: sheetHeightAnim,
                },
              ]}
            >
              {/* 拖拽热区：GestureDetector 绑定到 dragZone */}
              <GestureDetector gesture={panGesture}>
                <View style={styles.dragZone}>
                  <View style={styles.dragIndicator} />
                  {/* 类型 + 日期标题 */}
                  <View style={styles.sheetHeader}>
                    <View style={styles.typeBadge}>
                      {TypeIcon && <TypeIcon size={16} color={COLORS.TEXT.SECONDARY} />}
                      <Text style={styles.typeBadgeText}>
                        {meta?.label ?? visibleActivity?.type}
                      </Text>
                    </View>
                    <Text style={styles.sheetDate}>
                      {format(startDate, 'yyyy年M月d日')}
                    </Text>
                  </View>
                </View>
              </GestureDetector>

              {visibleActivity && (
              <ScrollView
                scrollEnabled={sheetState === 'expanded'}
                showsVerticalScrollIndicator={false}
                bounces={false}
                nestedScrollEnabled
                contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
              >
                {/* 四格统计 */}
                <View style={styles.statsGrid}>
                  <View style={styles.statCell}>
                    <Text style={styles.statLabel}>距离</Text>
                    <Text style={styles.statValue}>
                      {(visibleActivity.distance / 1000).toFixed(2)}
                    </Text>
                    <Text style={styles.statUnit}>km</Text>
                  </View>
                  <View style={styles.statCell}>
                    <Text style={styles.statLabel}>时长</Text>
                    <Text style={styles.statValue}>{formatDuration(visibleActivity.duration)}</Text>
                    <Text style={styles.statUnit}> </Text>
                  </View>
                  <View style={styles.statCell}>
                    <Text style={styles.statLabel}>配速</Text>
                    <Text style={styles.statValue}>
                      {formatPaceFromDistance(visibleActivity.distance, visibleActivity.duration)}
                    </Text>
                    <Text style={styles.statUnit}>min/km</Text>
                  </View>
                  <View style={styles.statCell}>
                    <Text style={styles.statLabel}>爬升</Text>
                    <Text style={styles.statValue}>{Math.round(visibleActivity.elevationGain)}</Text>
                    <Text style={styles.statUnit}>m</Text>
                  </View>
                </View>

                {/* 路线概览：始终渲染 MapView，用空数据保持挂载 */}
                {(trackLoading || (trackPoints && trackPoints.length >= 2)) && (
                  <View style={styles.expandedContent}>
                    {trackLoading ? (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
                        <Text style={styles.loadingText}>加载轨迹数据...</Text>
                      </View>
                    ) : (
                      <>
                        <View style={styles.sectionDivider} />
                        <View style={styles.sectionTitleRow}>
                          <Text style={styles.sectionTitle}>路线概览</Text>
                          <Text style={styles.sectionTime}>
                            {format(startDate, 'HH:mm')} → {format(endDate, 'HH:mm')}
                          </Text>
                        </View>
                        <RouteMiniMap points={mapPoints} />
                        {chartDataSets && (
                          <>
                            <View style={styles.sectionDivider} />
                            <ActivityChart data={chartDataSets.elevationData} type="elevation" />
                            <ActivityChart data={chartDataSets.speedData} type="speed" />
                          </>
                        )}
                      </>
                    )}
                  </View>
                )}
              </ScrollView>
              )}
            </Animated.View>
          </Animated.View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  topArea: {
    width: '100%',
  },
  topShadow: {
    height: 20,
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 16,
  },
  sheet: {
    backgroundColor: COLORS.BACKGROUND,
    borderTopLeftRadius: BORDER_RADIUS.G2.LG,
    borderTopRightRadius: BORDER_RADIUS.G2.LG,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: COLORS.BORDER.MEDIUM,
    overflow: 'hidden',
  },
  dragZone: {
    paddingTop: 12,
    alignItems: 'center',
  },
  dragIndicator: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.TEXT.QUINARY,
    marginBottom: 20,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 24,
    width: '100%',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.OVERLAY.MEDIUM,
    borderWidth: 1,
    borderColor: COLORS.BORDER.MEDIUM,
    borderRadius: BORDER_RADIUS.FULL,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  typeBadgeText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    fontWeight: '500',
    color: COLORS.TEXT.SECONDARY,
  },
  sheetDate: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    color: COLORS.TEXT.TERTIARY,
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: TYPOGRAPHY.FONT_SIZE.XS,
    color: COLORS.TEXT.QUATERNARY,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
    marginBottom: 4,
  },
  statValue: {
    fontSize: TYPOGRAPHY.FONT_SIZE.XL,
    fontWeight: '600',
    color: COLORS.TEXT.PRIMARY,
    marginBottom: 2,
  },
  statUnit: {
    fontSize: TYPOGRAPHY.FONT_SIZE.XS,
    color: COLORS.TEXT.QUINARY,
  },
  expandedContent: {
    paddingBottom: 16,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: COLORS.BORDER.LIGHT,
    marginHorizontal: 20,
    marginVertical: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    fontWeight: '500',
    color: COLORS.TEXT.TERTIARY,
  },
  sectionTime: {
    fontSize: TYPOGRAPHY.FONT_SIZE.XS,
    color: COLORS.TEXT.QUINARY,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  loadingText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    color: COLORS.TEXT.QUATERNARY,
  },
  errorText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    color: COLORS.TEXT.TERTIARY,
  },
});
