import { describe, it, expect } from 'bun:test';
import { projectOntoPolyline, nearestVertexIndex } from '../lib/map-match';
import { getStationsByLine } from '../lib/data';

describe('projectOntoPolyline', () => {
  // A short north–south polyline near Jakarta.
  const line = [
    { lat: -6.20, lon: 106.80 },
    { lat: -6.21, lon: 106.80 },
    { lat: -6.22, lon: 106.80 },
  ];

  it('returns null for degenerate polylines', () => {
    expect(projectOntoPolyline(-6.2, 106.8, [])).toBeNull();
    expect(projectOntoPolyline(-6.2, 106.8, [{ lat: -6.2, lon: 106.8 }])).toBeNull();
  });

  it('finds the segment and fraction for a point near the middle', () => {
    // Halfway between the 2nd and 3rd points.
    const p = projectOntoPolyline(-6.215, 106.8, line)!;
    expect(p.segmentIndex).toBe(1);
    expect(p.t).toBeGreaterThan(0.4);
    expect(p.t).toBeLessThan(0.6);
    expect(p.distanceM).toBeLessThan(20);
  });

  it('measures perpendicular distance to the line', () => {
    // ~0.01 deg lon east of the line at that latitude ≈ ~1.1km.
    const p = projectOntoPolyline(-6.205, 106.81, line)!;
    expect(p.distanceM).toBeGreaterThan(800);
    expect(p.distanceM).toBeLessThan(1300);
  });

  it('snaps to the nearer vertex via nearestVertexIndex', () => {
    const near0 = projectOntoPolyline(-6.201, 106.8, line)!;
    expect(nearestVertexIndex(near0)).toBe(0);
    const near2 = projectOntoPolyline(-6.219, 106.8, line)!;
    expect(nearestVertexIndex(near2)).toBe(2);
  });

  it('discriminates between two real parallel lines by corridor distance', () => {
    // A point on the Bogor line should project closer to bogor than to a line
    // that diverges from it (rangkasbitung).
    const bogor = getStationsByLine('bogor');
    const rangkas = getStationsByLine('rangkasbitung');
    // Use an actual Bogor-line station coordinate as the test point.
    const cilebut = bogor.find((s) => s.id === 'CLB')!;
    const pB = projectOntoPolyline(cilebut.lat, cilebut.lon, bogor)!;
    const pR = projectOntoPolyline(cilebut.lat, cilebut.lon, rangkas)!;
    expect(pB.distanceM).toBeLessThan(pR.distanceM);
    expect(pB.distanceM).toBeLessThan(50);
  });
});
