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
import { accountService } from '../services/accountService';
import { storageService } from '../services/storageService';
import { Dialog } from '../components/Dialog';
import { Toast } from '../components/Toast';
import { IconGraphUp, IconBolt, IconFlame, IconFire } from '../components/SolarIcons';
import { StackNavigationProp } from '@react-navigation/stack';
import { DrawerStackParamList } from '../navigation/DrawerStack';

type NavProp = StackNavigationProp<DrawerStackParamList, 'DataManagement'>;

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

  const handleDeleteAccount = () => {
    Dialog.show(
      '注销账户',
      '此操作将永久删除你的账户和所有数据，且不可恢复。确定继续吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '注销账户',
          style: 'destructive',
          onPress: async () => {
            try {
              await accountService.deleteAccount();
              await storageService.clearAuthData();
              Toast.show('账户已注销');
            } catch {
              Toast.show('注销失败');
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
        {/* Summary cards */}
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

        {/* Export */}
        <TouchableOpacity style={styles.actionBtn} onPress={handleExport} activeOpacity={0.7}>
          <Text style={styles.actionBtnText}>导出运动数据</Text>
        </TouchableOpacity>

        {/* Danger zone */}
        <View style={styles.dangerZone}>
          <Text style={styles.dangerTitle}>危险操作</Text>
          <TouchableOpacity
            style={[styles.actionBtn, styles.dangerBtn]}
            onPress={handleDeleteAll}
            activeOpacity={0.7}
          >
            <Text style={styles.dangerBtnText}>删除全部活动</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.dangerBtn]}
            onPress={handleDeleteAccount}
            activeOpacity={0.7}
          >
            <Text style={styles.dangerBtnText}>注销账户</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </FeatureScreenLayout>
  );
};

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
  actionBtn: {
    backgroundColor: COLORS.OVERLAY.MEDIUM,
    borderWidth: 1,
    borderColor: COLORS.BORDER.MEDIUM,
    borderRadius: BORDER_RADIUS.LG,
    paddingVertical: SPACING.LG,
    alignItems: 'center',
    marginTop: SPACING.XXL,
  },
  actionBtnText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.MD,
    fontWeight: '500',
    color: COLORS.TEXT.SECONDARY,
  },
  dangerZone: {
    marginTop: SPACING.XXXL,
    paddingTop: SPACING.XL,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER.LIGHT,
  },
  dangerTitle: {
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    color: COLORS.ERROR,
    fontWeight: '500',
    marginBottom: SPACING.MD,
  },
  dangerBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  dangerBtnText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.MD,
    fontWeight: '500',
    color: COLORS.ERROR,
  },
});
