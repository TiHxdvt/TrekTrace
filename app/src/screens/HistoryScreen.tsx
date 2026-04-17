/**
 * 历史记录页面
 * 手风琴折叠布局，按运动类型分组展示活动数据
 */

import React, { useState, useMemo, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { TYPOGRAPHY, SPACING } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import { IconPlane, IconFlame, IconMedalStar } from '../components/SolarIcons';
import { FullScreenBlur } from '../components/FullScreenBlur';
import { AccordionSection } from '../components/AccordionSection';
import { ActivityDetailSheet } from '../components/ActivityDetailSheet';
import { DateFilterDropdown } from '../components/DateFilterDropdown';
import { ACTIVITY_TYPES } from '../constants/activityMeta';
import { activityService } from '../services/activityService';
import { computeLifetimeStats } from '../utils/statsComputations';
import type { ActivityResponseDTO, ActivityType } from '../types';
import type { ActivityItem } from '../utils/statsComputations';

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

export const HistoryScreen: React.FC = () => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [activities, setActivities] = useState<ActivityResponseDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedType, setExpandedType] = useState<ActivityType | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<ActivityResponseDTO | null>(null);

  const now = new Date();
  const [filterYear, setFilterYear] = useState(now.getFullYear());
  const [filterMonth, setFilterMonth] = useState(now.getMonth() + 1);

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
  }), [colors]);

  useFocusEffect(
    useCallback(() => {
      const loadActivities = async () => {
        const isFirstLoad = !hasLoaded.current;
        try {
          // 只有首次加载才显示 loading spinner，后续静默刷新
          if (isFirstLoad) setLoading(true);
          setError(null);
          const data = await activityService.getActivities();
          setActivities(data);
          hasLoaded.current = true;
        } catch {
          if (isFirstLoad) setError('加载失败，请重试');
        } finally {
          if (isFirstLoad) setLoading(false);
        }
      };
      loadActivities();
    }, []),
  );

  // Filter activities by selected year & month
  const filteredActivities = useMemo(() => {
    return activities.filter(a => {
      const d = new Date(a.startTime);
      return d.getFullYear() === filterYear && d.getMonth() + 1 === filterMonth;
    });
  }, [activities, filterYear, filterMonth]);

  // Group filtered activities by type
  const grouped = useMemo(() => {
    const map: Record<ActivityType, ActivityResponseDTO[]> = {
      HIKING: [],
      RUNNING: [],
      CYCLING: [],
    };
    for (const a of filteredActivities) {
      const t = a.type as ActivityType;
      if (map[t]) {
        map[t].push(a);
      }
    }
    // Sort each group by startTime descending
    for (const key of ACTIVITY_TYPES) {
      map[key].sort(
        (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
      );
    }
    return map;
  }, [filteredActivities]);

  const handleToggle = useCallback((type: ActivityType) => {
    setExpandedType(prev => (prev === type ? null : type));
  }, []);

  const handleActivityPress = useCallback((activity: ActivityResponseDTO) => {
    setSelectedActivity(activity);
  }, []);

  const handleCloseSheet = useCallback(() => {
    setSelectedActivity(null);
  }, []);

  const isEmpty = !loading && !error && filteredActivities.length === 0;

  const handleFilterChange = useCallback((year: number, month: number) => {
    setFilterYear(year);
    setFilterMonth(month);
  }, []);

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
          <DateFilterDropdown
            year={filterYear}
            month={filterMonth}
            onChange={handleFilterChange}
          />
        </View>
      </View>

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
          ACTIVITY_TYPES.map(type => (
            <AccordionSection
              key={type}
              type={type}
              activities={grouped[type]}
              isExpanded={expandedType === type}
              onToggle={() => handleToggle(type)}
              onActivityPress={handleActivityPress}
            />
          ))
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
