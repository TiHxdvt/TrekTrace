/**
 * 数据管理页面
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../theme';
import { FeatureHeader } from '../components/FeatureScreenOverlay';
import { FeatureScreenLayout } from '../components/FeatureScreenLayout';
import { dataService, DataSummary } from '../services/dataService';
import { Dialog } from '../components/Dialog';
import { Toast } from '../components/Toast';
import { IconGraphUp, IconBolt, IconFlame, IconFire, IconAltArrowRight } from '../components/SolarIcons';

type NavProp = { goBack: () => void };

function formatDistance(meters: number): string {
  if (meters >= 1000) return (meters / 1000).toFixed(1) + ' km';
  return meters.toFixed(0) + ' m';
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export const DataManagementScreen: React.FC<{ navigation: NavProp }> = ({ navigation }) => {
  const [summary, setSummary] = useState<DataSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSummary = useCallback(async () => {
    try {
      const data = await dataService.getSummary();
      setSummary(data);
    } catch {
      Toast.show('加载数据摘要失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const handleExport = async () => {
    try {
      const data = await dataService.exportData('json');
      // TODO: share integration later
      Toast.show(`导出成功，共 ${data.length} 条记录`);
    } catch {
      Toast.show('导出失败');
    }
  };

  const handleDeleteAll = () => {
    Dialog.show(
      '删除全部活动',
      '此操作将删除你所有的运动记录和轨迹数据，且不可恢复。确定继续吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '全部删除',
          style: 'destructive',
          onPress: async () => {
            try {
              await dataService.deleteAllActivities();
              setSummary({
                totalActivities: 0,
                totalDistance: 0,
                totalDuration: 0,
                totalElevationGain: 0,
              });
              Toast.show('已删除全部活动');
            } catch {
              Toast.show('删除失败');
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <FeatureScreenLayout>
        <FeatureHeader title="数据管理" onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.PRIMARY} />
        </View>
      </FeatureScreenLayout>
    );
  }

  return (
    <FeatureScreenLayout>
      <FeatureHeader title="数据管理" onBack={() => navigation.goBack()} />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* 数据概览 */}
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <IconGraphUp size={20} color={COLORS.PRIMARY} />
            <Text style={styles.summaryValue}>{summary?.totalActivities ?? 0}</Text>
            <Text style={styles.summaryLabel}>总活动</Text>
          </View>
          <View style={styles.summaryCard}>
            <IconBolt size={20} color={COLORS.SUCCESS} />
            <Text style={styles.summaryValue}>{formatDistance(summary?.totalDistance ?? 0)}</Text>
            <Text style={styles.summaryLabel}>总距离</Text>
          </View>
          <View style={styles.summaryCard}>
            <IconFlame size={20} color={COLORS.WARNING} />
            <Text style={styles.summaryValue}>{formatDuration(summary?.totalDuration ?? 0)}</Text>
            <Text style={styles.summaryLabel}>总时长</Text>
          </View>
          <View style={styles.summaryCard}>
            <IconFire size={20} color={COLORS.ERROR} />
            <Text style={styles.summaryValue}>{((summary?.totalElevationGain ?? 0)).toFixed(0)} m</Text>
            <Text style={styles.summaryLabel}>总爬升</Text>
          </View>
        </View>

        {/* 数据操作 */}
        <Text style={styles.sectionTitle}>数据操作</Text>
        <View style={styles.card}>
          <SectionItem title="导出运动数据" onPress={handleExport} />
        </View>

        {/* 危险操作 */}
        <Text style={[styles.sectionTitle, { color: COLORS.ERROR }]}>危险操作</Text>
        <View style={styles.card}>
          <SectionItem title="删除全部活动" danger onPress={handleDeleteAll} />
        </View>
      </ScrollView>
    </FeatureScreenLayout>
  );
};

const SectionItem: React.FC<{
  title: string;
  danger?: boolean;
  onPress: () => void;
}> = ({ title, danger, onPress }) => (
  <TouchableOpacity style={styles.item} onPress={onPress} activeOpacity={0.7}>
    <Text style={[styles.itemTitle, danger && styles.dangerText]}>{title}</Text>
    <IconAltArrowRight size={18} color={danger ? COLORS.ERROR : COLORS.TEXT.QUINARY} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING.XL, paddingBottom: SPACING.XXXL * 2 },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.MD,
    marginTop: SPACING.LG,
  },
  summaryCard: {
    width: '47%',
    backgroundColor: COLORS.OVERLAY.LIGHT,
    borderWidth: 1,
    borderColor: COLORS.BORDER.LIGHT,
    borderRadius: BORDER_RADIUS.LG,
    padding: SPACING.LG,
    alignItems: 'center',
    gap: SPACING.XS,
  },
  summaryValue: {
    fontSize: TYPOGRAPHY.FONT_SIZE.XXL,
    fontWeight: '700',
    color: COLORS.TEXT.PRIMARY,
  },
  summaryLabel: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    color: COLORS.TEXT.QUATERNARY,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    fontWeight: '500',
    color: COLORS.TEXT.QUATERNARY,
    marginBottom: SPACING.MD,
    marginTop: SPACING.XXL,
  },
  card: {
    backgroundColor: COLORS.OVERLAY.LIGHT,
    borderWidth: 1,
    borderColor: COLORS.BORDER.LIGHT,
    borderRadius: BORDER_RADIUS.LG,
    paddingHorizontal: SPACING.LG,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.LG,
  },
  itemTitle: {
    fontSize: TYPOGRAPHY.FONT_SIZE.MD,
    color: COLORS.TEXT.SECONDARY,
  },
  dangerText: {
    color: COLORS.ERROR,
  },
});
