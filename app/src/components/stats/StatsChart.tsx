/**
 * 通用数据图表 — 纯渲染组件
 *
 * 调用方负责计算 xLabels / yTicks，组件只负责渲染。
 * 导出 niceScale / niceXLabels 工具函数供调用方使用。
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Line, Text as SvgText, G, Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { COLORS, BORDER_RADIUS, TYPOGRAPHY, SPACING } from '../../theme';

export type ChartType = 'bar' | 'line' | 'curve';

interface DataChartProps {
  title: string;
  unit: string;
  /** Y 轴数值，长度 = 数据点数量 */
  data: number[];
  /** X 轴刻度标签，在图表宽度内均匀分布 */
  xLabels: string[];
  /** Y 轴刻度值，等间距，从 0 开始（如 [0, 100, 200, 300, 400]） */
  yTicks: number[];
  chartType?: ChartType;
  /** 面积填充，默认 line/curve 为 true */
  showArea?: boolean;
  /** 数据点圆圈，默认 true */
  showDots?: boolean;
  /** 线/柱颜色，默认 COLORS.PRIMARY */
  color?: string;
}

/* ---- 常量 ---- */

const SVG_H = 170;
const PAD = { top: 8, right: 18, bottom: 24, left: 10 };
const SVG_W = 320;

/* ---- 导出的工具函数 ---- */

/** Y 轴 nice 刻度（从 0 开始，返回 ~5 个等间距值） */
export function niceScale(dataMax: number): { ticks: number[]; niceMax: number } {
  if (dataMax <= 0) return { ticks: [0, 1, 2, 3, 4], niceMax: 4 };
  const rawStep = dataMax / 4;
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const r = rawStep / mag;
  const step = r <= 1 ? mag : r <= 2 ? 2 * mag : r <= 5 ? 5 * mag : 10 * mag;
  const niceMax = step * 4;
  return { ticks: [0, step, step * 2, step * 3, niceMax].map(Math.round), niceMax };
}

/** 根据范围自动确定小数位数 */
export function autoDecimals(range: number): number {
  if (range <= 0) return 0;
  if (range < 0.01) return 3;
  if (range < 0.1) return 2;
  if (range < 1) return 2;
  if (range < 10) return 1;
  return 0;
}

/**
 * 为距离轴生成均匀标签（保留 2 位小数）
 * 例如 maxDist=0.7, count=8 → ['0.00','0.10','0.20','0.30','0.40','0.50','0.60','0.70']
 */
export function distanceLabels(maxDist: number, count = 8): string[] {
  if (maxDist <= 0) return ['0.00'];
  const step = maxDist / (count - 1);
  return Array.from({ length: count }, (_, i) => (step * i).toFixed(2));
}

/**
 * 生成 X 轴 nice 刻度标签
 * @param min   最小值（如 0）
 * @param max   最大值（如 0.73）
 * @param count 目标刻度数（默认 7）
 */
export function niceXLabels(min: number, max: number, count = 7): string[] {
  const range = max - min;
  if (range <= 0) return [min.toFixed(0)];

  const rawStep = range / count;
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const r = rawStep / mag;
  const step = r <= 1 ? mag : r <= 2 ? 2 * mag : r <= 5 ? 5 * mag : 10 * mag;

  const dec = autoDecimals(range);
  const labels: string[] = [];
  let v = Math.ceil(min / step) * step;
  while (v <= max + step * 0.01) {
    labels.push(v.toFixed(dec));
    v += step;
  }
  return labels;
}

/* ---- 内部工具 ---- */

function curvePath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return '';
  if (pts.length === 2) return `M${pts[0].x},${pts[0].y} L${pts[1].x},${pts[1].y}`;
  const t = 0.3;
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    d += ` C${p1.x + (p2.x - p0.x) * t},${p1.y + (p2.y - p0.y) * t} ${p2.x - (p3.x - p1.x) * t},${p2.y - (p3.y - p1.y) * t} ${p2.x},${p2.y}`;
  }
  return d;
}

function linePathFn(pts: { x: number; y: number }[]): string {
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
}

/* ---- 组件 ---- */

