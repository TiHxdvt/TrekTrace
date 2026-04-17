/**
 * 总览统计面板 — 运动总结
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BORDER_RADIUS, TYPOGRAPHY, SPACING } from '../../theme';
import { ACTIVITY_TYPE_META } from '../../constants/activityMeta';
import type { LifetimeStats, ActivityType } from '../../utils/statsComputations';
import { useTheme } from '../../contexts/ThemeContext';

interface StatsSummaryProps {
  stats: LifetimeStats;
}

export const StatsSummary: React.FC<StatsSummaryProps> = ({ stats }) => {
  const { colors } = useTheme();

  const dynamicStyles = useMemo(() => StyleSheet.create({
    row: {
      backgroundColor: colors.OVERLAY.LIGHT,
      borderColor: colors.BORDER.LIGHT,
    },
    cellValue: {
      color: colors.TEXT.PRIMARY,
    },
    cellLabel: {
      color: colors.TEXT.QUATERNARY,
    },
    divider: {
      backgroundColor: colors.BORDER.LIGHT,
    },
    typeSection: {
      backgroundColor: colors.OVERLAY.LIGHT,
      borderColor: colors.BORDER.LIGHT,
    },
    typeDivider: {
      backgroundColor: colors.BORDER.LIGHT,
    },
    typeName: {
      color: colors.TEXT.PRIMARY,
    },
    typeStat: {
      color: colors.TEXT.TERTIARY,
    },
  }), [colors]);

  const distKm = (stats.totalDistance / 1000).toFixed(1);
  const durH = (stats.totalDuration / 3600).toFixed(1);

  return (
    <View style={styles.container}>
      {/* 核心数据 */}
      <View style={[styles.row, dynamicStyles.row]}>
        <View style={styles.cell}>
          <Text style={[styles.cellValue, dynamicStyles.cellValue]}>{distKm}</Text>
          <Text style={[styles.cellLabel, dynamicStyles.cellLabel]}>总距离 (km)</Text>
        </View>
        <View style={[styles.divider, dynamicStyles.divider]} />
        <View style={styles.cell}>
          <Text style={[styles.cellValue, dynamicStyles.cellValue]}>{durH}</Text>
          <Text style={[styles.cellLabel, dynamicStyles.cellLabel]}>总时长 (h)</Text>
        </View>
        <View style={[styles.divider, dynamicStyles.divider]} />
        <View style={styles.cell}>
          <Text style={[styles.cellValue, dynamicStyles.cellValue]}>{stats.estimatedCalories}</Text>
          <Text style={[styles.cellLabel, dynamicStyles.cellLabel]}>总消耗 (kcal)</Text>
        </View>
        <View style={[styles.divider, dynamicStyles.divider]} />
        <View style={styles.cell}>
          <Text style={[styles.cellValue, dynamicStyles.cellValue]}>{stats.totalActivities}</Text>
          <Text style={[styles.cellLabel, dynamicStyles.cellLabel]}>总次数</Text>
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
          <View style={[styles.typeSection, dynamicStyles.typeSection]}>
            {activeTypes.map((type, index) => {
              const meta = ACTIVITY_TYPE_META[type];
              const data = stats.byType[type];
              const TypeIcon = meta.icon;
              const typeDist = (data.distance / 1000).toFixed(1);
              const typeDur = (data.duration / 3600).toFixed(1);

              return (
                <React.Fragment key={type}>
                  {index > 0 && <View style={[styles.typeDivider, dynamicStyles.typeDivider]} />}
                  <View style={styles.typeRow}>
                    <View style={styles.typeInfo}>
                      <TypeIcon size={18} color={colors.TEXT.SECONDARY} />
                      <Text style={[styles.typeName, dynamicStyles.typeName]}>{meta.label}</Text>
                    </View>
                    <View style={styles.typeStats}>
                      <Text style={[styles.typeStat, dynamicStyles.typeStat]}>{data.count}次</Text>
                      <Text style={[styles.typeStat, dynamicStyles.typeStat]}>{typeDist}km</Text>
                      <Text style={[styles.typeStat, dynamicStyles.typeStat]}>{typeDur}h</Text>
                      <Text style={[styles.typeStat, dynamicStyles.typeStat]}>{data.calories}kcal</Text>
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
    borderWidth: 1,
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
  },
  cellLabel: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
  },
  divider: {
    width: 1,
    height: 32,
  },
  typeSection: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.XXL,
    paddingVertical: SPACING.SM,
  },
  typeDivider: {
    height: StyleSheet.hairlineWidth,
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
  },
  typeStats: {
    flexDirection: 'row',
    gap: SPACING.MD,
  },
  typeStat: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
  },
});
