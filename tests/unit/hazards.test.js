import { describe, it, expect } from 'vitest';
import { buildClusters, selectWaypoints } from '../../web/js/hazards.js';

describe('buildClusters', () => {
  it('returns a non-empty array', () => {
    const clusters = buildClusters();
    expect(Array.isArray(clusters)).toBe(true);
    expect(clusters.length).toBeGreaterThan(0);
  });

  it('each cluster has numeric lat, lng, and count', () => {
    const clusters = buildClusters();
    for (const c of clusters) {
      expect(typeof c.lat).toBe('number');
      expect(typeof c.lng).toBe('number');
      expect(typeof c.count).toBe('number');
      expect(c.count).toBeGreaterThanOrEqual(1);
    }
  });

  it('clusters are sorted by count descending', () => {
    const clusters = buildClusters();
    for (let i = 0; i < clusters.length - 1; i++) {
      expect(clusters[i].count).toBeGreaterThanOrEqual(clusters[i + 1].count);
    }
  });
});

describe('selectWaypoints', () => {
  const origin = { lat: 37.5407, lng: -77.4360 };
  const dest   = { lat: 37.5540, lng: -77.4600 };

  it('returns an object with waypoints, dodgedClusters, and skippedClusters', () => {
    const clusters = buildClusters();
    const result = selectWaypoints(origin, dest, clusters);
    expect(result).toHaveProperty('waypoints');
    expect(result).toHaveProperty('dodgedClusters');
    expect(result).toHaveProperty('skippedClusters');
    expect(Array.isArray(result.waypoints)).toBe(true);
    expect(Array.isArray(result.dodgedClusters)).toBe(true);
    expect(Array.isArray(result.skippedClusters)).toBe(true);
  });

  it('returns empty arrays when clusters list is empty', () => {
    const result = selectWaypoints(origin, dest, []);
    expect(result.waypoints).toHaveLength(0);
    expect(result.dodgedClusters).toHaveLength(0);
    expect(result.skippedClusters).toHaveLength(0);
  });

  it('adds a waypoint for a cluster sitting on the route corridor', () => {
    // Place a high-density cluster midway along the direct route, right on the line
    const midLat = (origin.lat + dest.lat) / 2;
    const midLng = (origin.lng + dest.lng) / 2;
    const clusterOnRoute = [{ lat: midLat, lng: midLng, count: 10 }];
    const result = selectWaypoints(origin, dest, clusterOnRoute);
    expect(result.waypoints.length).toBe(1);
    expect(result.dodgedClusters.length).toBe(1);
  });

  it('skips a cluster that is far off the route', () => {
    // Place a cluster far to the side of the direct route
    const clusterFarOff = [{ lat: 37.60, lng: -77.300, count: 10 }];
    const result = selectWaypoints(origin, dest, clusterFarOff);
    expect(result.waypoints.length).toBe(0);
    expect(result.dodgedClusters.length).toBe(0);
  });

  it('waypoints are sorted by t (route order)', () => {
    const clusters = buildClusters();
    const result = selectWaypoints(origin, dest, clusters);
    const ts = result.waypoints.map(w => w.t);
    for (let i = 0; i < ts.length - 1; i++) {
      expect(ts[i]).toBeLessThanOrEqual(ts[i + 1]);
    }
  });

  it('never returns more than 3 waypoints', () => {
    const clusters = buildClusters();
    const result = selectWaypoints(origin, dest, clusters);
    expect(result.waypoints.length).toBeLessThanOrEqual(3);
  });
});
