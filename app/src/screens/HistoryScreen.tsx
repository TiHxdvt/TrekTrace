/**
 * 历史记录页面
 * 手风琴折叠布局，按运动类型分组展示活动数据
 */

import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, TYPOGRAPHY } from '../theme';
import { IconBonfire } from '../components/SolarIcons';
import { FullScreenBlur } from '../components/FullScreenBlur';
import { AccordionSection } from '../components/AccordionSection';
import { ActivityDetailSheet } from '../components/ActivityDetailSheet';
import { EmptyState } from '../components/EmptyState';
import { ACTIVITY_TYPES } from '../constants/activityMeta';
import { activityService } from '../services/activityService';
import type { ActivityResponseDTO, ActivityType } from '../types';

export const HistoryScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [activities, setActivities] = useState<ActivityResponseDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedType, setExpandedType] = useState<ActivityType | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<ActivityResponseDTO | null>(null);

  useFocusEffect(
    useCallback(() => {
      const loadActivities = async () => {
        try {
          setLoading(true);
          setError(null);
          const data = await activityService.getActivities();
          setActivities(data);
        } catch {
          setError('加载失败，请重试');
        } finally {
          setLoading(false);
        }
      };
      loadActivities();
    }, []),
  );

  // Group activities by type
  const grouped = useMemo(() => {
    const map: Record<ActivityType, ActivityResponseDTO[]> = {
      HIKING: [],
      RUNNING: [],
      CYCLING: [],
    };
    for (const a of activities) {
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
  }, [activities]);

  const handleToggle = useCallback((type: ActivityType) => {
    setExpandedType(prev => (prev === type ? null : type));
  }, []);

  const handleActivityPress = useCallback((activity: ActivityResponseDTO) => {
    setSelectedActivity(activity);
  }, []);

  const handleCloseSheet = useCallback(() => {
    setSelectedActivity(null);
  }, []);

  const isEmpty = !loading && !error && activities.length === 0;

  return (
    <View style={styles.container}>
      {/* Background Glow */}
      <View style={styles.ambientGlow} pointerEvents="none">
        <View style={styles.glowOrb} />
      </View>

      <FullScreenBlur />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>历史记录</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.PRIMARY} />
            <Text style={styles.loadingText}>加载中...</Text>
          </View>
        ) : error ? (
          <EmptyState
            icon={<IconBonfire size={24} color={COLORS.TEXT.QUATERNARY} />}
            title={error}
            subtitle="下拉刷新或检查网络连接"
          />
        ) : isEmpty ? (
          <EmptyState
            icon={<IconBonfire size={24} color={COLORS.TEXT.QUATERNARY} />}
            title="暂无运动记录"
            subtitle="完成一次运动后，记录会出现在这里"
          />
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
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  ambientGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  glowOrb: {
    position: 'absolute',
    top: -60,
    left: '30%',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: COLORS.GRADIENT.PURPLE_LIGHT,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    zIndex: 20,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.FONT_SIZE.XXXL,
    fontWeight: '600',
    color: COLORS.TEXT.PRIMARY,
    letterSpacing: -0.5,
  },
  scrollView: {
    flex: 1,
    zIndex: 10,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 140,
    gap: 12,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    gap: 12,
  },
  loadingText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    color: COLORS.TEXT.QUATERNARY,
  },
});
