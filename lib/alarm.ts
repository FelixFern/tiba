import { Station, Line } from './types';

/**
 * Calculate the number of stations remaining between current and destination stations
 * @param currentStation The current station
 * @param destination The destination station
 * @param line The line object
 * @param direction Direction of travel ('increasing' or 'decreasing')
 * @returns Number of stations remaining, or null if calculation is not possible
 */
export function calculateStationsRemaining(
  currentStation: Station | null,
  destination: Station | null,
  line: Line | null,
  direction: string
): number | null {
  if (!currentStation || !destination || !line) {
    return null;
  }

  const currentSeq = currentStation.sequences[line.id];
  const destSeq = destination.sequences[line.id];

  if (currentSeq === undefined || destSeq === undefined) {
    return null;
  }

  if (direction === 'increasing') {
    return destSeq - currentSeq;
  } else if (direction === 'decreasing') {
    return currentSeq - destSeq;
  }

  return null;
}

/**
 * Check if alarm should trigger based on remaining stations and threshold
 * @param currentStation The current station
 * @param destination The destination station
 * @param line The line object
 * @param direction Direction of travel ('increasing' or 'decreasing')
 * @param threshold Number of stations to trigger alarm within
 * @returns true if alarm should trigger, false otherwise
 */
export function checkAlarmTrigger(
  currentStation: Station | null,
  destination: Station | null,
  line: Line | null,
  direction: string,
  threshold: number
): boolean {
  if (
    !currentStation ||
    !destination ||
    !line ||
    !direction ||
    threshold === null ||
    threshold === undefined
  ) {
    return false;
  }

  const stationsRemaining = calculateStationsRemaining(
    currentStation,
    destination,
    line,
    direction
  );

  if (stationsRemaining === null) {
    return false;
  }

  return stationsRemaining > 0 && stationsRemaining <= threshold;
}
