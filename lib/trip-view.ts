import { Leg, Line, Station, TripPlan } from './types';
import { getStationById, getLineById } from './data';

// ============================================================================
// Trip view — a single derived snapshot of "where am I on this journey"
// ============================================================================
//
// The home route header, the live notification, and the lock-screen live card
// all need the same derived facts about the active leg (its target station,
// whether it's a transfer, how many stops remain, leg progress). Centralizing
// that here keeps those surfaces consistent.

export type TripStatus = 'armed' | 'transfer' | 'arrived';

export interface TripView {
  leg: Leg | null;
  legIndex: number;
  legCount: number;
  line: Line | null; // current leg's line
  target: Station | null; // current leg's alight (transfer point or destination)
  finalDestination: Station | null;
  isTransfer: boolean; // alighting here means switching lines
  nextLineName?: string; // the line boarded after a transfer
  stopsLeft: number | null; // stops to the leg's alight
  progress: { total: number; current: number }; // for a dot strip
  status: TripStatus;
}

export interface TripViewInput {
  tripPlan: TripPlan | null;
  currentLegIndex: number;
  nearestStationId: string | null;
  destination: Station | null;
  stationsRemaining: number | null;
}

/**
 * Derive the current-leg view from trip state. Returns null when there's no
 * active leg and no destination to fall back to.
 */
export function getTripView(input: TripViewInput): TripView | null {
  const { tripPlan, currentLegIndex, nearestStationId, destination, stationsRemaining } = input;

  const leg = tripPlan?.legs[currentLegIndex] ?? null;

  // Fallback: a destination is set but no route is planned yet.
  if (!leg) {
    if (!destination) return null;
    return {
      leg: null,
      legIndex: 0,
      legCount: tripPlan?.legs.length ?? 1,
      line: destination.lines[0] ? getLineById(destination.lines[0]) ?? null : null,
      target: destination,
      finalDestination: destination,
      isTransfer: false,
      stopsLeft: stationsRemaining,
      progress: { total: 0, current: 0 },
      status: stationsRemaining === 0 ? 'arrived' : 'armed',
    };
  }

  const total = Math.max(0, leg.stationIds.length - 1);
  const curIdx = nearestStationId ? leg.stationIds.indexOf(nearestStationId) : -1;
  const current = curIdx === -1 ? 0 : curIdx;
  const stopsLeft = stationsRemaining ?? (curIdx === -1 ? null : total - curIdx);

  const nextLeg = tripPlan?.legs[currentLegIndex + 1];
  const nextLineName = leg.isTransfer && nextLeg ? getLineById(nextLeg.lineId)?.name : undefined;

  let status: TripStatus;
  if (stopsLeft === 0) status = leg.isTransfer ? 'transfer' : 'arrived';
  else status = 'armed';

  return {
    leg,
    legIndex: currentLegIndex,
    legCount: tripPlan?.legs.length ?? 1,
    line: getLineById(leg.lineId) ?? null,
    target: getStationById(leg.toStationId) ?? destination,
    finalDestination: destination,
    isTransfer: leg.isTransfer,
    nextLineName,
    stopsLeft,
    progress: { total, current },
    status,
  };
}
