/**
 * 总览统计面板 — 运动总结
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, BORDER_RADIUS, TYPOGRAPHY, SPACING } from '../../theme';
import { ACTIVITY_TYPE_META } from '../../constants/activityMeta';
import type { LifetimeStats, ActivityType } from '../../utils/statsComputations';

interface StatsSummaryProps {
  stats: LifetimeStats;
}

export const StatsSummary: React.FC<StatsSummaryProps> = ({ stats }) => {
  const distKm = (stats.totalDistance / 1000).toFixed(1);
  const durH = (stats.totalDuration / 3600).toFixed(1);

  return (
    <View style={styles.container}>
      {/* 核心数据 */}
      <View style={styles.row}>
        <View style={styles.cell}>
          <Text style={styles.cellValue}>{distKm}</Text>
          <Text style={styles.cellLabel}>总距离 (km)</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.cell}>
          <Text style={styles.cellValue}>{durH}</Text>
          <Text style={styles.cellLabel}>总时长 (h)</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.cell}>
          <Text style={styles.cellValue}>{stats.estimatedCalories}</Text>
          <Text style={styles.cellLabel}>总消耗 (kcal)</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.cell}>
          <Text style={styles.cellValue}>{stats.totalActivities}</Text>
          <Text style={styles.cellLabel}>总次数</Text>
        </View>
      </View>

      {/* 按类型明细：一个大背景 + 分割线 */}
      {(() => {
        const activeTypes = (['HIKING', 'RUNNING', 'CYCLING'] as ActivityType[]).filter(type => {
          const data = stats.byType[type];
          return data && data.count > 0;
        });

        if (activeTypes.length === 0) return null;

        return (
          <View style={styles.typeSection}>
            {activeTypes.map((type, index) => {
              const meta = ACTIVITY_TYPE_META[type];
              const data = stats.byType[type];
              const TypeIcon = meta.icon;
              const typeDist = (data.distance / 1000).toFixed(1);
              const typeDur = (data.duration / 3600).toFixed(1);

              return (
                <React.Fragment key={type}>
                  {index > 0 && <View style={styles.typeDivider} />}
                  <View style={styles.typeRow}>
                    <View style={styles.typeInfo}>
                      <TypeIcon size={18} color={COLORS.TEXT.SECONDARY} />
                      <Text style={styles.typeName}>{meta.label}</Text>
                    </View>
                    <View style={styles.typeStats}>
                      <Text style={styles.typeStat}>{data.count}次</Text>
                      <Text style={styles.typeStat}>{typeDist}km</Text>
                      <Text style={styles.typeStat}>{typeDur}h</Text>
                      <Text style={styles.typeStat}>{data.calories}kcal</Text>
                    </View>
                  </View>
                </React.Fragment>
              );
            })}
          </View>
        );
      })()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: SPACING.LG,
  },
  row: {
    flexDirection: 'row',
    backgroundColor: COLORS.OVERLAY.LIGHT,
    borderWidth: 1,
    borderColor: COLORS.BORDER.LIGHT,
    borderRadius: BORDER_RADIUS.XXL,
    paddingVertical: SPACING.LG,
    paddingHorizontal: SPACING.SM,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  cellValue: {
    fontSize: TYPOGRAPHY.FONT_SIZE.XL,
    fontWeight: '700',
    color: COLORS.TEXT.PRIMARY,
  },
  cellLabel: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    color: COLORS.TEXT.QUATERNARY,
  },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: COLORS.BORDER.LIGHT,
  },
  typeSection: {
    backgroundColor: COLORS.OVERLAY.LIGHT,
    borderWidth: 1,
    borderColor: COLORS.BORDER.LIGHT,
    borderRadius: BORDER_RADIUS.XXL,
    paddingVertical: SPACING.SM,
  },
  typeDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.BORDER.LIGHT,
    marginHorizontal: SPACING.MD,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.MD,
    paddingHorizontal: SPACING.MD,
  },
  typeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.SM,
  },
  typeName: {
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    fontWeight: '500',
    color: COLORS.TEXT.PRIMARY,
  },
  typeStats: {
    flexDirection: 'row',
    gap: SPACING.MD,
  },
  typeStat: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    color: COLORS.TEXT.TERTIARY,
  },
});
