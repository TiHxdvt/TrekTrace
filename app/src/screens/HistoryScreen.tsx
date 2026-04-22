/**
 * 历史记录页面
 * 手风琴折叠布局，按运动类型分组展示活动数据
 * 支持分页加载、本地缓存、日历视图、批量操作
 */

import React, { useState, useMemo, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import {
  IconPlane, IconFlame, IconMedalStar,
  IconCalendar, IconChecklistMinimalistic,
  IconCloseCircle, IconCheckCircle,
} from '../components/SolarIcons';
import { FullScreenBlur } from '../components/FullScreenBlur';
import { AccordionSection } from '../components/AccordionSection';
import { ActivityDetailSheet } from '../components/ActivityDetailSheet';
import { DateFilterDropdown } from '../components/DateFilterDropdown';
import { CalendarStrip } from '../components/CalendarStrip';
import { ACTIVITY_TYPES } from '../constants/activityMeta';
import { activityService } from '../services/activityService';
import { storageService } from '../services/storageService';
import { computeLifetimeStats } from '../utils/statsComputations';
import type { ActivityResponseDTO, ActivityType } from '../types';
import type { ActivityItem } from '../utils/statsComputations';

const PAGE_SIZE = 20;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function toActivityItem(dto: ActivityResponseDTO): ActivityItem {
  return {
    id: dto.id,
    type: dto.type as ActivityItem['type'],
    startTime: dto.startTime,
    endTime: dto.endTime,
    duration: dto.duration,
    distance: dto.distance,
    elevationGain: dto.elevationGain,
  };
}

function monthRange(year: number, month: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);
  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  };
}

