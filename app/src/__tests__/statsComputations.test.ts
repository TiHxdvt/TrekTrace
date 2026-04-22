import {
  estimateCalories,
  groupByDay,
  computeWeekSummary,
  computeMonthSummary,
  computeStreak,
  computeLifetimeStats,
} from '../utils/statsComputations';
import type { ActivityItem } from '../utils/statsComputations';

function makeActivity(overrides: Partial<ActivityItem> = {}): ActivityItem {
  return {
    id: 1,
    type: 'HIKING',
    startTime: '2026-04-20T10:00:00',
    endTime: '2026-04-20T12:00:00',
    duration: 3600,
    distance: 5000,
    elevationGain: 100,
    ...overrides,
  };
}

describe('estimateCalories', () => {
  it('calculates HIKING calories with default weight', () => {
    const cal = estimateCalories(5000, 3600, 100, 'HIKING');
    // MET=6, weight=70, hours=1 => 420, climbBonus = (100/100)*0.3 = 0.3 => ~420
    expect(cal).toBe(420);
  });

  it('calculates RUNNING calories (higher MET)', () => {
    const cal = estimateCalories(5000, 3600, 0, 'RUNNING');
    // MET=9.8, weight=70, hours=1 => 686
    expect(cal).toBe(686);
  });

  it('calculates CYCLING calories', () => {
    const cal = estimateCalories(20000, 3600, 0, 'CYCLING');
    // MET=8, weight=70, hours=1 => 560
    expect(cal).toBe(560);
  });

  it('uses custom weight', () => {
    const cal = estimateCalories(5000, 3600, 0, 'HIKING', 80);
    // MET=6, weight=80, hours=1 => 480
    expect(cal).toBe(480);
  });

  it('adds climb bonus for positive elevation', () => {
    const noElev = estimateCalories(5000, 3600, 0, 'HIKING', 70);
    const withElev = estimateCalories(5000, 3600, 500, 'HIKING', 70);
    expect(withElev).toBeGreaterThan(noElev);
  });

  it('handles zero duration', () => {
    const cal = estimateCalories(5000, 0, 100, 'HIKING');
    expect(cal).toBe(0);
  });
});

describe('groupByDay', () => {
  it('groups activities by date', () => {
    const activities = [
      makeActivity({ id: 1, startTime: '2026-04-20T10:00:00' }),
      makeActivity({ id: 2, startTime: '2026-04-20T14:00:00' }),
      makeActivity({ id: 3, startTime: '2026-04-21T10:00:00' }),
    ];
    const map = groupByDay(activities);
    expect(map.size).toBe(2);
    expect(map.get('2026-04-20')!.activities.length).toBe(2);
    expect(map.get('2026-04-21')!.activities.length).toBe(1);
  });

  it('returns empty map for empty input', () => {
    const map = groupByDay([]);
    expect(map.size).toBe(0);
  });

  it('accumulates totals per day', () => {
    const activities = [
      makeActivity({ id: 1, startTime: '2026-04-20T10:00:00', distance: 3000, duration: 1800 }),
      makeActivity({ id: 2, startTime: '2026-04-20T14:00:00', distance: 2000, duration: 1200 }),
    ];
    const map = groupByDay(activities);
    const day = map.get('2026-04-20')!;
    expect(day.totalDistance).toBe(5000);
    expect(day.totalDuration).toBe(3000);
  });

  it('tracks activity types per day', () => {
    const activities = [
      makeActivity({ id: 1, type: 'HIKING', startTime: '2026-04-20T10:00:00' }),
      makeActivity({ id: 2, type: 'RUNNING', startTime: '2026-04-20T14:00:00' }),
    ];
    const map = groupByDay(activities);
    const day = map.get('2026-04-20')!;
    expect(day.types.has('HIKING')).toBe(true);
    expect(day.types.has('RUNNING')).toBe(true);
  });
});

