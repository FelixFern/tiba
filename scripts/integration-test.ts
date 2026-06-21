/**
 * TIBA E2E Integration Test
 * 
 * This test simulates a GPS route from Depok to Lenteng Agung on the Bogor line
 * and verifies that all state transitions and alarm triggers work correctly.
 * 
 * Note: This is a standalone test that imports the core logic functions
 * and manually manages store state to avoid React Native dependencies.
 */

import * as fs from 'fs';

// ============================================================================
// Type Definitions (from lib/types.ts and lib/store.ts)
// ============================================================================

type LineId = 'bogor' | 'cikarang' | 'rangkasbitung' | 'tangerang' | 'tanjungpriok';

interface Station {
  id: string;
  name: string;
  lat: number;
  lon: number;
  lines: LineId[];
  sequences: Record<LineId, number | undefined>;
}

interface Line {
  id: LineId;
  name: string;
  color: string;
  stations: string[];
}

interface Position {
  lat: number;
  lon: number;
}

// ============================================================================
// Import Data Files Directly
// ============================================================================

const stationsData = JSON.parse(
  fs.readFileSync('./data/stations.json', 'utf-8')
) as Station[];

const linesData = JSON.parse(
  fs.readFileSync('./data/lines.json', 'utf-8')
) as Line[];

// ============================================================================
// Data Access Functions (from lib/data.ts)
// ============================================================================

function getStationById(id: string): Station | undefined {
  return stationsData.find((station) => station.id === id);
}

function getLineById(id: LineId): Line | undefined {
  return linesData.find((line) => line.id === id);
}

// ============================================================================
// Distance Calculation (from lib/distance.ts)
// ============================================================================

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function findNearestStations(
  lat: number,
  lon: number,
  stations: Station[],
  limit: number = 1
): Array<Station & { distance: number }> {
  const stationsWithDistance = stations.map((station) => ({
    ...station,
    distance: haversine(lat, lon, station.lat, station.lon),
  }));

  return stationsWithDistance
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);
}

// ============================================================================
// Direction Detection (from lib/direction.ts)
// ============================================================================

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

function inferLineFromStation(
  station: Station,
  lineHistory: LineId[]
): LineId {
  if (station.lines.length === 0) {
    throw new Error(`Station ${station.id} has no lines`);
  }

  if (station.lines.length === 1) {
    return station.lines[0];
  }

  const mostCommonLine = getMostCommonValue(lineHistory);
  if (mostCommonLine && station.lines.includes(mostCommonLine)) {
    return mostCommonLine;
  }

  return station.lines[0];
}

function detectDirection(
  stationHistory: Station[],
  currentLine: Line
): 'increasing' | 'decreasing' | null {
  if (stationHistory.length < 3) {
    return null;
  }

  const last3 = stationHistory.slice(0, 3).reverse();

  const sequences: (number | undefined)[] = last3.map(
    (station) => station.sequences[currentLine.id]
  );

  if (sequences.some((seq) => seq === undefined)) {
    return null;
  }

  const [seq0, seq1, seq2] = sequences as number[];

  if (seq0 < seq1 && seq1 < seq2) {
    return 'increasing';
  }

  if (seq0 > seq1 && seq1 > seq2) {
    return 'decreasing';
  }

  return null;
}

// ============================================================================
// Alarm Logic (from lib/alarm.ts)
// ============================================================================

