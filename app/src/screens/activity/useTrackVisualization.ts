/**
 * 轨迹可视化计算 hook
 * coloredSegments、displaySegments、shareTrackPoints、animatedStats
 */

import { useMemo } from 'react';
import { haversineDistance } from '../../utils/geo';
import { samplePoints } from './constants';
import type { RecordingSession, RecordingStats, ActivityType } from '../../types';

interface ColoredSegment {
  coords: Array<{ latitude: number; longitude: number }>;
  colors: string[];
}

export function useTrackVisualization(
  session: RecordingSession | null,
  polylineSegments: Array<Array<{ latitude: number; longitude: number }>>,
  stats: RecordingStats,
  replayProgress: number,
  showSummary: boolean,
  showShareCard: boolean,
) {
  // Derive colored segments from polyline data + session type
  const coloredSegments = useMemo((): ColoredSegment[] => {
    if (!session || polylineSegments.length === 0) return [];

    const activityType = session.activityType;

    const SPEED_THRESHOLDS: Record<ActivityType, { slow: number; fast: number }> = {
      HIKING: { slow: 1.0, fast: 2.0 },
      RUNNING: { slow: 2.0, fast: 4.0 },
      CYCLING: { slow: 5.0, fast: 10.0 },
    };

    const { slow, fast } = SPEED_THRESHOLDS[activityType];

    const GREEN = { r: 34, g: 197, b: 94 };
    const YELLOW = { r: 245, g: 158, b: 11 };
    const RED = { r: 239, g: 68, b: 68 };

    const lerpColor = (
      c1: { r: number; g: number; b: number },
      c2: { r: number; g: number; b: number },
      t: number,
    ): string => {
      const r = Math.round(c1.r + (c2.r - c1.r) * t);
      const g = Math.round(c1.g + (c2.g - c1.g) * t);
      const b = Math.round(c1.b + (c2.b - c1.b) * t);
      return `rgb(${r},${g},${b})`;
    };

    const speedToColor = (speed: number): string => {
      if (speed <= slow) {
        const t = speed / Math.max(0.01, slow);
        return lerpColor(GREEN, YELLOW, Math.min(1, t));
      } else if (speed <= fast) {
        const t = (speed - slow) / (fast - slow);
        return lerpColor(YELLOW, RED, t);
      }
      return `rgb(${RED.r},${RED.g},${RED.b})`;
    };

    return session.segments
      .filter(s => s.points.length >= 2)
      .map(s => {
        const coords = s.points.map(p => ({ latitude: p.latitude, longitude: p.longitude }));
        const colors = s.points.map(p => speedToColor(p.speed ?? 0));
        return { coords, colors };
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [polylineSegments, session?.activityType, session?.segments]);

  // Slice coloredSegments by replayProgress for track replay animation
  const displaySegments = useMemo(() => {
    const needsInterpolation = showSummary && replayProgress < 1 && coloredSegments.length > 0;
    if (!needsInterpolation) return coloredSegments;

    const INTERPOLATION_GAP_THRESHOLD = 50;
    const INTERPOLATION_STEP = 10;

    const interpolated = coloredSegments.map(seg => {
      const newCoords: Array<{ latitude: number; longitude: number }> = [];
      const newColors: string[] = [];

      for (let i = 0; i < seg.coords.length; i++) {
        newCoords.push(seg.coords[i]);
        newColors.push(seg.colors[i]);

        if (i < seg.coords.length - 1) {
          const gap = haversineDistance(
            seg.coords[i].latitude, seg.coords[i].longitude,
            seg.coords[i + 1].latitude, seg.coords[i + 1].longitude,
          );
          if (gap > INTERPOLATION_GAP_THRESHOLD) {
            const steps = Math.floor(gap / INTERPOLATION_STEP);
            for (let s = 1; s < steps; s++) {
              const t = s / steps;
              newCoords.push({
                latitude: seg.coords[i].latitude + (seg.coords[i + 1].latitude - seg.coords[i].latitude) * t,
                longitude: seg.coords[i].longitude + (seg.coords[i + 1].longitude - seg.coords[i].longitude) * t,
              });
              newColors.push(seg.colors[i]);
            }
          }
        }
      }

      return { coords: newCoords, colors: newColors };
    });

    const totalPoints = interpolated.reduce((sum, s) => sum + s.coords.length, 0);
    const targetCount = Math.max(1, Math.round(totalPoints * replayProgress));

    const result: typeof interpolated = [];
    let accumulated = 0;

    for (const seg of interpolated) {
      const remaining = targetCount - accumulated;
      if (remaining <= 0) break;

      if (remaining >= seg.coords.length) {
        result.push(seg);
        accumulated += seg.coords.length;
      } else {
        result.push({
          coords: seg.coords.slice(0, remaining),
          colors: seg.colors.slice(0, remaining),
        });
        accumulated += remaining;
        break;
      }
    }

    return result;
  }, [coloredSegments, replayProgress, showSummary]);

  // Normalize track coords to SVG viewBox (0-200) for share card
  const shareTrackPoints = useMemo(() => {
    if (!showShareCard || coloredSegments.length === 0) return [];

    let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
    let totalPoints = 0;
    for (const seg of coloredSegments) {
      for (const p of seg.coords) {
        if (p.latitude < minLat) minLat = p.latitude;
        if (p.latitude > maxLat) maxLat = p.latitude;
        if (p.longitude < minLon) minLon = p.longitude;
        if (p.longitude > maxLon) maxLon = p.longitude;
        totalPoints++;
      }
    }
    if (totalPoints < 2) return [];

    const padLat = (maxLat - minLat) * 0.15 || 0.01;
    const padLon = (maxLon - minLon) * 0.15 || 0.01;

    const VB = 200;
    return coloredSegments.map(seg => {
      const sampled = samplePoints(seg.coords, 60);
      return sampled.map(p => ({
        x: VB * (p.longitude - minLon + padLon) / (maxLon - minLon + padLon * 2),
        y: VB * (1 - (p.latitude - minLat + padLat) / (maxLat - minLat + padLat * 2)),
      }));
    });
  }, [showShareCard, coloredSegments]);

  // Animated stats for number rolling effect in summary
  const animatedStats = useMemo(() => {
    const p = replayProgress;
    return {
      distance: stats.distance * p,
      duration: Math.round(stats.duration * p),
      currentPace: stats.currentPace > 0 ? stats.currentPace * p : 0,
      elevationGain: stats.elevationGain * p,
    };
  }, [stats, replayProgress]);

  return { coloredSegments, displaySegments, shareTrackPoints, animatedStats };
}