export const DataChart: React.FC<DataChartProps> = ({
  title,
  data,
  unit,
  xLabels,
  yTicks,
  chartType = 'bar',
  showArea,
  showDots = true,
  color,
}) => {
  const n = data.length;
  if (n === 0) return null;

  const chartW = SVG_W - PAD.left - PAD.right;
  const chartH = SVG_H - PAD.top - PAD.bottom;
  const yMax = yTicks[yTicks.length - 1] || 1;
  const c = color ?? COLORS.PRIMARY;
  const shouldShowArea = showArea ?? (chartType !== 'bar');
  const shouldShowDots = showDots && chartType !== 'bar';
  const gap = chartW / n;

  const bottomY = PAD.top + chartH;
  const points = data.map((v, i) => ({
    x: PAD.left + gap * i + gap / 2,
    y: PAD.top + chartH * (1 - (yMax > 0 ? v / yMax : 0)),
  }));

  const strokePath = chartType === 'curve' ? curvePath(points) : linePathFn(points);
  const areaPath = strokePath
    + ` L${points[n - 1].x},${bottomY} L${points[0].x},${bottomY} Z`;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.unit}>{unit}</Text>
      </View>

      <Svg width="100%" height={SVG_H} viewBox={`0 0 ${SVG_W} ${SVG_H}`}>
        <Defs>
          <LinearGradient id="chartAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={c} stopOpacity={0.35} />
            <Stop offset="1" stopColor={c} stopOpacity={0.02} />
          </LinearGradient>
        </Defs>

        {/* Y 轴网格线 + 刻度 */}
        {yTicks.map((tick, i) => {
          const y = PAD.top + chartH * (1 - tick / yMax);
          return (
            <G key={`y-${i}`}>
              <Line x1={PAD.left} y1={y} x2={SVG_W - PAD.right} y2={y}
                stroke={COLORS.BORDER.LIGHT} strokeWidth={0.5} />
              <SvgText x={SVG_W - PAD.right + 2} y={y + 3} textAnchor="start"
                fontSize={9} fill={COLORS.TEXT.QUATERNARY}>
                {tick}
              </SvgText>
            </G>
          );
        })}

        {/* ---- 柱状图 ---- */}
        {chartType === 'bar' && data.map((v, i) => {
          const barW = Math.max(4, gap * 0.6);
          const barH = v > 0 ? Math.max(2, (v / yMax) * chartH) : 0;
          const x = points[i].x - barW / 2;
          const y = bottomY - barH;
          const r = Math.min(barW / 2, 4);
          const d = barH > 0
            ? `M${x},${bottomY} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + barW - r},${y} Q${x + barW},${y} ${x + barW},${y + r} L${x + barW},${bottomY} Z`
            : '';
          return <G key={`b-${i}`}>{barH > 0 && <Path d={d} fill={c} />}</G>;
        })}

        {/* ---- 折线 / 曲线 ---- */}
        {chartType !== 'bar' && (
          <G>
            {shouldShowArea && <Path d={areaPath} fill="url(#chartAreaGrad)" />}
            <Path d={strokePath} fill="none" stroke={c} strokeWidth={2}
              strokeLinejoin="round" strokeLinecap="round" />
            {shouldShowDots && points.map((p, i) => (
              <Circle key={`d-${i}`} cx={p.x} cy={p.y} r={3} fill={c} />
            ))}
          </G>
        )}

        {/* X 轴标签：均匀分布 */}
        {xLabels.map((text, i) => {
          const x = PAD.left + (i / (xLabels.length - 1 || 1)) * chartW;
          return (
            <SvgText key={`x-${i}`} x={x} y={SVG_H - 2} textAnchor="middle"
              fontSize={10} fill={COLORS.TEXT.QUATERNARY}>
              {text}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
};

/** 向后兼容别名 */
export const StatsChart = DataChart;

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.OVERLAY.LIGHT,
    borderWidth: 1,
    borderColor: COLORS.BORDER.LIGHT,
    borderRadius: BORDER_RADIUS.XXL,
    padding: SPACING.LG,
    gap: SPACING.XS,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: TYPOGRAPHY.FONT_SIZE.BASE,
    fontWeight: '600',
    color: COLORS.TEXT.PRIMARY,
  },
  unit: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    color: COLORS.TEXT.QUATERNARY,
  },
});
