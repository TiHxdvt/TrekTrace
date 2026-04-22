/**
 * 分段统计列表组件（玻璃拟态卡片）
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { formatPace } from '../../utils/format';
import { BORDER_RADIUS, TYPOGRAPHY } from '../../theme';
import type { LapData } from '../../utils/lapCalculator';

interface LapStatsViewProps {
  laps: LapData[];
  colors: any;
}

export const LapStatsView: React.FC<LapStatsViewProps> = ({ laps, colors }) => {
  const [expanded, setExpanded] = useState(false);

  if (laps.length === 0) return null;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.header, { borderColor: colors.BORDER.MEDIUM }]}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <Text style={[styles.headerText, { color: colors.TEXT.QUATERNARY }]}>
          分段统计
        </Text>
        <Text style={[styles.headerChevron, { color: colors.TEXT.QUINARY }]}>
          {expanded ? '收起' : `${laps.length} 段`}
        </Text>
      </TouchableOpacity>

      {expanded && (
        <FlatList
          data={laps}
          keyExtractor={item => String(item.lapIndex)}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View style={[styles.lapRow, { borderColor: colors.BORDER.LIGHT }]}>
              <Text style={[styles.lapIndex, { color: colors.TEXT.QUATERNARY }]}>
                {item.lapIndex}
              </Text>
              <Text style={[styles.lapValue, { color: colors.TEXT.PRIMARY }]}>
                {formatPace(item.pace)}
              </Text>
              <Text style={[styles.lapValue, { color: colors.TEXT.PRIMARY }]}>
                {formatLapDuration(item.duration)}
              </Text>
              <Text style={[styles.lapValue, { color: colors.TEXT.PRIMARY }]}>
                {Math.round(item.elevationGain)}m
              </Text>
            </View>
          )}
          ListHeaderComponent={() => (
            <View style={[styles.lapHeaderRow, { borderColor: colors.BORDER.LIGHT }]}>
              <Text style={[styles.lapHeaderLabel, { color: colors.TEXT.QUINARY }]}>段</Text>
              <Text style={[styles.lapHeaderLabel, { color: colors.TEXT.QUINARY }]}>配速</Text>
              <Text style={[styles.lapHeaderLabel, { color: colors.TEXT.QUINARY }]}>时长</Text>
              <Text style={[styles.lapHeaderLabel, { color: colors.TEXT.QUINARY }]}>爬升</Text>
            </View>
          )}
        />
      )}
    </View>
  );
};

function formatLapDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  headerText: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerChevron: {
    fontSize: TYPOGRAPHY.FONT_SIZE.XS,
  },
  lapHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  lapHeaderLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: TYPOGRAPHY.FONT_SIZE.XS,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  lapRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  lapIndex: {
    flex: 1,
    textAlign: 'center',
    fontSize: TYPOGRAPHY.FONT_SIZE.XS,
    fontWeight: '600',
  },
  lapValue: {
    flex: 1,
    textAlign: 'center',
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
  },
});
