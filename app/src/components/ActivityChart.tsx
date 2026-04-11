/**
 * 活动图表组件
 * 封装 react-native-gifted-charts 的 LineChart，支持面积图/折线图
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { COLORS, TYPOGRAPHY, BORDER_RADIUS } from '../theme';
import type { ChartDataPoint } from '../utils/trackData';

type ChartType = 'elevation' | 'pace' | 'speed';

interface ActivityChartProps {
  data: ChartDataPoint[];
  type: ChartType;
}

const CHART_META: Record<ChartType, { title: string; unit: string }> = {
  elevation: { title: '海拔剖面', unit: 'm' },
  pace: { title: '配速', unit: 'min/km' },
  speed: { title: '速度', unit: 'km/h' },
};

const CHART_HEIGHT = 160;

export const ActivityChart: React.FC<ActivityChartProps> = ({ data, type }) => {
  const { title, unit } = CHART_META[type];

  // 数据已由父组件 downsample 过，过滤无效值后做格式转换
  const chartData = useMemo(() => {
    if (data.length === 0) return [];

    return data
      .filter(point => isFinite(point.value) && point.value >= 0)
      .map(point => ({
        value: point.value,
        label: point.distanceKm.toFixed(1),
      }));
  }, [data]);

  if (chartData.length < 2) return null;

  const isArea = type === 'elevation';

  // 用循环代替 Math.min/max(...spread)，避免大数组调用栈溢出
  let maxValue = -Infinity;
  let minValue = Infinity;
  for (const d of chartData) {
    if (d.value > maxValue) maxValue = d.value;
    if (d.value < minValue) minValue = d.value;
  }

  // 防御：所有值相同时给一个合理的范围
  if (!isFinite(maxValue) || !isFinite(minValue)) return null;

  // 为图表增加一些 padding
  const range = (maxValue - minValue) || 1;
  const paddedMax = maxValue + range * 0.1;
  const paddedMin = Math.max(0, minValue - range * 0.1);

  // 生成 X 轴标签（只显示少量）
  const totalPoints = chartData.length;
  const labelInterval = Math.max(1, Math.floor(totalPoints / 5));

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {title} ({unit})
      </Text>
      <LineChart
        data={chartData.map((d, i) => ({
          ...d,
          labelTextStyle:
            i % labelInterval === 0 || i === totalPoints - 1
              ? styles.labelVisible
              : styles.labelHidden,
        }))}
        height={CHART_HEIGHT}
        areaChart={isArea}
        curved
        color={COLORS.PRIMARY}
        thickness={2}
        startFillColor={isArea ? 'rgba(59, 130, 246, 0.3)' : undefined}
        endFillColor={isArea ? 'rgba(59, 130, 246, 0.02)' : undefined}
        startOpacity={isArea ? 0.4 : undefined}
        endOpacity={isArea ? 0.02 : undefined}
        maxValue={paddedMax}
        mostNegativeValue={paddedMin}
        noOfSections={4}
        hideDataPoints
        hideRules={false}
        rulesColor="rgba(255,255,255,0.05)"
        rulesThickness={1}
        yAxisThickness={0}
        xAxisThickness={1}
        xAxisColor="rgba(255,255,255,0.05)"
        yAxisTextStyle={styles.yAxisText}
        yAxisLabelWidth={36}
        backgroundColor={COLORS.BACKGROUND}
        showFractionalValues
        roundToDigits={type === 'speed' ? 1 : 0}
        spacing={1}
        initialSpacing={4}
        endSpacing={4}
        disableScroll
        isAnimated
        animationDuration={400}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.OVERLAY.LIGHT,
    borderRadius: BORDER_RADIUS.MD,
    borderWidth: 1,
    borderColor: COLORS.BORDER.LIGHT,
    padding: 12,
    marginBottom: 12,
  },
  title: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    fontWeight: '500',
    color: COLORS.TEXT.TERTIARY,
    marginBottom: 8,
  },
  yAxisText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 9,
  },
  labelVisible: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 9,
  },
  labelHidden: {
    color: 'transparent',
    fontSize: 0,
  },
});
