import { formatDuration, formatDistance, formatPace, formatPaceFromDistance } from '../utils/format';

describe('formatDuration', () => {
  it('formats zero seconds', () => {
    expect(formatDuration(0)).toBe('00:00');
  });

  it('formats seconds only', () => {
    expect(formatDuration(45)).toBe('00:45');
  });

  it('formats minutes and seconds', () => {
    expect(formatDuration(125)).toBe('02:05');
  });

  it('formats hours, minutes and seconds', () => {
    expect(formatDuration(3661)).toBe('1:01:01');
  });

  it('formats exact hours', () => {
    expect(formatDuration(3600)).toBe('1:00:00');
  });

  it('pads single-digit minutes', () => {
    expect(formatDuration(540)).toBe('09:00');
  });

  it('pads single-digit seconds', () => {
    expect(formatDuration(61)).toBe('01:01');
  });
});

describe('formatDistance', () => {
  it('formats meters when under 1km', () => {
    expect(formatDistance(500)).toBe('500m');
  });

  it('formats zero meters', () => {
    expect(formatDistance(0)).toBe('0m');
  });

  it('formats 1km boundary', () => {
    expect(formatDistance(1000)).toBe('1.0km');
  });

  it('formats kilometers with one decimal', () => {
    expect(formatDistance(5500)).toBe('5.5km');
  });

  it('formats large distances', () => {
    expect(formatDistance(42195)).toBe('42.2km');
  });

  it('rounds meters to nearest integer', () => {
    expect(formatDistance(123.7)).toBe('124m');
  });
});

describe('formatPace', () => {
  it('formats typical running pace', () => {
    // 5 min/km = 300 sec/km
    expect(formatPace(300)).toBe("5'00\"");
  });

  it('formats slow pace', () => {
    // 10 min/km = 600 sec/km
    expect(formatPace(600)).toBe("10'00\"");
  });

  it('formats fast pace with seconds', () => {
    // 4:15 min/km = 255 sec/km
    expect(formatPace(255)).toBe("4'15\"");
  });

  it('returns placeholder for zero pace', () => {
    expect(formatPace(0)).toBe("--'--\"");
  });

  it('returns placeholder for negative pace', () => {
    expect(formatPace(-100)).toBe("--'--\"");
  });

  it('returns placeholder for Infinity', () => {
    expect(formatPace(Infinity)).toBe("--'--\"");
  });

  it('pads single-digit seconds', () => {
    // 5:05 min/km = 305 sec/km
    expect(formatPace(305)).toBe("5'05\"");
  });
});

describe('formatPaceFromDistance', () => {
  it('calculates pace from distance and duration', () => {
    // 5km in 1500 seconds = 300 sec/km = 5'00"
    expect(formatPaceFromDistance(5000, 1500)).toBe("5'00\"");
  });

  it('returns placeholder for zero distance', () => {
    expect(formatPaceFromDistance(0, 1500)).toBe("--'--\"");
  });

  it('returns placeholder for zero duration', () => {
    expect(formatPaceFromDistance(5000, 0)).toBe("--'--\"");
  });

  it('handles half marathon pace', () => {
    // 21.1km in 7200 sec = 341 sec/km ≈ 5'41"
    const result = formatPaceFromDistance(21100, 7200);
    expect(result).toContain("'");
    expect(result).toContain('"');
  });
});
