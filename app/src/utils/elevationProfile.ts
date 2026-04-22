/**
 * 海拔剖面图数据转换
 */

import { haversineDistance } from './geo';
import type { ProcessedPoint } from '../types';

export interface ElevationPoint {
  distance: number; // meters
  altitude: number; // meters
}

/**
 * Convert processed segments to elevation profile data points
 */
export function toElevationProfile(
  segments: Array<{ points: ProcessedPoint[] }>,
): ElevationPoint[] {
  if (!segments || segments.length === 0) return [];

  const allPoints: ProcessedPoint[] = segments.flatMap(s => s.points);
  if (allPoints.length === 0) return [];

  const result: ElevationPoint[] = [{ distance: 0, altitude: allPoints[0].altitude }];
  let totalDist = 0;

  for (let i = 1; i < allPoints.length; i++) {
    const prev = allPoints[i - 1];
    const curr = allPoints[i];
    totalDist += haversineDistance(
      prev.latitude, prev.longitude,
      curr.latitude, curr.longitude,
    );
    result.push({ distance: totalDist, altitude: curr.altitude });
  }

  return result;
}
