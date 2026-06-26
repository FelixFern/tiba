// ============================================================================
// Map matching — project a GPS point onto a route polyline
// ============================================================================
//
// A "route" here is an ordered list of points (the line's stations in sequence).
// Projecting the user's position onto that polyline tells us:
//   - which segment (between point i and i+1) they're on,
//   - how far along that segment they are (fraction `t`), and
//   - the perpendicular distance to the line.
//
// That's enough to (a) pick which of several parallel lines the user is actually
// riding — the one whose corridor they're closest to — and (b) locate them
// between two stations rather than snapping to the nearest station point.
//
// Pure + unit-testable. Coordinates are converted to a local equirectangular
// metre plane around the query point, which is accurate at city scale.

const EARTH_RADIUS = 6371000;
const DEG = Math.PI / 180;

export interface LatLon {
  lat: number;
  lon: number;
}

export interface Projection {
  /** Index `i` of the segment [i, i+1] the point projects onto. */
  segmentIndex: number;
  /** Fraction along that segment, 0 (at i) … 1 (at i+1). */
  t: number;
  /** Perpendicular distance from the point to the polyline, in metres. */
  distanceM: number;
}

/** Project lat/lon to local metres relative to an origin (equirectangular). */
function toLocal(lat: number, lon: number, lat0: number, lon0: number): [number, number] {
  const x = (lon - lon0) * DEG * Math.cos(lat0 * DEG) * EARTH_RADIUS;
  const y = (lat - lat0) * DEG * EARTH_RADIUS;
  return [x, y];
}

/**
 * Project a point onto a polyline. Returns the closest segment, the fraction
 * along it, and the perpendicular distance. `null` if the polyline has < 2
 * points.
 */
export function projectOntoPolyline(
  lat: number,
  lon: number,
  points: readonly LatLon[]
): Projection | null {
  if (points.length < 2) return null;

  // Local plane centred on the query point → query is the origin (0, 0).
  const local = points.map((p) => toLocal(p.lat, p.lon, lat, lon));

  let best: Projection | null = null;
  for (let i = 0; i < local.length - 1; i++) {
    const [ax, ay] = local[i];
    const [bx, by] = local[i + 1];
    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;

    // Fraction of the projection of (origin - a) onto (b - a), clamped to the segment.
    let t = lenSq === 0 ? 0 : -(ax * dx + ay * dy) / lenSq;
    if (t < 0) t = 0;
    else if (t > 1) t = 1;

    const px = ax + t * dx;
    const py = ay + t * dy;
    const distanceM = Math.hypot(px, py); // distance from origin (the query point)

    if (!best || distanceM < best.distanceM) {
      best = { segmentIndex: i, t, distanceM };
    }
  }
  return best;
}

/**
 * Given the projection, the index of the endpoint that is geographically closer
 * to the point — i.e. the "nearest station" along the matched route.
 */
export function nearestVertexIndex(projection: Projection): number {
  return projection.t <= 0.5 ? projection.segmentIndex : projection.segmentIndex + 1;
}
