import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  formatDuration,
  formatDistance,
  buildMapsUrl,
  fetchOsrmRoute,
} from '../../web/js/routing.js';

describe('formatDuration', () => {
  it('formats whole minutes and seconds', () => {
    expect(formatDuration(125)).toBe('2m 5s');
  });

  it('handles zero seconds', () => {
    expect(formatDuration(0)).toBe('0m 0s');
  });

  it('handles exactly one minute', () => {
    expect(formatDuration(60)).toBe('1m 0s');
  });

  it('rounds sub-second values', () => {
    expect(formatDuration(90.6)).toBe('1m 31s');
  });
});

describe('formatDistance', () => {
  it('converts metres to miles with one decimal', () => {
    expect(formatDistance(1609.34)).toBe('1.0 mi');
  });

  it('formats a longer distance', () => {
    expect(formatDistance(8046.7)).toBe('5.0 mi');
  });

  it('formats zero distance', () => {
    expect(formatDistance(0)).toBe('0.0 mi');
  });
});

describe('buildMapsUrl', () => {
  const origin = { lat: 37.5407, lng: -77.4360 };
  const dest   = { lat: 37.5540, lng: -77.4600 };

  it('builds a URL with no waypoints', () => {
    const url = buildMapsUrl(origin, dest, []);
    expect(url).toContain('https://www.google.com/maps/dir/?api=1');
    expect(url).toContain(`origin=${origin.lat},${origin.lng}`);
    expect(url).toContain(`destination=${dest.lat},${dest.lng}`);
    expect(url).toContain('travelmode=driving');
    expect(url).not.toContain('waypoints=');
  });

  it('includes waypoints when provided', () => {
    const waypoints = [
      { anchorLat: 37.5450, anchorLng: -77.4480 },
      { anchorLat: 37.5490, anchorLng: -77.4550 },
    ];
    const url = buildMapsUrl(origin, dest, waypoints);
    expect(url).toContain('waypoints=');
    expect(url).toContain('37.545000,-77.448000');
    expect(url).toContain('37.549000,-77.455000');
  });

  it('separates multiple waypoints with a pipe character', () => {
    const waypoints = [
      { anchorLat: 37.5450, anchorLng: -77.4480 },
      { anchorLat: 37.5490, anchorLng: -77.4550 },
    ];
    const url = buildMapsUrl(origin, dest, waypoints);
    const waypointsParam = new URL(url).searchParams.get('waypoints');
    expect(waypointsParam).toContain('|');
  });
});

describe('fetchOsrmRoute', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns duration and distance on success', async () => {
    const mockResponse = {
      routes: [{ duration: 300, distance: 2000 }],
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    }));

    const result = await fetchOsrmRoute([[-77.436, 37.5407], [-77.46, 37.554]]);
    expect(result).not.toBeNull();
    expect(result.duration).toBe(300);
    expect(result.distance).toBe(2000);
  });

  it('returns null when fetch throws a network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

    const result = await fetchOsrmRoute([[-77.436, 37.5407], [-77.46, 37.554]]);
    expect(result).toBeNull();
  });

  it('returns null when response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));

    const result = await fetchOsrmRoute([[-77.436, 37.5407], [-77.46, 37.554]]);
    expect(result).toBeNull();
  });

  it('returns null when routes array is empty', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ routes: [] }),
    }));

    const result = await fetchOsrmRoute([[-77.436, 37.5407], [-77.46, 37.554]]);
    expect(result).toBeNull();
  });
});
