export type LineId = "bogor" | "cikarang" | "rangkasbitung" | "tangerang" | "tanjungpriok";

export interface Station {
  id: string;
  name: string;
  lat: number;
  lon: number;
  lines: LineId[];
  sequences: Partial<Record<LineId, number>>;
}

export interface Line {
  id: LineId;
  name: string;
  color: string;
  stations: string[];
}

/**
 * One ride on a single line within a (possibly multi-line) journey. A trip with
 * a transfer is a sequence of legs; the alight station of one leg is the board
 * station of the next.
 */
export interface Leg {
  lineId: LineId;
  fromStationId: string; // board
  toStationId: string; // alight — a transfer point, or the final destination
  stationIds: string[]; // ordered board → alight, inclusive
  isTransfer: boolean; // true when alighting here to switch lines
}

/** A planned journey from origin to destination across one or more legs. */
export interface TripPlan {
  originId: string;
  destinationId: string;
  legs: Leg[];
}
