import { generateGPX, generateKML } from '../utils/gpxExport';
import type { ActivityResponseDTO, TrackPointUploadDTO } from '../types';

function makeActivity(overrides: Partial<ActivityResponseDTO> = {}): ActivityResponseDTO {
  return {
    id: 1,
    type: 'HIKING',
    startTime: '2026-04-20T10:00:00',
    endTime: '2026-04-20T12:00:00',
    duration: 7200,
    distance: 5000,
    elevationGain: 100,
    status: 'COMPLETED',
    createdAt: '2026-04-20T10:00:00',
    ...overrides,
  };
}

function makePoint(overrides: Partial<TrackPointUploadDTO> = {}): TrackPointUploadDTO {
  return {
    latitude: 39.9042,
    longitude: 116.4074,
    altitude: 50,
    speed: 1.5,
    timestamp: '2026-04-20T10:00:00',
    ...overrides,
  };
}

describe('generateGPX', () => {
  it('generates valid GPX XML with track points', () => {
    const activity = makeActivity();
    const points = [
      makePoint({ latitude: 39.9042, longitude: 116.4074, altitude: 50 }),
      makePoint({ latitude: 39.9050, longitude: 116.4080, altitude: 55 }),
    ];
    const gpx = generateGPX(activity, points);

    expect(gpx).toContain('<?xml version="1.0"');
    expect(gpx).toContain('<gpx version="1.1"');
    expect(gpx).toContain('HIKING - 2026-04-20T10:00:00');
    expect(gpx).toContain('<trkpt lat="39.9042" lon="116.4074"');
    expect(gpx).toContain('<ele>50.0</ele>');
    expect(gpx).toContain('<trkpt lat="39.905" lon="116.408"');
    expect(gpx).toContain('<ele>55.0</ele>');
  });

  it('generates GPX without elevation when altitude is null', () => {
    const activity = makeActivity();
    const points = [
      makePoint({ latitude: 39.9042, longitude: 116.4074, altitude: null }),
    ];
    const gpx = generateGPX(activity, points);

    expect(gpx).not.toContain('<ele>');
    expect(gpx).toContain('<time>');
  });

  it('generates GPX with empty track points', () => {
    const activity = makeActivity();
    const gpx = generateGPX(activity, []);

    expect(gpx).toContain('<trkseg>');
    expect(gpx).toContain('</trkseg>');
    expect(gpx).not.toContain('<trkpt');
  });

  it('handles multiple track points', () => {
    const activity = makeActivity();
    const points = Array.from({ length: 10 }, (_, i) =>
      makePoint({ latitude: 39.9 + i * 0.001, longitude: 116.4 + i * 0.001, altitude: 50 + i })
    );
    const gpx = generateGPX(activity, points);

    const matches = gpx.match(/<trkpt/g);
    expect(matches).toHaveLength(10);
  });
});

describe('generateKML', () => {
  it('generates valid KML XML with coordinates', () => {
    const activity = makeActivity();
    const points = [
      makePoint({ latitude: 39.9042, longitude: 116.4074, altitude: 50 }),
      makePoint({ latitude: 39.9050, longitude: 116.4080, altitude: 55 }),
    ];
    const kml = generateKML(activity, points);

    expect(kml).toContain('<?xml version="1.0"');
    expect(kml).toContain('<kml xmlns="http://www.opengis.net/kml/2.2"');
    expect(kml).toContain('116.4074,39.9042,50.0');
    expect(kml).toContain('116.408,39.905,55.0');
  });

  it('generates KML coordinates without altitude', () => {
    const activity = makeActivity();
    const points = [
      makePoint({ latitude: 39.9042, longitude: 116.4074, altitude: null }),
    ];
    const kml = generateKML(activity, points);

    // Without altitude, coordinate should be just lon,lat
    expect(kml).toContain('116.4074,39.9042');
    expect(kml).not.toContain('116.4074,39.9042,');
  });

  it('formats coordinates as lon,lat,alt', () => {
    const activity = makeActivity();
    const points = [
      makePoint({ latitude: 39.0, longitude: 116.0, altitude: 100 }),
    ];
    const kml = generateKML(activity, points);
    // KML uses longitude,latitude,altitude order
    expect(kml).toContain('116,39,100.0');
  });

  it('handles empty points', () => {
    const activity = makeActivity();
    const kml = generateKML(activity, []);
    expect(kml).toContain('<coordinates>');
    expect(kml).toContain('</coordinates>');
  });
});
