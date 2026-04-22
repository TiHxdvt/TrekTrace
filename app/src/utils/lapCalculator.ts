/**
 * 分段统计计算
 * 按固定距离分段，计算每段配速、时长、爬升
 */

import { haversineDistance } from './geo';
import type { ProcessedPoint, ActivityType } from '../types';

export interface LapData {
  lapIndex: number;
  startDistance: number; // meters
  endDistance: number; // meters
  duration: number; // seconds
  elevationGain: number; // meters
  pace: number; // seconds per km
}

/** Get lap distance based on activity type */
function getLapDistance(type: ActivityType): number {
  switch (type) {
    case 'CYCLING': return 5000; // 5km
    case 'RUNNING': return 1000; // 1km
    case 'HIKING': return 1000; // 1km
    default: return 1000;
  }
}

/**
 * Calculate lap data from processed segments
 */
export function calculateLaps(
  segments: Array<{ points: ProcessedPoint[] }>,
  activityType: ActivityType,
): LapData[] {
  if (!segments || segments.length === 0) return [];

  const lapDistance = getLapDistance(activityType);
  const allPoints: ProcessedPoint[] = segments.flatMap(s => s.points);

  if (allPoints.length < 2) return [];

  const laps: LapData[] = [];
  let currentLapStart = 0; // distance in meters
  let lapStartTime = new Date(allPoints[0].timestamp).getTime();
  let lapStartAlt = allPoints[0].altitude;
  let lapElevGain = 0;
  let prevAlt = allPoints[0].altitude;
  let totalDist = 0;

  for (let i = 1; i < allPoints.length; i++) {
    const p = allPoints[i];
    const prev = allPoints[i - 1];

    const d = haversineDistance(
      prev.latitude, prev.longitude,
      p.latitude, p.longitude,
    );
    totalDist += d;

    // Track elevation gain
    if (p.altitude > prevAlt) {
      lapElevGain += p.altitude - prevAlt;
    }
    prevAlt = p.altitude;

    // Check if we've crossed a lap boundary
    while (totalDist >= currentLapStart + lapDistance) {
      const lapEndDist = currentLapStart + lapDistance;
      const now = new Date(p.timestamp).getTime();
      const lapDuration = (now - lapStartTime) / 1000;
      const lapDist = lapEndDist - currentLapStart;

      laps.push({
        lapIndex: laps.length + 1,
        startDistance: currentLapStart,
        endDistance: lapEndDist,
        duration: lapDuration,
        elevationGain: lapElevGain,
        pace: lapDist > 0 ? lapDuration / (lapDist / 1000) : 0,
      });

      // Reset for next lap
      currentLapStart = lapEndDist;
      lapStartTime = now;
      lapElevGain = 0;
    }
  }

  // Last partial lap
  if (totalDist > currentLapStart && allPoints.length > 1) {
    const lastPoint = allPoints[allPoints.length - 1];
    const now = new Date(lastPoint.timestamp).getTime();
    const lapDuration = (now - lapStartTime) / 1000;
    const lapDist = totalDist - currentLapStart;

    if (lapDist > 0) {
      laps.push({
        lapIndex: laps.length + 1,
        startDistance: currentLapStart,
        endDistance: totalDist,
        duration: lapDuration,
        elevationGain: lapElevGain,
        pace: lapDist > 0 ? lapDuration / (lapDist / 1000) : 0,
      });
    }
  }

  return laps;
}
