import { GpsKalmanFilter } from '../utils/gpsKalmanFilter';

function makePoint(overrides: { latitude?: number; longitude?: number; accuracy?: number; timestamp?: number } = {}) {
  return {
    latitude: overrides.latitude ?? 39.9042,
    longitude: overrides.longitude ?? 116.4074,
    accuracy: overrides.accuracy ?? 10,
    timestamp: overrides.timestamp ?? Date.now(),
  };
}

describe('GpsKalmanFilter', () => {
  it('returns first observation directly', () => {
    const filter = new GpsKalmanFilter();
    const result = filter.process(makePoint({ latitude: 39.9042, longitude: 116.4074 }));
    expect(result.latitude).toBeCloseTo(39.9042, 10);
    expect(result.longitude).toBeCloseTo(116.4074, 10);
    expect(result.isOutlier).toBe(false);
  });

  it('processes multiple points smoothly', () => {
    const filter = new GpsKalmanFilter();
    let t = 1000000;
    const results = [];
    for (let i = 0; i < 10; i++) {
      const result = filter.process(makePoint({
        latitude: 39.9042 + i * 0.0001,
        longitude: 116.4074 + i * 0.0001,
        timestamp: t + i * 1000,
      }));
      results.push(result);
    }
    // Results should be near the inputs (smoothed but not too far off)
    expect(results[9].latitude).toBeCloseTo(39.9042 + 9 * 0.0001, 3);
    expect(results[9].longitude).toBeCloseTo(116.4074 + 9 * 0.0001, 3);
    // No outliers for smooth trajectory
    expect(results.every(r => !r.isOutlier)).toBe(true);
  });

  it('rejects outlier points (5-sigma gate)', () => {
    const filter = new GpsKalmanFilter();
    let t = 1000000;

    // Feed several normal points to establish a trend
    for (let i = 0; i < 5; i++) {
      filter.process(makePoint({
        latitude: 39.9042,
        longitude: 116.4074,
        accuracy: 5,
        timestamp: t + i * 1000,
      }));
    }

    // Feed an outlier point far away
    const outlier = filter.process(makePoint({
      latitude: 40.0,  // ~100km away
      longitude: 116.5,
      accuracy: 5,
      timestamp: t + 5 * 1000,
    }));

    expect(outlier.isOutlier).toBe(true);
  });

  it('handles time reversal gracefully', () => {
    const filter = new GpsKalmanFilter();
    const result1 = filter.process(makePoint({ timestamp: 2000 }));
    // Earlier timestamp
    const result2 = filter.process(makePoint({
      latitude: 39.91,
      longitude: 116.41,
      timestamp: 1000,
    }));
    // Should return current state (not crash)
    expect(result2.latitude).toBeCloseTo(result1.latitude, 10);
    expect(result2.longitude).toBeCloseTo(result1.longitude, 10);
  });

  it('resets properly', () => {
    const filter = new GpsKalmanFilter();
    filter.process(makePoint({ latitude: 39.9042, longitude: 116.4074, timestamp: 1000 }));
    filter.process(makePoint({ latitude: 39.905, longitude: 116.408, timestamp: 2000 }));
    filter.reset();

    // After reset, should behave like new filter
    const result = filter.process(makePoint({ latitude: 40.0, longitude: 117.0, timestamp: 3000 }));
    expect(result.latitude).toBeCloseTo(40.0, 10);
    expect(result.longitude).toBeCloseTo(117.0, 10);
  });

  it('seedPosition initializes filter state', () => {
    const filter = new GpsKalmanFilter();
    filter.seedPosition(39.9042, 116.4074, 10);

    const result = filter.process(makePoint({
      latitude: 39.9042,
      longitude: 116.4074,
      accuracy: 10,
      timestamp: 1000,
    }));
    expect(result.latitude).toBeCloseTo(39.9042, 5);
    expect(result.longitude).toBeCloseTo(116.4074, 5);
  });

  it('improves accuracy with high-accuracy observations', () => {
    const filter = new GpsKalmanFilter();
    let t = 1000000;

    // Start with a low-accuracy point
    const r1 = filter.process(makePoint({
      latitude: 39.9042,
      longitude: 116.4074,
      accuracy: 100,
      timestamp: t,
    }));

    // Feed a high-accuracy point — should pull closer to observation
    const r2 = filter.process(makePoint({
      latitude: 39.9043,
      longitude: 116.4075,
      accuracy: 3,
      timestamp: t + 1000,
    }));

    // The second result should be close to the high-accuracy observation
    expect(Math.abs(r2.latitude - 39.9043)).toBeLessThan(Math.abs(r1.latitude - 39.9042) + 0.001);
  });
});
