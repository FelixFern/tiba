# T8: Background Location Task Implementation

## Overview
Successfully implemented background location tracking with persistent notification showing live station information.

## Files Created
- `lib/background-location.ts`: Complete background location task implementation

## Files Modified
- `app.json`: Added iOS UIBackgroundModes, Android permissions, and expo-location plugin config

## Key Implementation Details

### Background Task Definition (TaskManager.defineTask)
- Task name: `TIBA_LOCATION_TASK`
- Receives location updates via TaskManager
- Calls `updateNearestStation()` and `updateDirectionDetection()` on each location update
- Calculates `stationsRemaining` when destination is set
- Updates notification only when station changes (debounced by station ID)

### Notification Format
- With station and destination: "Manggarai → Bogor • 5 stations left"
- With station only: "At Manggarai"
- Detecting with destination: "Detecting location... → Bogor"
- No station, no destination: "Detecting location..."
- Notification color: #3B82F6 (monoAccent)

### Permission Flow
1. Request foreground permissions first
2. Then request background permissions
3. Start location updates with foreground service config

### Foreground Service Config
- Android: Uses `foregroundService` option with notification title/body/color
- iOS: Shows background location indicator
- Accuracy: Balanced (not High - battery optimization)
- Distance interval: 50 meters

### App Config (app.json)
- iOS: `UIBackgroundModes: ["location"]` in `infoPlist`
- Android: Added `ACCESS_BACKGROUND_LOCATION`, `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_LOCATION` permissions
- expo-location plugin: Enabled background location for both iOS and Android
- Custom permission message: "Allow Tiba to use your location to track your train journey."

## TypeScript Types
- Created `LocationTaskData` interface with `locations: Location.LocationObject[]`
- Used `LineId` type for `calculateStationsRemaining` to fix type safety
- Used `TaskManager.TaskManagerTaskBody<LocationTaskData>` for task executor

## Functions Exported
1. `startBackgroundTracking()`: Requests permissions, starts location task
2. `stopBackgroundTracking()`: Stops task and cleans up
3. `updateLiveNotification()`: Updates notification content

## Module Scope Task Definition
The `TaskManager.defineTask()` call is made at module scope (not inside a function) as required by expo-task-manager. This ensures the task is registered before any navigation runs.

## Verification
- TypeScript compilation: No errors in lib/background-location.ts
- All imports correctly typed
- All functions match plan requirements

---

# T9: Alarm Trigger Logic Implementation

## Overview
Successfully implemented alarm trigger logic with comprehensive unit tests. The module exports two functions for calculating stations remaining and checking alarm trigger conditions.

## Files Created
- `lib/alarm.ts`: Alarm trigger logic with `checkAlarmTrigger()` and `calculateStationsRemaining()`
- `__tests__/alarm.test.ts`: 20 comprehensive unit tests with 97.87% coverage

## Key Implementation Details

### checkAlarmTrigger(currentStation, destination, line, direction, threshold): boolean
- Returns false if ANY parameter is null/undefined
- Gets sequences from `currentStation.sequences[line.id]` and `destination.sequences[line.id]`
- Calculates: `direction === 'increasing' ? destSeq - currentSeq : currentSeq - destSeq`
- Returns true ONLY if: `stationsRemaining > 0 AND stationsRemaining <= threshold`
- Otherwise returns false

### calculateStationsRemaining(currentStation, destination, line, direction): number | null
- Helper function for calculating stations remaining
- Returns null if any parameter is null/missing
- Returns null if station doesn't have sequence for the line
- Returns null for invalid direction (only 'increasing' or 'decreasing' valid)

## Test Coverage
- Total tests: 20 (all passing)
- Code coverage: 97.87%
- Functions: 100% covered
- Lines: 97.87% covered (line 34 unreachable return null)

## Test Cases

### calculateStationsRemaining tests:
1. ✅ Calculates correct stations remaining when increasing direction
2. ✅ Calculates correct stations remaining when decreasing direction
3. ✅ Returns null if currentStation is null
4. ✅ Returns null if destination is null
5. ✅ Returns null if line is null
6. ✅ Returns null if station does not have sequence for line
7. ✅ Returns null for invalid direction

### checkAlarmTrigger tests:
8. ✅ Returns false when 17 stations left and threshold is 3 (no trigger)
9. ✅ Returns true when 2 stations left and threshold is 3 (trigger)
10. ✅ Returns false when 20 stations left (decreasing) and threshold is 5 (no trigger)
11. ✅ Returns true when 4 stations left (decreasing) and threshold is 5 (trigger)
12. ✅ Returns false when destination is null
13. ✅ Returns false when currentStation is null
14. ✅ Returns false when line is null
15. ✅ Returns false when direction is null
16. ✅ Returns false when threshold is null
17. ✅ Returns false when at destination (0 stations remaining)
18. ✅ Returns false when past destination (negative stations)
19. ✅ Returns true when exactly at threshold
20. ✅ Returns false when 1 station above threshold

## Test Data Mapping (from data/stations.json)
- Jakarta Kota (JAKK): bogor line seq 1
- Cikini (CKN): bogor line seq 4 (corrected from plan's seq 8)
- Kramat (KRT): bogor line seq 5
- Depok (DPK): bogor line seq 21
- Gedang (GDG): bogor line seq 23
- Bogor (BOG): bogor line seq 25
- Juanda (JUR): tanjungpriok line seq 1 (used in edge case test)

## Edge Cases Covered
- Null/undefined parameters
- Station at destination (0 remaining)
- Station past destination (negative remaining)
- Missing line sequence for station
- Exactly at threshold
- Just above threshold
- Invalid direction values
- Threshold edge cases

## Exports
- `checkAlarmTrigger()`: Main public function for alarm trigger check
- `calculateStationsRemaining()`: Helper function for calculations

## Notes
- No console.log statements added
- No async/await needed (synchronous calculations)
- Type-safe with proper null handling
- Ready for integration with notification system (T11)
