/**
 * 活动详情底部弹窗
 * 使用 Modal 保证层级高于 TabBar
 * MapView 永远不卸载，关闭时只清空数据避免原生崩溃
 *
 * 动画策略（全部 native driver，0 JS bridge 开销）：
 * - slideAnim: 0→1 控制整张 sheet 滑入/滑出（translateY）
 * - contentSlideAnim: 0→SHEET_SLIDE_RANGE 控制展开/折叠（translateY + overflow:hidden）
 *
 * Modal 始终 visible，用 pointerEvents + translateY 控制交互，避免 Dialog 重建开销
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
const SHEET_SLIDE_RANGE = SHEET_HEIGHT_EXPANDED - SHEET_HEIGHT_COLLAPSED;
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

  const [sheetVisible, setSheetVisible] = useState(false);
  const [visibleActivity, setVisibleActivity] = useState<ActivityResponseDTO | null>(null);
  const [sheetState, setSheetState] = useState<SheetState>('collapsed');
  const [trackPoints, setTrackPoints] = useState<TrackPointUploadDTO[] | null>(null);
  const [trackLoading, setTrackLoading] = useState(false);

  // slideAnim: 0=屏幕外, 1=屏幕内
  const slideAnim = useRef(new Animated.Value(0)).current;
  // contentSlideAnim: 0=展开, SHEET_SLIDE_RANGE=折叠
  const contentSlideAnim = useRef(new Animated.Value(SHEET_SLIDE_RANGE)).current;

  const sheetStateRef = useRef<SheetState>('collapsed');
  useEffect(() => { sheetStateRef.current = sheetState; }, [sheetState]);

  const visibleActivityRef = useRef<ActivityResponseDTO | null>(null);
  useEffect(() => { visibleActivityRef.current = visibleActivity; }, [visibleActivity]);

  const trackCache = useRef<Map<number, TrackPointUploadDTO[]>>(new Map());

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // ---- 打开 ----
  // 先让 Modal 挂载 + 内容渲染完一帧，再启动滑入动画

  useEffect(() => {
    if (!activity) return;

    setVisibleActivity(activity);
    setSheetVisible(true);
    setSheetState('collapsed');
    contentSlideAnim.setValue(SHEET_SLIDE_RANGE);
    slideAnim.setValue(0);

    // 延迟一帧，给 Modal 原生 Dialog 创建 + 内容首次渲染留时间
    const rafId = requestAnimationFrame(() => {
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: ANIMATION.NORMAL,
        useNativeDriver: true,
      }).start();
    });

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
    return () => {
      stale = true;
      cancelAnimationFrame(rafId);
    };
  }, [activity, slideAnim, contentSlideAnim]);

  // ---- 关闭 ----
  // 动画跑完后才销毁 Modal，避免销毁开销和动画同时发生

  const animateClose = useCallback(() => {
    // sheetState 延迟到动画结束后再改，避免重渲染干扰动画
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: ANIMATION.FAST,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) return;
      setSheetState('collapsed');
      setSheetVisible(false);
      setTrackPoints(null);
      setTrackLoading(false);
      contentSlideAnim.setValue(SHEET_SLIDE_RANGE);
      onCloseRef.current();
    });
  }, [slideAnim, contentSlideAnim]);

  const snapToCollapsed = useCallback(() => {
    setSheetState('collapsed');
    Animated.parallel([
      Animated.spring(contentSlideAnim, {
        toValue: SHEET_SLIDE_RANGE,
        useNativeDriver: true,
        overshootClamping: true,
      }),
      // 恢复 slideAnim 到 1（sheet 回到屏幕内）
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
        overshootClamping: true,
      }),
    ]).start();
  }, [contentSlideAnim, slideAnim]);

  const snapToExpanded = useCallback(() => {
    const act = visibleActivityRef.current;
    if (!act) return;
    setSheetState('expanded');
    Animated.spring(contentSlideAnim, {
      toValue: 0,
      useNativeDriver: true,
      overshootClamping: true,
    }).start();
  }, [contentSlideAnim]);

  // ---- 拖拽手势 ----
  // 关键改动：向下拖关闭时，sheet 跟手移动（通过 slideAnim）
  // 展开态向下拖超过折叠距离后，也无缝过渡到关闭拖动

  const panGesture = useMemo(() => {
    let rafId: number | null = null;
    let pendingEvent: { translationY: number; velocityY: number } | null = null;

    const flushUpdate = () => {
      rafId = null;
      if (!pendingEvent) return;
      const event = pendingEvent;
      pendingEvent = null;
      const current = sheetStateRef.current;
      const dy = event.translationY;

      if (current === 'collapsed') {
        if (dy >= 0) {
          // 折叠态向下拖 → 关闭：用 slideAnim 移动整张 sheet
          contentSlideAnim.setValue(SHEET_SLIDE_RANGE);
          // dy 映射到 slideAnim: 0 → 1 范围，1=屏幕内，0=屏幕外
          const slideOffset = Math.max(0, 1 - dy / (SCREEN_HEIGHT * 0.5));
          slideAnim.setValue(slideOffset);
        } else {
          // 折叠态向上拖 → 展开
          contentSlideAnim.setValue(
            Math.max(0, SHEET_SLIDE_RANGE + dy),
          );
          slideAnim.setValue(1);
        }
      } else {
        // expanded
        if (dy > 0) {
          // 展开态向下拖
          if (dy <= SHEET_SLIDE_RANGE) {
            // 阶段1：折叠（contentSlideAnim）
            contentSlideAnim.setValue(Math.min(SHEET_SLIDE_RANGE, dy));
            slideAnim.setValue(1);
          } else {
            // 阶段2：已完全折叠，继续向下 → 关闭（slideAnim）
            contentSlideAnim.setValue(SHEET_SLIDE_RANGE);
            const excess = dy - SHEET_SLIDE_RANGE;
            const slideOffset = Math.max(0, 1 - excess / (SCREEN_HEIGHT * 0.5));
            slideAnim.setValue(slideOffset);
          }
        } else {
          // 展开态向上拖 → 保持展开
          contentSlideAnim.setValue(0);
          slideAnim.setValue(1);
        }
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
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
        pendingEvent = null;
        const { translationY, velocityY } = event;
        const current = sheetStateRef.current;

        // 快速向上 → 展开
        if (velocityY < -VELOCITY_THRESHOLD) {
          snapToExpanded();
          return;
        }
        // 快速向下 → 关闭或折叠
        if (velocityY > VELOCITY_THRESHOLD) {
          if (current === 'collapsed') {
            animateClose();
          } else {
            // 展开态快速向下：如果已经超过折叠范围则关闭，否则折叠
            if (translationY > SHEET_SLIDE_RANGE) {
              animateClose();
            } else {
              snapToCollapsed();
            }
          }
          return;
        }

        // 慢速拖拽 → 根据位置判断
        if (current === 'collapsed') {
          if (translationY > CLOSE_THRESHOLD) {
            animateClose();
          } else if (translationY < -50) {
            snapToExpanded();
          } else {
            snapToCollapsed();
          }
        } else {
          // expanded
          if (translationY > SHEET_SLIDE_RANGE + CLOSE_THRESHOLD) {
            animateClose();
          } else if (translationY > 80) {
            snapToCollapsed();
          } else {
            snapToExpanded();
          }
        }
      });
  }, [contentSlideAnim, slideAnim, snapToCollapsed, snapToExpanded, animateClose]);

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

  const sheetSlideY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [SCREEN_HEIGHT, 0],
  });

  const topAreaHeight = SCREEN_HEIGHT - SHEET_HEIGHT_EXPANDED;
  const topAreaTranslateY = contentSlideAnim.interpolate({
    inputRange: [0, SHEET_SLIDE_RANGE],
    outputRange: [-topAreaHeight, 0],
  });

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
                {
                  height: topAreaHeight + SHEET_SLIDE_RANGE,
                  transform: [{ translateY: topAreaTranslateY }],
                },
              ]}
            />
          </TouchableWithoutFeedback>

          <Animated.View style={{ transform: [{ translateY: sheetSlideY }] }}>
            {/* 顶部阴影渐变 */}
            <View style={styles.topShadow} pointerEvents="none" />
            {/* sheet 容器：固定 expanded 高度 + overflow:hidden 裁剪 */}
            <Animated.View
              style={[
                styles.sheet,
                {
                  height: SHEET_HEIGHT_EXPANDED,
                  transform: [{ translateY: contentSlideAnim }],
                },
              ]}
            >
              {/* 拖拽热区 */}
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
