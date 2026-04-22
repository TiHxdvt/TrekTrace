/**
 * 个人纪录卡片 — 展示每种运动类型的最佳成绩
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BORDER_RADIUS, TYPOGRAPHY, SPACING } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';
import { ACTIVITY_TYPE_META } from '../../constants/activityMeta';
import type { PersonalRecords } from '../../services/statsService';
import type { ActivityType } from '../../utils/statsComputations';

interface PersonalRecordsCardProps {
  records: Record<string, PersonalRecords>;
}

function fmtPace(secPerKm: number): string {
  const min = Math.floor(secPerKm / 60);
  const sec = Math.round(secPerKm % 60);
  return `${min}'${String(sec).padStart(2, '0')}"`;
}

function fmtDistance(m: number): string {
  return (m / 1000).toFixed(1) + ' km';
}

function fmtDuration(s: number): string {
  const h = Math.floor(s / 3600);
  const min = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${min}m` : `${min}m`;
}

function fmtElevation(m: number): string {
  return m.toFixed(0) + ' m';
}

export const PersonalRecordsCard: React.FC<PersonalRecordsCardProps> = ({ records }) => {
  const { colors } = useTheme();

  const activeTypes = useMemo(() => {
    return (['HIKING', 'RUNNING', 'CYCLING'] as ActivityType[]).filter(
      type => records[type] != null,
    );
  }, [records]);

  if (activeTypes.length === 0) return null;

  const dynamicStyles = useMemo(() => StyleSheet.create({
    card: {
      backgroundColor: colors.OVERLAY.LIGHT,
      borderColor: colors.BORDER.LIGHT,
    },
    sectionTitle: {
      color: colors.TEXT.PRIMARY,
    },
    recordLabel: {
      color: colors.TEXT.QUATERNARY,
    },
    recordValue: {
      color: colors.TEXT.SECONDARY,
    },
    recordDate: {
      color: colors.TEXT.QUATERNARY,
    },
    divider: {
      backgroundColor: colors.BORDER.LIGHT,
    },
  }), [colors]);

  return (
    <View style={[styles.card, dynamicStyles.card]}>
      {activeTypes.map((type, tIdx) => {
        const pr = records[type]!;
        const meta = ACTIVITY_TYPE_META[type];
        const TypeIcon = meta.icon;
        const items: { label: string; value: string; date?: string }[] = [];

        if (pr.longestDistance) {
          items.push({ label: '最长距离', value: fmtDistance(pr.longestDistance.value), date: pr.longestDistance.date });
        }
        if (pr.longestDuration) {
          items.push({ label: '最长时长', value: fmtDuration(pr.longestDuration.value), date: pr.longestDuration.date });
        }
        if (pr.highestElevation) {
          items.push({ label: '最大爬升', value: fmtElevation(pr.highestElevation.value), date: pr.highestElevation.date });
        }
        if (pr.fastestPace) {
          items.push({ label: '最快配速', value: fmtPace(pr.fastestPace.value), date: pr.fastestPace.date });
        }

        if (items.length === 0) return null;

        return (
          <React.Fragment key={type}>
            {tIdx > 0 && <View style={[styles.divider, dynamicStyles.divider]} />}
            <View style={styles.typeSection}>
              <View style={styles.typeHeader}>
                <TypeIcon size={18} color={colors.TEXT.SECONDARY} />
                <Text style={[styles.typeName, dynamicStyles.sectionTitle]}>{meta.label}</Text>
              </View>
              <View style={styles.recordsGrid}>
                {items.map(item => (
                  <View key={item.label} style={styles.recordItem}>
                    <Text style={[styles.recordLabel, dynamicStyles.recordLabel]}>{item.label}</Text>
                    <Text style={[styles.recordValue, dynamicStyles.recordValue]}>{item.value}</Text>
                    {item.date && (
                      <Text style={[styles.recordDate, dynamicStyles.recordDate]}>{item.date}</Text>
                    )}
                  </View>
                ))}
              </View>
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.XXL,
    paddingVertical: SPACING.MD,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: SPACING.MD,
  },
  typeSection: {
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.SM,
  },
  typeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.SM,
    marginBottom: SPACING.SM,
  },
  typeName: {
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    fontWeight: '600',
  },
  recordsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.MD,
  },
  recordItem: {
    minWidth: '45%',
    gap: 2,
  },
  recordLabel: {
    fontSize: TYPOGRAPHY.FONT_SIZE.XS,
  },
  recordValue: {
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    fontWeight: '600',
  },
  recordDate: {
    fontSize: TYPOGRAPHY.FONT_SIZE.XS,
  },
});
