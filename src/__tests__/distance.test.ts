import { describe, expect, it } from 'vitest';
import { formatDistance, haversineDistanceKm } from '../utils/distance';

describe('haversineDistanceKm', () => {
  it('returns 0 for identical coordinates', () => {
    expect(haversineDistanceKm(52.52, 13.405, 52.52, 13.405)).toBe(0);
  });

  it('calculates a known distance within reasonable tolerance', () => {
    // Berlin Mitte → Brandenburg Gate: ~1.5 km
    const dist = haversineDistanceKm(52.52, 13.405, 52.5163, 13.3777);
    expect(dist).toBeGreaterThan(1);
    expect(dist).toBeLessThan(3);
  });

  it('calculates Berlin to Munich (~504 km)', () => {
    const dist = haversineDistanceKm(52.52, 13.405, 48.1351, 11.582);
    expect(dist).toBeGreaterThan(490);
    expect(dist).toBeLessThan(520);
  });

  it('is symmetric', () => {
    const a = haversineDistanceKm(52.52, 13.405, 48.1351, 11.582);
    const b = haversineDistanceKm(48.1351, 11.582, 52.52, 13.405);
    expect(a).toBeCloseTo(b, 6);
  });
});

describe('formatDistance', () => {
  it('returns a prompt to share location when location is not enabled', () => {
    expect(formatDistance(undefined, { locationEnabled: false, hasCoordinates: true })).toBe(
      'Share location to calculate distance',
    );
  });

  it('returns unavailable message when venue has no coordinates', () => {
    expect(formatDistance(undefined, { locationEnabled: true, hasCoordinates: false })).toBe(
      'Venue coordinates unavailable',
    );
  });

  it('returns generic unavailable when location enabled but distance is still undefined', () => {
    expect(formatDistance(undefined, { locationEnabled: true, hasCoordinates: true })).toBe('Distance unavailable');
  });

  it('formats sub-kilometre distances in metres', () => {
    expect(formatDistance(0.35, { locationEnabled: true, hasCoordinates: true })).toBe('350 m away');
  });

  it('formats kilometre distances with one decimal', () => {
    expect(formatDistance(2.567, { locationEnabled: true, hasCoordinates: true })).toBe('2.6 km away');
  });

  it('formats exactly 1 km', () => {
    expect(formatDistance(1.0, { locationEnabled: true, hasCoordinates: true })).toBe('1.0 km away');
  });
});
