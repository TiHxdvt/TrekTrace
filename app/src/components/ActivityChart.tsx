/**
 * 活动图表组件
 * 使用 react-native-svg 手绘折线/面积图
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Polyline, Line, Path, Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg';
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

const CHART_H = 120;
const PAD_L = 36;
const PAD_R = 8;
const PAD_T = 8;
const PAD_B = 20;
const GRID_LINES = 4;

export const ActivityChart: React.FC<ActivityChartProps> = ({ data, type }) => {
  const { title, unit } = CHART_META[type];

  const computed = useMemo(() => {
    const filtered = data.filter(p => isFinite(p.value) && p.value >= 0);
    if (filtered.length < 2) return null;

    let maxVal = -Infinity;
    let minVal = Infinity;
    for (const p of filtered) {
      if (p.value > maxVal) maxVal = p.value;
      if (p.value < minVal) minVal = p.value;
    }
    const range = (maxVal - minVal) || 1;
    const paddedMax = maxVal + range * 0.1;
    const paddedMin = Math.max(0, minVal - range * 0.1);
    const valRange = paddedMax - paddedMin;

    const plotW = 300;
    const plotH = CHART_H - PAD_T - PAD_B;
    const svgW = plotW + PAD_L + PAD_R;
    const n = filtered.length;

    const coords: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < n; i++) {
      const x = PAD_L + (i / (n - 1)) * plotW;
      const y = PAD_T + plotH - ((filtered[i].value - paddedMin) / valRange) * plotH;
      coords.push({ x, y });
    }

    const linePoints = coords.map(c => `${c.x},${c.y}`).join(' ');

    const bottomY = PAD_T + plotH;
    const areaD = coords.map((c, i) => (i === 0 ? `M${c.x},${c.y}` : `L${c.x},${c.y}`)).join(' ')
      + ` L${coords[coords.length - 1].x},${bottomY} L${coords[0].x},${bottomY} Z`;

    const gridY: Array<{ y: number; label: string }> = [];
    for (let i = 0; i <= GRID_LINES; i++) {
      const val = paddedMin + (valRange / GRID_LINES) * i;
      const y = PAD_T + plotH - (i / GRID_LINES) * plotH;
      gridY.push({ y, label: type === 'speed' ? val.toFixed(1) : Math.round(val).toString() });
    }

    const xLabels: Array<{ x: number; label: string }> = [];
    for (let i = 0; i <= 5; i++) {
      const idx = Math.round((i / 5) * (n - 1));
      xLabels.push({
        x: PAD_L + (idx / (n - 1)) * plotW,
        label: filtered[idx].distanceKm.toFixed(1),
      });
    }

    return { linePoints, areaD, gridY, xLabels, svgW, plotH };
  }, [data, type]);

  if (!computed) return null;

  const { linePoints, areaD, gridY, xLabels, svgW, plotH } = computed;
  const isArea = type === 'elevation';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {title} ({unit})
      </Text>
      <Svg width="100%" height={CHART_H} viewBox={`0 0 ${svgW} ${CHART_H}`}>
        <Defs>
          <LinearGradient id={`areaGrad-${type}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={COLORS.PRIMARY} stopOpacity={0.35} />
            <Stop offset="1" stopColor={COLORS.PRIMARY} stopOpacity={0.02} />
          </LinearGradient>
        </Defs>

        {/* Grid lines + Y labels */}
        {gridY.map((g, i) => (
          <React.Fragment key={i}>
            <Line
              x1={PAD_L} y1={g.y}
              x2={svgW - PAD_R} y2={g.y}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={1}
            />
            <SvgText
              x={PAD_L - 4} y={g.y + 3}
              textAnchor="end"
              fill="rgba(255,255,255,0.3)"
              fontSize={9}
            >
              {g.label}
            </SvgText>
          </React.Fragment>
        ))}

        {/* X axis */}
        <Line
          x1={PAD_L} y1={PAD_T + plotH}
          x2={svgW - PAD_R} y2={PAD_T + plotH}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={1}
        />

        {/* X labels */}
        {xLabels.map((xl, i) => (
          <SvgText
            key={i}
            x={xl.x} y={CHART_H - 2}
            textAnchor="middle"
            fill="rgba(255,255,255,0.3)"
            fontSize={9}
          >
            {xl.label}
          </SvgText>
        ))}

        {/* Area fill (elevation only) */}
        {isArea && <Path d={areaD} fill={`url(#areaGrad-${type})`} />}

        {/* Main line */}
        <Polyline
          points={linePoints}
          fill="none"
          stroke={COLORS.PRIMARY}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </Svg>
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
    marginHorizontal: 20,
    marginBottom: 12,
  },
  title: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    fontWeight: '500',
    color: COLORS.TEXT.TERTIARY,
    marginBottom: 8,
  },
});