describe('computeWeekSummary', () => {
  it('returns 7-day structure even with no activities', () => {
    const result = computeWeekSummary(new Date('2026-04-20'), []);
    expect(result.days.length).toBe(7);
    expect(result.totalActivities).toBe(0);
    expect(result.totalDistance).toBe(0);
  });

  it('aggregates activities within the week', () => {
    // 2026-04-20 is a Monday
    const activities = [
      makeActivity({ id: 1, startTime: '2026-04-20T10:00:00', distance: 5000, duration: 3600 }),
      makeActivity({ id: 2, startTime: '2026-04-22T10:00:00', distance: 3000, duration: 1800 }),
    ];
    const result = computeWeekSummary(new Date('2026-04-20'), activities);
    expect(result.totalActivities).toBe(2);
    expect(result.totalDistance).toBe(8000);
    expect(result.totalDuration).toBe(5400);
  });

  it('excludes activities outside the week', () => {
    const activities = [
      makeActivity({ id: 1, startTime: '2026-04-19T10:00:00' }), // Sunday before
      makeActivity({ id: 2, startTime: '2026-04-27T10:00:00' }), // Monday after
    ];
    // Week of Apr 20 (Mon) to Apr 26 (Sun)
    const result = computeWeekSummary(new Date('2026-04-22'), activities);
    expect(result.totalActivities).toBe(0);
  });
});

describe('computeMonthSummary', () => {
  it('returns zero for empty month', () => {
    const result = computeMonthSummary(2026, 4, []);
    expect(result.totalActivities).toBe(0);
    expect(result.activeDays).toBe(0);
    expect(result.year).toBe(2026);
    expect(result.month).toBe(4);
  });

  it('aggregates activities for the month', () => {
    const activities = [
      makeActivity({ id: 1, startTime: '2026-04-05T10:00:00', distance: 5000 }),
      makeActivity({ id: 2, startTime: '2026-04-05T15:00:00', distance: 3000 }),
      makeActivity({ id: 3, startTime: '2026-04-20T10:00:00', distance: 8000 }),
    ];
    const result = computeMonthSummary(2026, 4, activities);
    expect(result.totalActivities).toBe(3);
    expect(result.totalDistance).toBe(16000);
    expect(result.activeDays).toBe(2);
  });

  it('excludes activities from other months', () => {
    const activities = [
      makeActivity({ id: 1, startTime: '2026-03-31T10:00:00' }),
      makeActivity({ id: 2, startTime: '2026-05-01T10:00:00' }),
    ];
    const result = computeMonthSummary(2026, 4, activities);
    expect(result.totalActivities).toBe(0);
  });
});

describe('computeStreak', () => {
  it('returns zeros for empty data', () => {
    const result = computeStreak([]);
    expect(result.current).toBe(0);
    expect(result.longest).toBe(0);
  });

  it('computes longest streak across multiple activities', () => {
    const activities = [
      makeActivity({ id: 1, startTime: '2026-04-18T10:00:00' }),
      makeActivity({ id: 2, startTime: '2026-04-19T10:00:00' }),
      makeActivity({ id: 3, startTime: '2026-04-20T10:00:00' }),
      makeActivity({ id: 4, startTime: '2026-04-22T10:00:00' }),
    ];
    const result = computeStreak(activities);
    expect(result.longest).toBe(3);
  });

  it('computes current streak including today', () => {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const yesterday = new Date(today.getTime() - 86400000).toISOString().slice(0, 10);
    const activities = [
      makeActivity({ id: 1, startTime: yesterday + 'T10:00:00' }),
      makeActivity({ id: 2, startTime: todayStr + 'T10:00:00' }),
    ];
    const result = computeStreak(activities);
    expect(result.current).toBe(2);
  });

  it('current streak is zero when gap before today', () => {
    const activities = [
      makeActivity({ id: 1, startTime: '2026-01-01T10:00:00' }),
      makeActivity({ id: 2, startTime: '2026-01-02T10:00:00' }),
    ];
    const result = computeStreak(activities);
    expect(result.current).toBe(0);
    expect(result.longest).toBe(2);
  });
});

describe('computeLifetimeStats', () => {
  it('returns zeros for empty', () => {
    const result = computeLifetimeStats([]);
    expect(result.totalActivities).toBe(0);
    expect(result.totalDistance).toBe(0);
    expect(result.totalElevationGain).toBe(0);
  });

  it('aggregates all activities', () => {
    const activities = [
      makeActivity({ id: 1, type: 'HIKING', distance: 5000, duration: 3600, elevationGain: 100 }),
      makeActivity({ id: 2, type: 'RUNNING', distance: 3000, duration: 1800, elevationGain: 50 }),
    ];
    const result = computeLifetimeStats(activities);
    expect(result.totalActivities).toBe(2);
    expect(result.totalDistance).toBe(8000);
    expect(result.totalDuration).toBe(5400);
    expect(result.totalElevationGain).toBe(150);
    expect(result.byType.HIKING.count).toBe(1);
    expect(result.byType.RUNNING.count).toBe(1);
  });
});
