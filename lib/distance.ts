import { Station } from './types';

/**
 * Earth radius in meters
 */
const EARTH_RADIUS = 6371000;

/**
 * Calculate distance between two points using Haversine formula
 * @param lat1 Latitude of first point in degrees
 * @param lon1 Longitude of first point in degrees
 * @param lat2 Latitude of second point in degrees
 * @param lon2 Longitude of second point in degrees
 * @returns Distance in meters
 */
export function haversine(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS * c;
}

/**
 * Calculate distance between two points using equirectangular approximation
 * Faster than Haversine for short distances (<5km)
 * @param lat1 Latitude of first point in degrees
 * @param lon1 Longitude of first point in degrees
 * @param lat2 Latitude of second point in degrees
 * @param lon2 Longitude of second point in degrees
 * @returns Distance in meters
 */
export function equirectangular(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const x = Δλ * Math.cos((φ1 + φ2) / 2);
  const y = Δφ;

  return EARTH_RADIUS * Math.sqrt(x * x + y * y);
}

/**
 * Station with calculated distance
 */
export interface StationWithDistance extends Station {
  distance: number;
}

/**
 * Find nearest stations sorted by distance
 * @param lat Latitude of query point in degrees
 * @param lon Longitude of query point in degrees
 * @param stations Array of stations to search
 * @param limit Number of nearest stations to return
 * @returns Array of nearest stations sorted by distance (ascending)
 */
export function findNearestStations(
  lat: number,
  lon: number,
  stations: Station[],
  limit: number
): StationWithDistance[] {
  const withDistances = stations.map((station) => ({
    ...station,
    distance: equirectangular(lat, lon, station.lat, station.lon),
  }));

  return withDistances.sort((a, b) => a.distance - b.distance).slice(0, limit);
}
