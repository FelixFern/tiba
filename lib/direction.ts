import { Station, Line, LineId } from './types';

/**
 * Detect travel direction (increasing/decreasing station sequence) from station history
 * Algorithm:
 * 1. Take last 3 stations from history
 * 2. Map each to sequence number on currentLine using station.sequences[line.id]
 * 3. If seq[0] < seq[1] < seq[2] return 'increasing'
 * 4. If seq[0] > seq[1] > seq[2] return 'decreasing'
 * 5. Otherwise return null (inconsistent or insufficient data)
 *
 * @param stationHistory - Array of stations visited
 * @param currentLine - The current line being traveled
 * @returns 'increasing' | 'decreasing' | null
 */
export function detectDirection(
  stationHistory: Station[],
  currentLine: Line
): 'increasing' | 'decreasing' | null {
  // Need at least 3 stations to determine direction
  if (stationHistory.length < 3) {
    return null;
  }

  // Take last 3 stations (most recent first in the array)
  // Reverse to get chronological order (oldest first)
  const last3 = stationHistory.slice(0, 3).reverse();

  // Map each station to its sequence number on the current line
  const sequences: (number | undefined)[] = last3.map(
    (station) => station.sequences[currentLine.id]
  );

  // Check if all sequence numbers are defined
  if (sequences.some((seq) => seq === undefined)) {
    return null;
  }

  const [seq0, seq1, seq2] = sequences as number[];

  // Check for strictly increasing sequence
  if (seq0 < seq1 && seq1 < seq2) {
    return 'increasing';
  }

  // Check for strictly decreasing sequence
  if (seq0 > seq1 && seq1 > seq2) {
    return 'decreasing';
  }

  // Inconsistent sequence
  return null;
}

/**
 * Predict travel direction as early and robustly as possible.
 *
 * Unlike `detectDirection` (which needs 3 strictly-monotonic stations), this
 * collapses repeated/oscillating samples and infers direction from the two most
 * recent *distinct* sequence positions on the line. That means a prediction is
 * available after just two different stations, and brief GPS noise that snaps
 * back to the same station doesn't reset the signal.
 *
 * @param stationHistory - Stations visited, most recent first
 * @param currentLine - The line currently being travelled
 * @returns 'increasing' | 'decreasing' | null (not enough distinct data)
 */
export function predictDirection(
  stationHistory: Station[],
  currentLine: Line
): 'increasing' | 'decreasing' | null {
  // Sequence positions on this line, most recent first, defined only.
  const sequences = stationHistory
    .map((station) => station.sequences[currentLine.id])
    .filter((seq): seq is number => seq !== undefined);

  // Collapse consecutive duplicates (same station sampled repeatedly).
  const distinct: number[] = [];
  for (const seq of sequences) {
    if (distinct[distinct.length - 1] !== seq) {
      distinct.push(seq);
    }
  }

  if (distinct.length < 2) {
    return null;
  }

  const [newer, older] = distinct;
  if (newer > older) return 'increasing';
  if (newer < older) return 'decreasing';
  return null;
}

/**
 * Calculate the mode (most common value) in an array
 * Used to infer the current line from station history
 *
 * @param values - Array of values
 * @returns The most common value, or the first value if array is empty
 */
function getMostCommonValue<T>(values: T[]): T | null {
  if (values.length === 0) {
    return null;
  }

  const frequencyMap = new Map<T, number>();
  let maxCount = 0;
  let mostCommon: T | null = null;

  for (const value of values) {
    const count = (frequencyMap.get(value) || 0) + 1;
    frequencyMap.set(value, count);

    if (count > maxCount) {
      maxCount = count;
      mostCommon = value;
    }
  }

  return mostCommon;
}

/**
 * Infer the current line from a station's available lines
 * Prefers the most common line in the history if available
 *
 * @param station - The station to infer line from
 * @param lineHistory - Array of recently detected lines
 * @returns The inferred LineId, or first available line
 */
export function inferLineFromStation(
  station: Station,
  lineHistory: LineId[]
): LineId {
  if (station.lines.length === 0) {
    throw new Error(`Station ${station.id} has no lines`);
  }

  // If station is on only one line, return it
  if (station.lines.length === 1) {
    return station.lines[0];
  }

  // For multi-line stations, use the most common line from history
  const mostCommonLine = getMostCommonValue(lineHistory);
  if (mostCommonLine && station.lines.includes(mostCommonLine)) {
    return mostCommonLine;
  }

  // Fallback to first available line
  return station.lines[0];
}
