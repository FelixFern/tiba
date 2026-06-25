import { Leg, LineId, Station, TripPlan } from './types';
import { getStationById, getStationsByLine } from './data';

// ============================================================================
// Station graph + route planning
// ============================================================================
//
// The KRL network is five strictly-linear lines joined at a handful of
// interchange stations (stations that appear on more than one line). We model
// routing over (station, line) states:
//   - ride:     stay on a line, move to the adjacent station (sequence ±1)
//   - transfer: stay at the station, switch to another line it serves
//
// planRoute() runs Dijkstra minimizing (transfers, then stops) — the network is
// tiny (~74 stations), so an O(V^2) search is instant. The resulting state path
// is collapsed into Legs, with a transfer boundary wherever the line changes.

// Transfers dominate the cost so a route with fewer changes always wins, even
// if it rides more stops. Weight exceeds the longest possible single route.
const TRANSFER_WEIGHT = 10000;

// Lazily-cached ordered station-id list per line.
const lineOrderCache = new Map<LineId, string[]>();

function lineOrder(lineId: LineId): string[] {
  const cached = lineOrderCache.get(lineId);
  if (cached) return cached;
  const order = getStationsByLine(lineId).map((s) => s.id);
  lineOrderCache.set(lineId, order);
  return order;
}

function stateKey(stationId: string, lineId: LineId): string {
  return `${stationId}|${lineId}`;
}

function parseState(key: string): { stationId: string; lineId: LineId } {
  const sep = key.lastIndexOf('|');
  return {
    stationId: key.slice(0, sep),
    lineId: key.slice(sep + 1) as LineId,
  };
}

/**
 * Plan a journey between two stations, minimizing transfers (then stops).
 *
 * @returns a {@link TripPlan} with one Leg per line ridden, or `null` if the
 * stations are unknown or identical.
 */
export function planRoute(originId: string, destinationId: string): TripPlan | null {
  if (originId === destinationId) return null;

  const origin = getStationById(originId);
  const destination = getStationById(destinationId);
  if (!origin || !destination) return null;

  const dist = new Map<string, number>();
  const prev = new Map<string, string | null>();

  // Boarding at the origin on any of its lines costs nothing yet.
  for (const line of origin.lines) {
    const key = stateKey(originId, line);
    dist.set(key, 0);
    prev.set(key, null);
  }

  const visited = new Set<string>();

  while (true) {
    // Pick the cheapest unvisited state (O(V) — fine for this graph size).
    let curKey: string | null = null;
    let curCost = Infinity;
    for (const [key, cost] of dist) {
      if (!visited.has(key) && cost < curCost) {
        curCost = cost;
        curKey = key;
      }
    }
    if (curKey === null) break;
    visited.add(curKey);

    const { stationId, lineId } = parseState(curKey);
    if (stationId === destinationId) break; // shortest path to the goal found

    const relax = (nextKey: string, cost: number) => {
      if (cost < (dist.get(nextKey) ?? Infinity)) {
        dist.set(nextKey, cost);
        prev.set(nextKey, curKey);
      }
    };

    // Ride: adjacent stations on the current line.
    const order = lineOrder(lineId);
    const idx = order.indexOf(stationId);
    for (const neighbourIdx of [idx - 1, idx + 1]) {
      if (neighbourIdx >= 0 && neighbourIdx < order.length) {
        relax(stateKey(order[neighbourIdx], lineId), curCost + 1);
      }
    }

    // Transfer: other lines serving this station.
    const station = getStationById(stationId);
    if (station) {
      for (const otherLine of station.lines) {
        if (otherLine !== lineId) {
          relax(stateKey(stationId, otherLine), curCost + TRANSFER_WEIGHT);
        }
      }
    }
  }

  // Best goal state across whichever line we arrive on.
  let goalKey: string | null = null;
  let goalCost = Infinity;
  for (const line of destination.lines) {
    const key = stateKey(destinationId, line);
    const cost = dist.get(key);
    if (cost !== undefined && cost < goalCost) {
      goalCost = cost;
      goalKey = key;
    }
  }
  if (goalKey === null) return null;

  // Reconstruct the ordered state path origin → destination.
  const pathKeys: string[] = [];
  for (let key: string | null = goalKey; key != null; key = prev.get(key) ?? null) {
    pathKeys.unshift(key);
  }

  const legs = buildLegs(pathKeys);
  return { originId, destinationId, legs };
}

/** Collapse an ordered (station, line) state path into one Leg per line. */
function buildLegs(pathKeys: string[]): Leg[] {
  const legs: Leg[] = [];
  if (pathKeys.length === 0) return legs;

  let { stationId: startId, lineId: legLine } = parseState(pathKeys[0]);
  let stationIds: string[] = [startId];

  for (let i = 1; i < pathKeys.length; i++) {
    const { stationId, lineId } = parseState(pathKeys[i]);
    if (lineId === legLine) {
      // Ride step on the same line.
      stationIds.push(stationId);
    } else {
      // Transfer: close the current leg at the shared interchange station.
      legs.push({
        lineId: legLine,
        fromStationId: stationIds[0],
        toStationId: stationIds[stationIds.length - 1],
        stationIds,
        isTransfer: true,
      });
      legLine = lineId;
      stationIds = [stationId];
    }
  }

  legs.push({
    lineId: legLine,
    fromStationId: stationIds[0],
    toStationId: stationIds[stationIds.length - 1],
    stationIds,
    isTransfer: false,
  });

  return legs;
}

/** Resolve a leg's `stationIds` to full Station objects in travel order. */
export function legStations(leg: Leg): Station[] {
  return leg.stationIds
    .map((id) => getStationById(id))
    .filter((s): s is Station => s !== undefined);
}

/** The final destination station id of a plan, if any. */
export function planDestinationStationId(plan: TripPlan | null): string | null {
  return plan?.destinationId ?? null;
}
