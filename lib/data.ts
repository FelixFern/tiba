import stationsData from "../data/stations.json";
import linesData from "../data/lines.json";
import { Station, Line, LineId } from "./types";

// Type assertions for imported JSON
const stations = stationsData as Station[];
const lines = linesData as Line[];

/**
 * Get a station by its ID
 * @param id Station ID (e.g., "MRI" for Manggarai)
 * @returns Station object or undefined
 */
export function getStationById(id: string): Station | undefined {
  return stations.find((station) => station.id === id);
}

/**
 * Get a line by its ID
 * @param id Line ID (e.g., "bogor")
 * @returns Line object or undefined
 */
export function getLineById(id: LineId): Line | undefined {
  return lines.find((line) => line.id === id);
}

/**
 * Get all stations
 * @returns Array of all 93 stations
 */
export function getAllStations(): Station[] {
  return stations;
}

/**
 * Get all stations on a specific line in order
 * @param lineId Line ID (e.g., "bogor")
 * @returns Array of stations in sequence order for that line
 */
export function getStationsByLine(lineId: LineId): Station[] {
  const line = getLineById(lineId);
  if (!line) return [];

  return line.stations
    .map((stationId) => getStationById(stationId))
    .filter((station): station is Station => station !== undefined);
}

/**
 * Get all lines
 * @returns Array of all 5 lines
 */
export function getAllLines(): Line[] {
  return lines;
}