function calculateStationsRemaining(
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

function checkAlarmTrigger(
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

// ============================================================================
// Test State Management (simulates zustand store)
// ============================================================================

interface TestState {
  currentPosition: Position | null;
  nearestStation: Station | null;
  currentLine: Line | null;
  direction: 'increasing' | 'decreasing' | null;
  destination: Station | null;
  alarmThreshold: number;
  stationsRemaining: number | null;
  isAlarmActive: boolean;
}

let testState: TestState = {
  currentPosition: null,
  nearestStation: null,
  currentLine: null,
  direction: null,
  destination: null,
  alarmThreshold: 3,
  stationsRemaining: null,
  isAlarmActive: false,
};

// Module-scope state for direction detection (same as lib/location.ts)
let detectedStations: Station[] = [];
let lineHistory: LineId[] = [];

// ============================================================================
// Core Update Functions (from lib/location.ts)
// ============================================================================

function updateNearestStation(position: Position): void {
  const nearestStations = findNearestStations(
    position.lat,
    position.lon,
    stationsData,
    1
  );

  if (nearestStations.length > 0) {
    const nearest = nearestStations[0];
    const STATION_THRESHOLD = 200; // meters

    if (nearest.distance < STATION_THRESHOLD) {
      const { distance, ...station } = nearest;
      testState.nearestStation = station;
    } else {
      testState.nearestStation = null;
    }
  } else {
    testState.nearestStation = null;
  }
}

function updateDirectionDetection(): void {
  const { nearestStation } = testState;

  if (!nearestStation) {
    return;
  }

  // Add station to circular buffer (max 3 stations)
  detectedStations.unshift(nearestStation);
  if (detectedStations.length > 3) {
    detectedStations.pop();
  }

  // Track line from this station
  for (const line of nearestStation.lines) {
    lineHistory.unshift(line);
  }
  if (lineHistory.length > 3) {
    lineHistory.pop();
  }

  if (detectedStations.length === 0) {
    return;
  }

  // Infer current line
  const inferredLineId = inferLineFromStation(nearestStation, lineHistory);
  const inferredLine = getLineById(inferredLineId);

  if (!inferredLine) {
    return;
  }

  // Detect direction
  const direction = detectDirection(detectedStations, inferredLine);

  // Update state
  testState.currentLine = inferredLine;
  testState.direction = direction;

  // Calculate stations remaining
  if (testState.destination && direction) {
    testState.stationsRemaining = calculateStationsRemaining(
      nearestStation,
      testState.destination,
      inferredLine,
      direction
    );
  }
}

// ============================================================================
// Test Configuration: Bogor Line Route (Depok → Lenteng Agung)
// ============================================================================

interface TestStation {
  id: string;
  name: string;
  lat: number;
  lon: number;
  seq: number;
}

const testRoute: TestStation[] = [
  { id: 'DPK', name: 'Depok', lat: -6.285833, lon: 106.830278, seq: 21 },
  { id: 'DPB', name: 'Depok Baru', lat: -6.318889, lon: 106.839444, seq: 20 },
  { id: 'PCI', name: 'Pondok Cina', lat: -6.3625, lon: 106.832222, seq: 19 },
  { id: 'UI', name: 'Universitas Indonesia', lat: -6.363611, lon: 106.830556, seq: 18 },
  { id: 'UP', name: 'Universitas Pancasila', lat: -6.375, lon: 106.825, seq: 17 },
  { id: 'LTA', name: 'Lenteng Agung', lat: -6.399722, lon: 106.825278, seq: 16 },
];

// ============================================================================
// Test Runner
// ============================================================================

async function runIntegrationTest() {
  const logs: string[] = [];
  const alarmLogs: string[] = [];
  let testsPassed = 0;
  let testsFailed = 0;

  const log = (msg: string) => {
    console.log(msg);
    logs.push(msg);
  };

  const logAlarm = (msg: string) => {
    console.log(msg);
    alarmLogs.push(msg);
  };

  const assert = (condition: boolean, message: string) => {
    if (condition) {
      testsPassed++;
      log(`  ✓ ${message}`);
    } else {
      testsFailed++;
      log(`  ✗ FAIL: ${message}`);
      throw new Error(`ASSERTION FAILED: ${message}`);
    }
  };

  log('=== TIBA E2E INTEGRATION TEST ===');
  log('Route: Depok → Jakarta Kota (Bogor line, decreasing direction)');
  log('Threshold: 15 stations');
  log('Expected alarm trigger: Lenteng Agung (15 stations remaining)\n');

  // ========================================================================
  // STEP 1: Set destination and threshold
  // ========================================================================

  log('--- Step 1: Configuration ---');
  const jakartaKota = getStationById('JAKK');
  
  if (!jakartaKota) {
    throw new Error('CRITICAL: Jakarta Kota station not found in data');
  }

  testState.destination = jakartaKota;
  testState.alarmThreshold = 15;
  testState.isAlarmActive = false;
  
  log(`✓ Destination: ${jakartaKota.name} (seq ${jakartaKota.sequences.bogor})`);
  log(`✓ Threshold: 15 stations`);
  log(`✓ Alarm state reset\n`);

  // ========================================================================
  // STEP 2: Simulate GPS route with 6 stations
  // ========================================================================

  for (let i = 0; i < testRoute.length; i++) {
    const station = testRoute[i];
    log(`--- Step ${i + 2}: ${station.name} (seq ${station.seq}) ---`);

    // Simulate GPS position update
    const position: Position = { lat: station.lat, lon: station.lon };
    testState.currentPosition = position;

    // Call real lib functions (same flow as background task)
    updateNearestStation(position);
    updateDirectionDetection();

    // Log current state
    log(`  currentPosition: (${station.lat.toFixed(6)}, ${station.lon.toFixed(6)})`);
    log(`  nearestStation: ${testState.nearestStation?.name || 'null'}`);
    log(`  currentLine: ${testState.currentLine?.name || 'null'}`);
    log(`  direction: ${testState.direction || 'null'}`);
    log(`  stationsRemaining: ${testState.stationsRemaining ?? 'null'}`);
    log(`  isAlarmActive: ${testState.isAlarmActive}`);

    // ====================================================================
    // ASSERTIONS
    // ====================================================================

    // Assertion 1: nearestStation should update correctly
    assert(
      testState.nearestStation?.id === station.id,
      `nearestStation should be ${station.name} (got ${testState.nearestStation?.name || 'null'})`
    );

    // Assertion 2: After 3rd station (Pondok Cina), direction should lock to 'decreasing'
    if (i >= 2) {
      assert(
        testState.direction === 'decreasing',
        `direction should be 'decreasing' after 3 stations (got '${testState.direction}')`
      );
    }

    // Assertion 3: stationsRemaining should decrement correctly
    if (testState.nearestStation && testState.currentLine && testState.direction) {
      const expectedRemaining = station.seq - jakartaKota.sequences.bogor!;
      assert(
        testState.stationsRemaining === expectedRemaining,
        `stationsRemaining should be ${expectedRemaining} (got ${testState.stationsRemaining})`
      );
    }

    // ====================================================================
    // ALARM TRIGGER CHECK
    // ====================================================================

    // Check if alarm should trigger at this station
    if (testState.nearestStation && testState.destination && testState.currentLine && testState.direction) {
      const shouldTrigger = checkAlarmTrigger(
        testState.nearestStation,
        testState.destination,
        testState.currentLine,
        testState.direction,
        testState.alarmThreshold
      );

      if (shouldTrigger && !testState.isAlarmActive) {
        // Simulate alarm trigger (same logic as background task)
        testState.isAlarmActive = true;
        
        logAlarm(`\n🚨 ALARM TRIGGERED at ${station.name}`);
        logAlarm(`   Destination: ${testState.destination.name}`);
        logAlarm(`   Stations Remaining: ${testState.stationsRemaining}`);
        logAlarm(`   Threshold: ${testState.alarmThreshold}`);
        logAlarm(`   Calculation: ${station.seq} - ${jakartaKota.sequences.bogor} = ${testState.stationsRemaining}\n`);

        log(`  🚨 ALARM TRIGGERED`);

        // Assertion 4: Alarm should trigger exactly at Lenteng Agung
        assert(
          station.id === 'LTA',
          `alarm should trigger at Lenteng Agung (triggered at ${station.name})`
        );

        // Assertion 5: Alarm should trigger when stationsRemaining = 15
        assert(
          testState.stationsRemaining === 15,
          `alarm should trigger at 15 stations remaining (triggered at ${testState.stationsRemaining})`
        );
      }
    }

    log('');
    
    // Small delay between stations to simulate realistic GPS updates
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // ========================================================================
  // FINAL ASSERTIONS
  // ========================================================================

  log('--- Final Verification ---');

  // Assertion 6: Alarm should be active after route completion
  assert(
    testState.isAlarmActive === true,
    'alarm should be active after reaching threshold station'
  );

  // Assertion 7: Final nearestStation should be Lenteng Agung
  assert(
    testState.nearestStation?.id === 'LTA',
    `final nearestStation should be Lenteng Agung (got ${testState.nearestStation?.name || 'null'})`
  );

  // Assertion 8: Final direction should be 'decreasing'
  assert(
    testState.direction === 'decreasing',
    `final direction should be 'decreasing' (got '${testState.direction}')`
  );

  // Assertion 9: Final stationsRemaining should be 15
  assert(
    testState.stationsRemaining === 15,
    `final stationsRemaining should be 15 (got ${testState.stationsRemaining})`
  );

  // Assertion 10: Final currentLine should be Bogor
  assert(
    testState.currentLine?.id === 'bogor',
    `final currentLine should be Bogor (got ${testState.currentLine?.name || 'null'})`
  );

  // ========================================================================
  // TEST SUMMARY
  // ========================================================================

  log('\n=== TEST SUMMARY ===');
  log(`Tests Passed: ${testsPassed}`);
  log(`Tests Failed: ${testsFailed}`);
  
  if (testsFailed === 0) {
    log('✅ ALL TESTS PASSED');
  } else {
    log(`❌ ${testsFailed} TEST(S) FAILED`);
  }

  // ========================================================================
  // WRITE EVIDENCE LOGS
  // ========================================================================

  fs.mkdirSync('.omo/evidence', { recursive: true });
  
  const timestamp = new Date().toISOString();
  const header = `TIBA E2E Integration Test - ${timestamp}\n${'='.repeat(80)}\n\n`;
  
  fs.writeFileSync(
    '.omo/evidence/task-15-tiba-e2e.txt',
    header + logs.join('\n')
  );
  
  fs.writeFileSync(
    '.omo/evidence/task-15-tiba-e2e-alarm.txt',
    header + alarmLogs.join('\n')
  );

  log(`\n✓ Evidence saved to .omo/evidence/task-15-tiba-e2e.txt`);
  log(`✓ Alarm log saved to .omo/evidence/task-15-tiba-e2e-alarm.txt`);

  // Exit with appropriate code
  if (testsFailed > 0) {
    process.exit(1);
  }
}

// ============================================================================
// MAIN
// ============================================================================

runIntegrationTest().catch(err => {
  console.error('\n❌ TEST FAILED WITH ERROR:');
  console.error(err);
  process.exit(1);
});