export const HistoryScreen: React.FC = () => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [activities, setActivities] = useState<ActivityResponseDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [expandedType, setExpandedType] = useState<ActivityType | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<ActivityResponseDTO | null>(null);

  // View mode: list or calendar
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Batch operations
  const [editMode, setEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const now = new Date();
  const [filterYear, setFilterYear] = useState(now.getFullYear());
  const [filterMonth, setFilterMonth] = useState(now.getMonth() + 1);

  const [activeDates, setActiveDates] = useState<Set<string>>(new Set());

  const hasLoaded = useRef(false);

  const dynamicStyles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.BACKGROUND,
    },
    glowOrb: {
      position: 'absolute',
      top: -60,
      left: '30%',
      width: 200,
      height: 200,
      borderRadius: 100,
      backgroundColor: colors.GRADIENT.PURPLE_LIGHT,
    },
    headerTitle: {
      fontSize: TYPOGRAPHY.FONT_SIZE.XXXL,
      fontWeight: '600',
      color: colors.TEXT.PRIMARY,
      letterSpacing: -0.5,
    },
    streakValue: {
      fontSize: TYPOGRAPHY.FONT_SIZE.LG,
      fontWeight: '700',
      color: colors.TEXT.PRIMARY,
    },
    streakLabel: {
      fontSize: TYPOGRAPHY.FONT_SIZE.SM,
      color: colors.TEXT.QUATERNARY,
    },
    streakSep: {
      width: 1,
      height: 28,
      backgroundColor: colors.BORDER.LIGHT,
    },
    loadingText: {
      fontSize: TYPOGRAPHY.FONT_SIZE.SM,
      color: colors.TEXT.QUATERNARY,
    },
    iconWrap: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.OVERLAY.LIGHT,
      borderWidth: 1,
      borderColor: colors.BORDER.LIGHT,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: SPACING.XXL,
    },
    emptyTitle: {
      fontSize: TYPOGRAPHY.FONT_SIZE.XL,
      fontWeight: '600',
      color: colors.TEXT.SECONDARY,
      marginBottom: SPACING.SM,
    },
    emptySubtitle: {
      fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
      color: colors.TEXT.QUATERNARY,
    },
    iconBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.OVERLAY.LIGHT,
      borderWidth: 1,
      borderColor: colors.BORDER.LIGHT,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerActions: {
      flexDirection: 'row',
      gap: SPACING.SM,
      alignItems: 'center',
    },
    editBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: SPACING.XL,
      paddingVertical: SPACING.SM,
      backgroundColor: colors.OVERLAY.LIGHT,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: colors.BORDER.LIGHT,
      zIndex: 15,
    },
    editBarText: {
      fontSize: TYPOGRAPHY.FONT_SIZE.SM,
      color: colors.TEXT.SECONDARY,
      fontWeight: '600',
    },
    editBarBtn: {
      paddingVertical: SPACING.XS,
      paddingHorizontal: SPACING.MD,
      borderRadius: BORDER_RADIUS.MD,
    },
    editBarBtnText: {
      fontSize: TYPOGRAPHY.FONT_SIZE.SM,
      fontWeight: '600',
    },
    loadMoreBtn: {
      paddingVertical: SPACING.MD,
      paddingHorizontal: SPACING.XL,
      borderRadius: BORDER_RADIUS.LG,
      backgroundColor: colors.OVERLAY.LIGHT,
      borderWidth: 1,
      borderColor: colors.BORDER.LIGHT,
      alignItems: 'center',
    },
    loadMoreText: {
      fontSize: TYPOGRAPHY.FONT_SIZE.SM,
      color: colors.TEXT.SECONDARY,
      fontWeight: '600',
    },
  }), [colors]);

  const loadPage = useCallback(async (
    year: number,
    month: number,
    pageNum: number,
    append: boolean,
  ) => {
    const { startDate, endDate } = monthRange(year, month);
    try {
      const result = await activityService.getActivitiesPaged({
        page: pageNum,
        size: PAGE_SIZE,
        startDate,
        endDate,
      });
      setActivities(prev => append ? [...prev, ...result.content] : result.content);
      setHasMore(!result.last);
      setPage(pageNum);
      // Cache first page
      if (pageNum === 0) {
        storageService.saveActivitiesCacheWithTimestamp(result.content);
      }
    } catch {
      if (!append) setError('加载失败，请重试');
    }
  }, []);

  const loadActiveDates = useCallback(async (year: number, month: number) => {
    try {
      const dates = await activityService.getActiveDates(year, month);
      setActiveDates(new Set(dates));
    } catch {
      // Non-critical, ignore
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        const isFirstLoad = !hasLoaded.current;
        if (isFirstLoad) setLoading(true);
        setError(null);

        // Try cache for first load
        if (isFirstLoad) {
          const [cached, ts] = await Promise.all([
            storageService.getActivitiesCache(),
            storageService.getCacheTimestamp(),
          ]);
          if (cached && ts && Date.now() - ts < CACHE_TTL_MS) {
            setActivities(cached);
            setLoading(false);
            hasLoaded.current = true;
            // Still fetch fresh data silently
            loadPage(filterYear, filterMonth, 0, false);
            loadActiveDates(filterYear, filterMonth);
            return;
          }
        }

        await Promise.all([
          loadPage(filterYear, filterMonth, 0, false),
          loadActiveDates(filterYear, filterMonth),
        ]);
        hasLoaded.current = true;
        if (isFirstLoad) setLoading(false);
      };
      load();
    }, [filterYear, filterMonth, loadPage, loadActiveDates]),
  );

  // Filter by selected calendar date (client-side)
  const displayedActivities = useMemo(() => {
    if (!selectedDate) return activities;
    return activities.filter(a => {
      const d = new Date(a.startTime);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return dateStr === selectedDate;
    });
  }, [activities, selectedDate]);

  // Group displayed activities by type
  const grouped = useMemo(() => {
    const map: Record<ActivityType, ActivityResponseDTO[]> = {
      HIKING: [],
      RUNNING: [],
      CYCLING: [],
    };
    for (const a of displayedActivities) {
      const t = a.type as ActivityType;
      if (map[t]) {
        map[t].push(a);
      }
    }
    for (const key of ACTIVITY_TYPES) {
      map[key].sort(
        (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
      );
    }
    return map;
  }, [displayedActivities]);

  const handleToggle = useCallback((type: ActivityType) => {
    setExpandedType(prev => (prev === type ? null : type));
  }, []);

  const handleActivityPress = useCallback((activity: ActivityResponseDTO) => {
    if (editMode) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        if (next.has(activity.id)) {
          next.delete(activity.id);
        } else {
          next.add(activity.id);
        }
        return next;
      });
    } else {
      setSelectedActivity(activity);
    }
  }, [editMode]);

  const handleCloseSheet = useCallback(() => {
    setSelectedActivity(null);
  }, []);

  const isEmpty = !loading && !error && displayedActivities.length === 0;

  const handleFilterChange = useCallback((year: number, month: number) => {
    setFilterYear(year);
    setFilterMonth(month);
    setSelectedDate(null);
    setPage(0);
    setEditMode(false);
    setSelectedIds(new Set());
  }, []);

  const handleLoadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    await loadPage(filterYear, filterMonth, page + 1, true);
    setLoadingMore(false);
  }, [loadingMore, hasMore, filterYear, filterMonth, page, loadPage]);

  const handleToggleViewMode = useCallback(() => {
    setViewMode(prev => prev === 'list' ? 'calendar' : 'list');
    setSelectedDate(null);
  }, []);

  const handleDatePress = useCallback((date: string) => {
    setSelectedDate(prev => prev === date ? null : date);
  }, []);

  const handleToggleEditMode = useCallback(() => {
    setEditMode(prev => !prev);
    setSelectedIds(new Set());
  }, []);

  const handleSelectAll = useCallback(() => {
    const allIds = displayedActivities.map(a => a.id);
    setSelectedIds(new Set(allIds));
  }, [displayedActivities]);

  const handleBatchDelete = useCallback(() => {
    if (selectedIds.size === 0) return;
    Alert.alert(
      '确认删除',
      `确定要删除选中的 ${selectedIds.size} 条记录吗？此操作不可撤销。`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              await activityService.batchDeleteActivities(Array.from(selectedIds));
              setActivities(prev => prev.filter(a => !selectedIds.has(a.id)));
              setSelectedIds(new Set());
              setEditMode(false);
              storageService.clearActivitiesCache();
            } catch {
              Alert.alert('错误', '批量删除失败，请重试');
            }
          },
        },
      ],
    );
  }, [selectedIds]);

  const lifetimeStats = useMemo(() => {
    if (activities.length === 0) return null;
    return computeLifetimeStats(activities.map(toActivityItem));
  }, [activities]);

  return (
    <View style={dynamicStyles.container}>
      {/* Background Glow */}
      <View style={styles.ambientGlow} pointerEvents="none">
        <View style={dynamicStyles.glowOrb} />
      </View>

      <FullScreenBlur />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <Text style={dynamicStyles.headerTitle}>历史记录</Text>
          <View style={dynamicStyles.headerActions}>
            <DateFilterDropdown
              year={filterYear}
              month={filterMonth}
              onChange={handleFilterChange}
            />
            <Pressable style={dynamicStyles.iconBtn} onPress={handleToggleViewMode}>
              <IconCalendar size={18} color={viewMode === 'calendar' ? colors.PRIMARY : colors.TEXT.SECONDARY} />
            </Pressable>
            {!editMode && (
              <Pressable style={dynamicStyles.iconBtn} onPress={handleToggleEditMode}>
                <IconChecklistMinimalistic size={18} color={colors.TEXT.SECONDARY} />
              </Pressable>
            )}
          </View>
        </View>
      </View>

      {/* Edit mode bar */}
      {editMode && (
        <View style={dynamicStyles.editBar}>
          <Pressable onPress={handleToggleEditMode}>
            <IconCloseCircle size={24} color={colors.TEXT.TERTIARY} />
          </Pressable>
          <Text style={dynamicStyles.editBarText}>已选 {selectedIds.size} 项</Text>
          <View style={{ flexDirection: 'row', gap: SPACING.SM }}>
            <Pressable style={dynamicStyles.editBarBtn} onPress={handleSelectAll}>
              <Text style={[dynamicStyles.editBarBtnText, { color: colors.TEXT.SECONDARY }]}>全选</Text>
            </Pressable>
            <Pressable
              style={[dynamicStyles.editBarBtn, { backgroundColor: selectedIds.size > 0 ? '#ef4444' : colors.OVERLAY.MEDIUM }]}
              onPress={handleBatchDelete}
              disabled={selectedIds.size === 0}
            >
              <Text style={[dynamicStyles.editBarBtnText, { color: colors.TEXT.PRIMARY }]}>删除</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* 连续打卡 */}
      {lifetimeStats && (
        <View style={styles.statsArea}>
          <View style={styles.streakRow}>
            <View style={styles.streakItem}>
              <IconFlame size={20} color="#f97316" />
              <Text style={dynamicStyles.streakValue}>{lifetimeStats.currentStreak}</Text>
              <Text style={dynamicStyles.streakLabel}>当前连续</Text>
            </View>
            <View style={dynamicStyles.streakSep} />
            <View style={styles.streakItem}>
              <IconMedalStar size={20} color={colors.PRIMARY} />
              <Text style={dynamicStyles.streakValue}>{lifetimeStats.longestStreak}</Text>
              <Text style={dynamicStyles.streakLabel}>最长连续</Text>
            </View>
          </View>
        </View>
      )}

      {/* Calendar view */}
      {viewMode === 'calendar' && (
        <View style={{ zIndex: 15 }}>
          <CalendarStrip
            year={filterYear}
            month={filterMonth}
            activeDates={activeDates}
            selectedDate={selectedDate}
            onDatePress={handleDatePress}
          />
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={isEmpty || error ? styles.scrollContentEmpty : styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.PRIMARY} />
            <Text style={dynamicStyles.loadingText}>加载中...</Text>
          </View>
        ) : error ? (
          <View style={styles.emptyState}>
            <View style={dynamicStyles.iconWrap}>
              <IconPlane size={48} color={colors.TEXT.QUATERNARY} />
            </View>
            <Text style={dynamicStyles.emptyTitle}>{error}</Text>
            <Text style={dynamicStyles.emptySubtitle}>下拉刷新或检查网络连接</Text>
          </View>
        ) : isEmpty ? (
          <View style={styles.emptyState}>
            <View style={dynamicStyles.iconWrap}>
              <IconPlane size={48} color={colors.TEXT.QUATERNARY} />
            </View>
            <Text style={dynamicStyles.emptyTitle}>暂无记录</Text>
            <Text style={dynamicStyles.emptySubtitle}>完成一次运动后，记录会出现在这里</Text>
          </View>
        ) : (
          <>
            {ACTIVITY_TYPES.map(type => (
              <AccordionSection
                key={type}
                type={type}
                activities={grouped[type]}
                isExpanded={expandedType === type}
                onToggle={() => handleToggle(type)}
                onActivityPress={handleActivityPress}
                editMode={editMode}
                selectedIds={selectedIds}
                onToggleSelect={(id: number) => {
                  setSelectedIds(prev => {
                    const next = new Set(prev);
                    if (next.has(id)) next.delete(id);
                    else next.add(id);
                    return next;
                  });
                }}
              />
            ))}
            {hasMore && (
              <Pressable style={dynamicStyles.loadMoreBtn} onPress={handleLoadMore}>
                {loadingMore ? (
                  <ActivityIndicator size="small" color={colors.PRIMARY} />
                ) : (
                  <Text style={dynamicStyles.loadMoreText}>加载更多</Text>
                )}
              </Pressable>
            )}
          </>
        )}
      </ScrollView>

      <ActivityDetailSheet
        activity={selectedActivity}
        onClose={handleCloseSheet}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  ambientGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  header: {
    paddingHorizontal: SPACING.XL,
    paddingBottom: SPACING.MD,
    zIndex: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.LG,
    zIndex: 10,
  },
  statsArea: {
    paddingHorizontal: SPACING.XL,
    marginBottom: SPACING.MD,
    alignItems: 'center',
  },
  streakItem: {
    alignItems: 'center',
    gap: 2,
  },
  scrollView: {
    flex: 1,
    zIndex: 10,
  },
  scrollContent: {
    paddingHorizontal: SPACING.XL,
    paddingBottom: 140,
    gap: 12,
  },
  scrollContentEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 120,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    gap: 12,
  },
  emptyState: {
    alignItems: 'center',
  },
});
