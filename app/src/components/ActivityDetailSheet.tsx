/**
 * 活动详情底部弹窗
 * 可拖拽底部面板：折叠态（统计卡片）/ 展开态（路线地图 + 图表）
 *
 * 拖拽策略：GestureHandlerRootView 包裹 Modal 内部内容，
 * GestureDetector 绑定到拖拽热区（手柄 + header），不干扰 ScrollView。
 * sheetState 通过 ref 保持同步，避免手势回调闭包过期。
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

export const ActivityDetailSheet: React.FC<ActivityDetailSheetProps> = ({
  activity,
  onClose,
}) => {
  const insets = useSafeAreaInsets();

  const [modalVisible, setModalVisible] = useState(false);
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

  // ---- 动画方法 ----

  useEffect(() => {
    if (activity) {
      setVisibleActivity(activity);
      setModalVisible(true);
      setSheetState('collapsed');
      setTrackPoints(null);
      sheetHeightAnim.setValue(SHEET_HEIGHT_COLLAPSED);
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: ANIMATION.NORMAL,
        useNativeDriver: true,
      }).start();
    }
  }, [activity, slideAnim, sheetHeightAnim]);

  const animateClose = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: ANIMATION.FAST,
      useNativeDriver: true,
    }).start(() => {
      setModalVisible(false);
      setVisibleActivity(null);
      setSheetState('collapsed');
      setTrackPoints(null);
      setTrackLoading(false);
      onClose();
    });
  }, [slideAnim, onClose]);

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

    const actId = act.id;
    if (trackCache.current.has(actId)) {
      setTrackPoints(trackCache.current.get(actId)!);
      return;
    }
    setTrackLoading(true);
    activityService
      .getTrackPoints(actId)
      .then(points => {
        trackCache.current.set(actId, points);
        setTrackPoints(points);
      })
      .catch(() => {
        setTrackPoints(null);
      })
      .finally(() => {
        setTrackLoading(false);
      });
  }, [sheetHeightAnim]);

  // ---- 拖拽手势 ----
  const panGesture = useMemo(() => {
    return Gesture.Pan()
      .activeOffsetY([-10, 10])
      .onUpdate((event) => {
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
      })
      .onEnd((event) => {
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

  if (!visibleActivity) return null;

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [SCREEN_HEIGHT, 0],
  });

  const meta = ACTIVITY_TYPE_META[visibleActivity.type as keyof typeof ACTIVITY_TYPE_META];
  const TypeIcon = meta?.icon;
  const startDate = new Date(visibleActivity.startTime);
  const endDate = new Date(visibleActivity.endTime);

  return (
    <Modal visible={modalVisible} transparent animationType="none" onRequestClose={animateClose}>
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
                  paddingBottom: insets.bottom + 24,
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
                        {meta?.label ?? visibleActivity.type}
                      </Text>
                    </View>
                    <Text style={styles.sheetDate}>
                      {format(startDate, 'yyyy年M月d日')}
                    </Text>
                  </View>
                </View>
              </GestureDetector>

              <ScrollView
                scrollEnabled={sheetState === 'expanded'}
                showsVerticalScrollIndicator={false}
                bounces={false}
                nestedScrollEnabled
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

                {/* 时间范围 */}
                <View style={styles.timeRow}>
                  <Text style={styles.timeLabel}>开始</Text>
                  <Text style={styles.timeValue}>{format(startDate, 'HH:mm')}</Text>
                  <Text style={styles.timeSeparator}>→</Text>
                  <Text style={styles.timeLabel}>结束</Text>
                  <Text style={styles.timeValue}>{format(endDate, 'HH:mm')}</Text>
                </View>

                {/* 展开内容 */}
                {sheetState === 'expanded' && (
                  <View style={styles.expandedContent}>
                    {trackLoading ? (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
                        <Text style={styles.loadingText}>加载轨迹数据...</Text>
                      </View>
                    ) : trackPoints && trackPoints.length >= 2 ? (
                      <>
                        <View style={styles.sectionDivider} />
                        <Text style={styles.sectionTitle}>路线概览</Text>
                        <RouteMiniMap points={trackPoints} />
                        {/* TODO: 暂时禁用图表，排查闪退原因 */}
                      </>
                    ) : (
                      <View style={styles.loadingContainer}>
                        <Text style={styles.errorText}>轨迹数据不可用</Text>
                      </View>
                    )}
                  </View>
                )}
              </ScrollView>
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
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 16,
    marginHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER.LIGHT,
  },
  timeLabel: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    color: COLORS.TEXT.QUATERNARY,
  },
  timeValue: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    fontWeight: '500',
    color: COLORS.TEXT.SECONDARY,
  },
  timeSeparator: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    color: COLORS.TEXT.QUINARY,
    marginHorizontal: 4,
  },
  expandedContent: {
    paddingBottom: 40,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: COLORS.BORDER.LIGHT,
    marginHorizontal: 20,
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    fontWeight: '500',
    color: COLORS.TEXT.TERTIARY,
    marginHorizontal: 20,
    marginBottom: 12,
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
