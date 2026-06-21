# tiba - Work Plan

## TL;DR (For humans)
<!-- Fill this LAST, after the detailed plan below is written, so it summarizes the REAL plan. -->
<!-- Plain English for a non-engineer: NO file paths, NO todo numbers, NO wave/agent/tool names. -->

**What you'll get:** A React Native app that tracks your location on Jakarta's KRL trains, shows which station you're at, and wakes you up with a loud alarm when you're about to reach your destination — all working 100% offline.

**Why this approach:** Background GPS with smart distance math (no maps needed) means zero network dependency and minimal battery drain. Full-screen alarm with vibration ensures sleeping commuters actually wake up. Auto-direction detection means you just pick a destination and go — no manual route input.

**What it will NOT do:** No live train schedules, no maps, no user accounts. Just GPS tracking and alarms. Perfect for daily commuters who know the routes but tend to fall asleep.

**Effort:** Medium (15 tasks, ~5 implementation waves)
**Risk:** Medium - Background location permissions can be tricky; GPS accuracy in urban canyons may trigger alarms early/late by one station
**Decisions to sanity-check:** Full-screen alarm (not gentle notification), auto-detect direction (not manual input), Expo framework (not bare React Native)

Your next move: Plan is complete. Review the 15 todos below, then approve to begin execution. Alternatively, request high-accuracy review from Momus if you want extra scrutiny before starting.

---

> TL;DR (machine): Medium effort, medium risk — 15 tasks building offline-first KRL alarm app with background GPS, auto-direction detection, full-screen alarms, and live notification countdown. Expo + TypeScript + Zustand + MMKV + expo-location + expo-notifications. Mono-style design. Tests-after with ≥95% coverage on critical logic.

## Scope

### Must have
- 100% offline core functionality (GPS, distance calculation, alarm trigger)
- Background location tracking on iOS and Android
- Full-screen alarm modal that wakes sleeping users (vibration + sound + bypasses Do Not Disturb)
- Persistent notification displaying current station and stations remaining (updated live during tracking)
- Auto-detect travel direction from GPS (analyze station sequence progression)
- "N stations before destination" configurable alarm threshold (1-10 stations, default 3)
- Mono-style design: monospace typography (JetBrains Mono), high contrast (#0A0A0A bg, #FAFAFA fg), generous whitespace (8px grid, 24px margins), sharp edges (0-4px border-radius)
- All 93 KRL Jabodetabek stations with accurate WGS84 coordinates
- 5 KRL lines with official colors (Bogor #E53935, Cikarang #1E88E5, Rangkasbitung #43A047, Tangerang #6D4C41, Tanjung Priok #EC407A)
- Works on Expo development builds (not Expo Go)
- Cross-platform: iOS and Android
- Permission handling: iOS "Always Allow" location, Android FOREGROUND_SERVICE_LOCATION
- Persistent storage: user preferences (destination, alarm threshold) survive app restart

### Must NOT have (guardrails, anti-slop, scope boundaries)
- NO Google Maps or any map rendering library (pure coordinate math only)
- NO live train schedules or ETA predictions (static station data only)
- NO user accounts, authentication, or backend server
- NO social features, sharing, or multi-user trip planning
- NO route planning beyond "select destination station"
- NO multi-destination alarms (one active trip at a time)
- NO support for Expo Go (background location requires development build)
- NO analytics, crash reporting, or telemetry in MVP
- NO external API calls during core flow (fully offline)
- NO work in React Native CLI bare workflow (Expo only)
- NO UI component libraries (NativeBase, React Native Paper, Tailwind) — use StyleSheet.create
- NO duplicate alarm triggers (debounce with state tracking)
- NO alarm auto-dismissal timeout (user must explicitly dismiss)

## Verification strategy
> Zero human intervention - all verification is agent-executed.
- **Test decision**: Tests-after with Jest + @testing-library/react-native
- **Coverage targets**: 
  - lib/distance.ts → ≥95% (critical math)
  - lib/direction.ts → ≥95% (core algorithm)
  - lib/alarm.ts → ≥95% (trigger logic)
  - UI components → snapshot tests only
- **Integration testing**: End-to-end test with simulated GPS route (task 15)
- **Manual QA**: Simulated GPS movement on iOS/Android simulators + real device testing for background location
- **Evidence**: .omo/evidence/task-<N>-tiba.<ext> (test outputs, coverage reports, screen recordings, screenshots)

## Execution strategy

### Parallel execution waves
> Target 5-8 todos per wave. Fewer than 3 (except the final) means you under-split.

- **Wave 1: Foundation** (5 tasks) — Expo init, station data, distance functions, Zustand store, UI shell
- **Wave 2: Location & Direction** (3 tasks) — Foreground GPS, direction detection, background task + live notification
- **Wave 3: Alarm System** (3 tasks) — Trigger logic, full-screen modal, integration with background task
- **Wave 4: UI Implementation** (3 tasks) — Home screen, alarm config screen, settings screen
- **Wave 5: Final QA** (1 task) — E2E integration test with simulated GPS route

### Dependency matrix
| Todo | Depends on | Blocks | Can parallelize with |
| --- | --- | --- | --- |
| T1 (Expo init) | none | T2-T15 | none (must complete first) |
| T2 (Station data) | T1 | T3, T6, T7, T8, T9, T13 | T4, T5 |
| T3 (Distance calc) | T2 | T6 | T4, T5 |
| T4 (Zustand store) | T1 | T6, T7, T8, T9, T10, T11 | T2, T3, T5 |
| T5 (UI shell) | T1 | T10, T11, T12, T13, T14 | T2, T3, T4 |
| T6 (Foreground GPS) | T2, T3, T4 | T7, T12 | none (Wave 2 start) |
| T7 (Direction detection) | T2, T4, T6 | T8 | none |
| T8 (Background + notification) | T4, T6, T7 | T11, T12, T13 | none |
| T9 (Alarm trigger logic) | T2, T4 | T10 | none (Wave 3 start) |
| T10 (Alarm modal UI) | T4, T5, T9 | T11 | none |
| T11 (Alarm integration) | T8, T9, T10 | none | none |
| T12 (Home screen UI) | T5, T6, T8 | none | T13, T14 (Wave 4) |
| T13 (Alarm config UI) | T2, T5, T8 | none | T12, T14 (Wave 4) |
| T14 (Settings UI) | T5 | none | T12, T13 (Wave 4) |
| T15 (E2E QA) | T1-T14 | none | none (Wave 5) |

## Todos
> Implementation + Test = ONE todo. Never separate.
<!-- APPEND TASK BATCHES BELOW THIS LINE WITH edit/apply_patch - never rewrite the headers above. -->

### Wave 1: Foundation & Data

- [x] 1. Initialize Expo project with TypeScript strict mode and install core dependencies
  **What to do**: Create Expo app with TypeScript template, install Zustand, MMKV, expo-location, expo-task-manager, expo-notifications, expo-router. Configure Bun as package manager. Set up strict TypeScript config. Configure Metro bundler for JSON imports. Add JetBrains Mono font files to assets/fonts/. Must NOT: Install react-native-cli, add react-navigation (use expo-router only), add any map libraries (Google Maps, Mapbox), add backend dependencies (Firebase, Supabase), add analytics.
  **Parallelization**: Wave 1 | Blocked by: none | Blocks: all other tasks
  **References**: Expo docs (https://docs.expo.dev/get-started/create-a-project/), expo-router setup (https://docs.expo.dev/router/installation/), Zustand docs (https://zustand-demo.pmnd.rs/), MMKV setup (https://github.com/mrousavy/react-native-mmkv), JetBrains Mono font (https://www.jetbrains.com/lp/mono/)
  **Acceptance criteria**: `bun install` succeeds, `npx expo start` launches dev server, TypeScript strict mode enabled in tsconfig.json, expo-router tabs render, JetBrains Mono font loads
  **QA scenarios**: Run `bun install && npx expo start`, verify no TypeScript errors, verify Metro bundler resolves JSON imports, verify font loads in basic Text component. Evidence: .omo/evidence/task-1-tiba-init.txt (terminal output showing successful start)
  **Commit**: Y | chore(init): initialize Expo project with core dependencies

- [x] 2. Create KRL station data module with 93 stations from research findings
  **What to do**: Create data/stations.json with all 93 KRL stations (exact coordinates from research: Bogor Line 25 stations, Cikarang Loop 29, Rangkasbitung 19, Tangerang 11, Tanjung Priok 4). Create data/lines.json with 5 line definitions (id, name, color from KRL official palette, ordered station IDs). Create lib/types.ts with Station, Line, LineId interfaces. Create lib/data.ts that imports JSON and exports typed station/line lookups (getStationById, getLineById, getAllStations, getStationsByLine). Must NOT: Fetch data from external API, include inactive/planned stations, hardcode coordinates in TypeScript (use JSON), add route planning logic.
  **Parallelization**: Wave 1 | Blocked by: task 1 | Blocks: tasks 3, 6, 7, 8
  **References**: Research data from .omo/drafts/tiba.md "KRL Station Data" section with exact coordinates, Station schema: {id, name, lat, lon, lines, sequences}, Line schema: {id, name, color, stations}, Official KRL colors: Bogor #E53935, Cikarang #1E88E5, Rangkasbitung #43A047, Tangerang #6D4C41, Tanjung Priok #EC407A
  **Acceptance criteria**: data/stations.json contains exactly 93 station objects, data/lines.json contains exactly 5 line objects, lib/data.ts exports getStationById("MRI") returns Manggarai station, getLineById("bogor").stations.length === 25
  **QA scenarios**: Import lib/data.ts and verify: getAllStations().length === 93, getStationById("JAKK").name === "Jakarta Kota", getLineById("bogor").color === "#E53935", getStationById("MRI").lines includes both "bogor" and "cikarang", getStationById("CTA").sequences.bogor === 22 (Citayam is 22nd on Bogor line). Evidence: .omo/evidence/task-2-tiba-data.json (JSON output of verification queries)
  **Commit**: Y | feat(data): add KRL station and line data module

- [x] 3. Implement distance calculation functions (Haversine + Equirectangular) with unit tests
  **What to do**: Create lib/distance.ts with haversine(lat1, lon1, lat2, lon2): number returning meters using great-circle formula (R=6371000m, convert degrees to radians, use atan2). Implement equirectangular(lat1, lon1, lat2, lon2): number for fast approximate distance using cos(avgLat) correction. Implement findNearestStations(lat, lon, stations, limit=5): Station[] that sorts all stations by equirectangular distance and returns top N. Create __tests__/distance.test.ts with tests: (1) haversine Jakarta Kota to Manggarai ≈ 7800m ±50m, (2) haversine Bogor to Nambo ≈ 15000m ±100m, (3) equirectangular vs haversine error <1% for distances <5km at Jakarta latitude, (4) findNearestStations from Manggarai position returns [Manggarai, Tebet, Cawang, Cikini, Gondangdia]. Must NOT: Use external geocoding libraries (geolib, turf.js), call external APIs, implement Vincenty formula (overkill), use Euclidean distance on raw lat/lon.
  **Parallelization**: Wave 1 | Blocked by: task 2 | Blocks: task 6
  **References**: Haversine formula: a = sin²(Δφ/2) + cos φ1 × cos φ2 × sin²(Δλ/2), c = 2 × atan2(√a, √(1−a)), d = R × c. Equirectangular: x = Δλ × cos((φ1+φ2)/2), y = Δφ, d = R × √(x²+y²). Test coordinates: Jakarta Kota (-6.137499, 106.813904), Manggarai (-6.210556, 106.850278), Bogor (-6.594167, 106.790833), Nambo (-6.528056, 106.916944)
  **Acceptance criteria**: `bun test distance.test.ts` passes all 4 tests, test coverage ≥95% for lib/distance.ts
  **QA scenarios**: Run Jest tests, verify haversine(Manggarai coords, Tebet coords) ≈ 1800m ±50m, verify findNearestStations from coordinates halfway between Cikini and Manggarai returns Cikini as #1 or #2. Evidence: .omo/evidence/task-3-tiba-distance-test.txt (Jest output), .omo/evidence/task-3-tiba-coverage.json (coverage report)
  **Commit**: Y | feat(distance): implement Haversine and Equirectangular distance functions

- [x] 4. Set up Zustand store with location, trip, and settings state
  **What to do**: Create lib/store.ts with Zustand store containing: LocationState (currentPosition {lat,lon}|null, nearestStation Station|null, currentLine Line|null, direction 'increasing'|'decreasing'|null, stationHistory Station[] for direction detection), TripState (destination Station|null, alarmThreshold number default 3, isAlarmActive boolean, stationsRemaining number|null), SettingsState (isTracking boolean, hasLocationPermission boolean, hasNotificationPermission boolean). Add actions: setCurrentPosition, setNearestStation, setCurrentLine, setDirection, updateStationHistory, setDestination, setAlarmThreshold, setIsAlarmActive, setStationsRemaining, toggleTracking, setPermissions. Persist destination and alarmThreshold to MMKV. Must NOT: Store GPS history in state (use circular buffer in direction detection), persist currentPosition to storage (transient), add backend sync logic.
  **Parallelization**: Wave 1 | Blocked by: task 1 | Blocks: tasks 6, 7, 8, 9, 10, 11
  **References**: Zustand create() with TypeScript types, MMKV storage.set/get for persistence, State shape from research draft: LocationState + TripState + SettingsState
  **Acceptance criteria**: Import useTibaStore from lib/store.ts, verify store.getState() returns correct shape, verify setDestination persists to MMKV, verify MMKV.getString('destination') retrieves after app restart simulation
  **QA scenarios**: Create store instance, call setDestination with station ID, verify MMKV storage, call setCurrentPosition with coordinates, verify state updates, call setAlarmThreshold(5), restart app simulation (clear state, reload from MMKV), verify threshold persists. Evidence: .omo/evidence/task-4-tiba-store.txt (state snapshots before/after actions)
  **Commit**: Y | feat(store): add Zustand store with MMKV persistence

- [x] 5. Create basic UI shell with Expo Router tabs and mono-style theme
  **What to do**: Create app/_layout.tsx with Expo Router root layout, load JetBrains Mono font with useFonts. Create app/(tabs)/_layout.tsx with bottom tabs: Home (index), Alarm config (alarm), Settings (settings). Create app/(tabs)/index.tsx with placeholder "Home" text in JetBrains Mono. Create app/(tabs)/alarm.tsx with placeholder "Alarm". Create app/(tabs)/settings.tsx with placeholder "Settings". Create lib/theme.ts exporting colors (monoBg #0A0A0A, monoFg #FAFAFA, monoGray1 #2A2A2A, monoGray2 #4A4A4A, monoAccent #3B82F6, monoDanger #EF4444) and line colors (bogor #E53935, cikarang #1E88E5, rangkasbitung #43A047, tangerang #6D4C41, tanjungPriok #EC407A). Apply dark background globally. Must NOT: Use Tailwind/NativeWind (use StyleSheet.create), add UI component libraries (NativeBase, React Native Paper), implement navigation animations yet, add map views.
  **Parallelization**: Wave 1 | Blocked by: task 1 | Blocks: tasks 10, 11, 12
  **References**: Expo Router tabs (https://docs.expo.dev/router/advanced/tabs/), useFonts (https://docs.expo.dev/develop/user-interface/fonts/), StyleSheet.create with TypeScript, Color palette from design system: mono-bg #0A0A0A, mono-fg #FAFAFA
  **Acceptance criteria**: `npx expo start` renders 3 tabs, JetBrains Mono font displays, background is #0A0A0A, tab labels render in monoFg color
  **QA scenarios**: Launch app on iOS/Android simulator, tap each tab, verify tab switches, verify JetBrains Mono font renders in tab labels, verify dark background. Evidence: .omo/evidence/task-5-tiba-shell.png (screenshot of 3 tabs)
  **Commit**: Y | feat(ui): create Expo Router tabs shell with mono-style theme

### Wave 2: Location & Direction Detection

- [x] 6. Implement foreground location tracking with permissions and nearest station detection
  **What to do**: Create lib/location.ts with requestLocationPermissions(): Promise<boolean> using expo-location (requestForegroundPermissionsAsync for iOS/Android). Implement startForegroundTracking() that calls Location.watchPositionAsync with Accuracy.Balanced, distanceInterval 50m, updates Zustand store currentPosition on each location update. Implement updateNearestStation(position) that calls findNearestStations, gets top 1 station, if distance <200m sets as nearestStation in store, otherwise sets null. Add stopForegroundTracking() to cleanup. Must NOT: Request background permissions yet (Wave 3), use high accuracy (battery drain), poll location on interval (use watchPositionAsync), store raw GPS history.
  **Parallelization**: Wave 2 | Blocked by: tasks 2, 3, 4 | Blocks: task 7
  **References**: expo-location requestForegroundPermissionsAsync (https://docs.expo.dev/versions/latest/sdk/location/#locationrequestforegroundpermissionsasync), watchPositionAsync with options {accuracy: Accuracy.Balanced, distanceInterval: 50}, findNearestStations from task 3, 200m threshold for "at station" detection
  **Acceptance criteria**: Run on device/simulator, call requestLocationPermissions(), verify iOS shows "While Using" prompt, call startForegroundTracking(), move device/change simulator location, verify useTibaStore().currentPosition updates, verify nearestStation updates when within 200m of station coordinates
  **QA scenarios**: Simulate GPS movement from Manggarai to Tebet (use Xcode simulator location or Android emulator extended controls), verify currentPosition updates every 50m movement, verify nearestStation changes from Manggarai to Tebet when crossing midpoint, verify nearestStation becomes null when >200m from any station. Evidence: .omo/evidence/task-6-tiba-location.txt (console log of position/nearestStation updates during simulated movement)
  **Commit**: Y | feat(location): add foreground GPS tracking and nearest station detection

- [x] 7. Implement direction detection algorithm from station sequence history
  **What to do**: Create lib/direction.ts with detectDirection(stationHistory: Station[], currentLine: Line): 'increasing'|'decreasing'|null. Algorithm: (1) Take last 3 stations from history, (2) Map each to sequence number on currentLine using station.sequences[line.id], (3) If seq[0] < seq[1] < seq[2] return 'increasing', (4) If seq[0] > seq[1] > seq[2] return 'decreasing', (5) Otherwise return null (inconsistent). Create updateDirectionDetection() in lib/location.ts that: maintains circular buffer of last 3 nearestStation detections, infers currentLine from station.lines (pick most common line in history), calls detectDirection, updates store. Create __tests__/direction.test.ts with tests: (1) Sequence [Cikini seq=8, Manggarai seq=9, Tebet seq=10] on Bogor line returns 'increasing', (2) Sequence [Tebet seq=10, Manggarai seq=9, Cikini seq=8] returns 'decreasing', (3) Sequence [Manggarai, Kramat, Manggarai] returns null, (4) Multi-line station Manggarai detects correct line from 2+ readings. Must NOT: Use GPS bearing (unreliable in urban areas), require manual destination input, assume single line (handle Manggarai 3-line hub).
  **Parallelization**: Wave 2 | Blocked by: tasks 2, 4, 6 | Blocks: task 8
  **References**: Station sequence numbers from data/stations.json sequences field, Circular buffer: maintain array of max 3 stations, push new and shift old, Direction detection from draft: compare seq[n] vs seq[n-1] vs seq[n-2], Multi-line hubs: Manggarai (bogor, cikarang), Tanah Abang (rangkasbitung, cikarang), Duri (tangerang, cikarang)
  **Acceptance criteria**: `bun test direction.test.ts` passes all 4 tests, test coverage ≥95% for lib/direction.ts, live tracking session correctly detects direction after visiting 3 stations
  **QA scenarios**: Run tests, simulate GPS route Bogor→Depok→Citayam (decreasing seq on Bogor line), verify direction='decreasing' after 3rd station, simulate route crossing Manggarai from Bogor line to Cikarang line, verify line switches. Evidence: .omo/evidence/task-7-tiba-direction-test.txt (Jest output), .omo/evidence/task-7-tiba-sim.txt (simulated route direction log)
  **Commit**: Y | feat(direction): implement direction detection from station sequence

- [x] 8. Set up background location task with persistent notification showing live station info
  **What to do**: Create lib/background-location.ts with TaskManager.defineTask('TIBA_LOCATION_TASK') that: receives location updates, calls updateNearestStation, calls updateDirectionDetection, calculates stationsRemaining if destination is set, updates persistent notification via expo-notifications with title "Tiba - Tracking" and body "[CurrentStation] → [Destination] • [N] stations left" (or "Detecting location..." if no station). Implement startBackgroundTracking() that: requests background permissions (iOS requestBackgroundPermissionsAsync, Android ACCESS_BACKGROUND_LOCATION), starts location updates with Location.startLocationUpdatesAsync using task, shows persistent notification with foregroundService config (Android: notificationTitle, notificationBody, notificationColor #3B82F6). Implement updateLiveNotification(station, destination, stationsRemaining) that updates notification content. Configure app.json with iOS UIBackgroundModes: ["location"], Android permissions: FOREGROUND_SERVICE_LOCATION. Must NOT: Use high accuracy in background (battery), update notification more than once per station change, use WorkManager (use foreground service), allow background tracking without active destination.
  **Parallelization**: Wave 2 | Blocked by: tasks 4, 6, 7 | Blocks: task 9
  **References**: expo-task-manager defineTask (https://docs.expo.dev/versions/latest/sdk/task-manager/), Location.startLocationUpdatesAsync with foregroundService option (https://docs.expo.dev/versions/latest/sdk/location/#locationstartlocationupdatesasynctaskname-options), Notification format: "Manggarai → Bogor • 5 stations left", app.json plugins: ["expo-location", {isAndroidBackgroundLocationEnabled: true, isAndroidForegroundServiceEnabled: true}]
  **Acceptance criteria**: Run on physical device (background requires real device), start tracking with destination set, send app to background, verify persistent notification shows, lock screen, verify notification updates when moving between stations, verify notification body shows current station and countdown
  **QA scenarios**: Set destination to Bogor, start tracking from Manggarai, verify notification shows "Manggarai → Bogor • 16 stations left", simulate movement to Tebet, verify notification updates to "Tebet → Bogor • 15 stations left", move >200m from stations, verify notification shows "Detecting location... → Bogor", background app for 5 minutes, verify tracking continues. Evidence: .omo/evidence/task-8-tiba-background.mp4 (screen recording of notification updating during simulated movement)
  **Commit**: Y | feat(location): add background tracking with live notification

### Wave 3: Alarm System

- [x] 9. Implement alarm trigger logic with unit tests
  **What to do**: Create lib/alarm.ts with checkAlarmTrigger(currentStation, destination, line, direction, threshold): boolean that: (1) Returns false if any param is null, (2) Gets currentSeq = currentStation.sequences[line.id], destSeq = destination.sequences[line.id], (3) Calculates stationsRemaining = direction==='increasing' ? destSeq - currentSeq : currentSeq - destSeq, (4) Returns true if stationsRemaining > 0 && stationsRemaining <= threshold, otherwise false. Add calculateStationsRemaining helper. Create __tests__/alarm.test.ts with tests: (1) Current=Cikini (seq 8), Dest=Bogor (seq 25), direction='increasing', threshold=3 → false (17 stations left), (2) Current=Bojong Gede (seq 23), Dest=Bogor (seq 25), direction='increasing', threshold=3 → true (2 stations left), (3) Current=Depok (seq 21), Dest=Jakarta Kota (seq 1), direction='decreasing', threshold=5 → false (20 stations left), (4) Current=Juanda (seq 5), Dest=Jakarta Kota (seq 1), direction='decreasing', threshold=5 → true (4 stations left), (5) Null destination returns false. Must NOT: Trigger alarm immediately at threshold crossing (debounce to prevent re-trigger), schedule repeating alarms, trigger without user-set destination.
  **Parallelization**: Wave 3 | Blocked by: tasks 2, 4 | Blocks: task 10
  **References**: Alarm trigger formula: stationsRemaining = |currentSeq - destSeq| respecting direction, Threshold: user-configurable N (default 3), Test sequences from data/stations.json, Debounce logic: track last alarm trigger in state to prevent re-firing
  **Acceptance criteria**: `bun test alarm.test.ts` passes all 5 tests, test coverage ≥95% for lib/alarm.ts
  **QA scenarios**: Run tests, verify checkAlarmTrigger returns correct boolean for various station/threshold combinations, verify calculateStationsRemaining handles both directions, verify null-safety. Evidence: .omo/evidence/task-9-tiba-alarm-test.txt (Jest output)
  **Commit**: Y | feat(alarm): implement alarm trigger logic

- [x] 10. Create full-screen alarm modal with vibration and sound
  **What to do**: Create app/alarm-trigger.tsx as modal route (Expo Router modal presentation). Show full-screen view with: (1) Large station name in JetBrains Mono 48px "[Destination] APPROACHING", (2) "Prepare to alight" in 24px, (3) Stations remaining countdown "[N] stations left", (4) Large "DISMISS" button. Trigger continuous vibration using Vibration.vibrate([0, 1000, 1000], true) (repeat pattern). Play alarm sound using expo-av Audio.Sound with local audio file (assets/sounds/alarm.mp3), set shouldPlay: true, isLooping: true. Add onDismiss that: stops vibration, stops sound, sets isAlarmActive: false in store, dismisses modal via router.back(). Style with mono-danger background #EF4444, white text, full-screen overlay. Must NOT: Use expo-notifications for full-screen UI (create custom modal), allow dismissing via back button (require explicit button tap), play default notification sound (use custom alarm sound), auto-dismiss after timeout.
  **Parallelization**: Wave 3 | Blocked by: tasks 4, 5, 9 | Blocks: task 11
  **References**: Expo Router modal (https://docs.expo.dev/router/advanced/modals/), Vibration API (https://docs.expo.dev/versions/latest/sdk/vibration/), expo-av Audio (https://docs.expo.dev/versions/latest/sdk/audio/), Alarm sound: find royalty-free alarm MP3 or use iOS system sound, Modal styling: position: 'absolute', top/bottom/left/right: 0, zIndex: 999
  **Acceptance criteria**: Navigate to /alarm-trigger modal, verify full-screen red background, verify continuous vibration, verify alarm sound plays and loops, tap DISMISS, verify vibration stops, sound stops, modal closes
  **QA scenarios**: Trigger alarm manually via router.push('/alarm-trigger'), verify vibration starts immediately, verify sound plays, wait 5 seconds to confirm looping, tap DISMISS, verify all stops and modal closes, verify cannot dismiss via gesture/back button. Evidence: .omo/evidence/task-10-tiba-alarm-modal.mp4 (screen recording of alarm trigger and dismiss)
  **Commit**: Y | feat(alarm): create full-screen alarm modal with vibration and sound

- [x] 11. Integrate alarm trigger into background location task
  **What to do**: Modify lib/background-location.ts task to: (1) On each location update, after updating nearest station and direction, call checkAlarmTrigger with current state, (2) If returns true AND isAlarmActive===false (prevent re-trigger), set isAlarmActive: true in store, schedule notification using expo-notifications scheduleNotificationAsync with trigger: null (immediate), content: {title: "ALARM: [Destination] Approaching", body: "[N] stations remaining", sound: true, priority: 'high'}, iOS: {critical: true} (bypass DND), (3) On notification tap (via addNotificationResponseReceivedListener), navigate to /alarm-trigger modal via Linking.createURL. Add debounce: once alarm triggers, set lastAlarmStation in state, do not re-trigger until user dismisses or destination changes. Must NOT: Trigger alarm multiple times for same threshold crossing, trigger alarm if app is in foreground (show modal directly), schedule alarm in advance (trigger immediate when threshold crossed).
  **Parallelization**: Wave 3 | Blocked by: tasks 8, 9, 10 | Blocks: none
  **References**: expo-notifications scheduleNotificationAsync (https://docs.expo.dev/versions/latest/sdk/notifications/#notificationsschedulenotificationasyncrequest), iOS critical notifications (https://docs.expo.dev/versions/latest/sdk/notifications/#iosnotificationattributes), Notification response listener (https://docs.expo.dev/versions/latest/sdk/notifications/#notificationsaddnotificationresponsereceivedlistenerlistener), Expo Linking for deep link (https://docs.expo.dev/guides/linking/), Debounce: store lastAlarmStation: Station|null, reset on destination change or dismiss
  **Acceptance criteria**: Start background tracking with destination, simulate movement to threshold station (e.g. 3 stations before Bogor), verify notification fires immediately when checkAlarmTrigger returns true, tap notification, verify /alarm-trigger modal opens, verify alarm does not re-trigger when moving to next station until dismissed
  **QA scenarios**: Set destination Bogor, start from Depok Baru (6 stations away), simulate movement to Pondok Cina (3 stations - threshold), verify immediate notification, verify critical sound on iOS, tap notification, verify modal opens with vibration/sound, dismiss modal, continue to next station UI (2 stations), verify no second alarm, change destination to Nambo, verify lastAlarmStation resets. Evidence: .omo/evidence/task-11-tiba-integration.mp4 (full flow from tracking start to alarm trigger to dismiss)
  **Commit**: Y | feat(alarm): integrate alarm trigger into background location task

### Wave 4: UI Implementation

- [x] 12. Build Home screen with current station display and tracking controls
  **What to do**: Update app/(tabs)/index.tsx with: (1) StationCard component showing nearestStation (large station name in JetBrains Mono 48px, line badge with colored dot, "No station detected" if null, distance in meters if >200m using haversine), (2) Direction indicator showing arrow "→ Increasing" or "← Decreasing" with direction state (or "Detecting direction..." if null), (3) "Start Tracking" button (monoAccent bg) if not tracking, calls requestLocationPermissions then startForegroundTracking, sets isTracking: true, (4) "Stop Tracking" button (monoGray2 bg) if tracking, calls stopForegroundTracking, sets isTracking: false, (5) Show live stationsRemaining if destination is set "→ [Destination Name] • [N] stations remaining" in mono-style card. Style with 8px grid spacing, generous 24px margins, sharp 0px border-radius. Must NOT: Show map view, add route planning UI, show train schedule, auto-start tracking on app launch, show notification panel (Android only).
  **Parallelization**: Wave 4 | Blocked by: tasks 5, 6, 8 | Blocks: none
  **References**: useTibaStore() for state (nearestStation, isTracking, destination, stationsRemaining, direction), lib/location.ts functions (startForegroundTracking, stopForegroundTracking, requestLocationPermissions), StationCard layout: 48px station name, 16px line badge, 24px margin, mono-style colors from lib/theme.ts
  **Acceptance criteria**: Launch app, verify "Start Tracking" button shows, tap button, verify iOS permission prompt, grant permission, verify button changes to "Stop Tracking", simulate movement to station, verify StationCard updates with station name and line, verify direction indicator shows after 3 stations
  **QA scenarios**: Fresh app launch, tap "Start Tracking", grant permissions, verify foreground tracking starts, simulate GPS movement from Manggarai to Tebet to Cawang, verify StationCard updates at each station, verify direction shows "→ Increasing", set destination to Bogor, verify "→ Bogor • [N] stations remaining" appears, tap "Stop Tracking", verify tracking stops and card shows "No station detected". Evidence: .omo/evidence/task-12-tiba-home.mp4 (screen recording of full home screen flow)
  **Commit**: Y | feat(ui): build home screen with station display and tracking controls

- [x] 13. Build Alarm config screen with destination picker and threshold controls
  **What to do**: Update app/(tabs)/alarm.tsx with: (1) "Select Destination" section with scrollable list of all 93 stations grouped by line (Bogor Line header, then stations, Cikarang Line header, etc.), each station row shows name + line badge, tapping sets destination in store, (2) Selected destination shows highlighted with monoAccent background, (3) "Alarm Threshold" section with slider (1-10 stations range, default 3), shows "[N] stations before arrival", updates alarmThreshold in store on change, (4) "Start Trip" button (large, monoAccent) that: starts background tracking if not started, requests background permissions if needed, navigates to Home tab, (5) "Cancel Alarm" button if destination is set, clears destination and stops background tracking. Style with mono-style cards, 8px grid, JetBrains Mono labels. Must NOT: Allow multiple destinations, show map for destination selection, add route planning, show ETA/schedule, auto-start trip without user tap.
  **Parallelization**: Wave 4 | Blocked by: tasks 2, 5, 8 | Blocks: none
  **References**: getAllStations() and getLineById() from lib/data.ts, useTibaStore() setDestination and setAlarmThreshold, ScrollView with SectionList for grouped stations, Slider component for threshold (https://docs.expo.dev/versions/latest/sdk/slider/), startBackgroundTracking from lib/background-location.ts, Line colors from lib/theme.ts
  **Acceptance criteria**: Open Alarm tab, verify 5 line sections show, verify 93 total stations listed, tap "Bogor" station, verify highlighted, adjust slider to 5, verify "5 stations before arrival" label, tap "Start Trip", verify background permission prompt (iOS "Always Allow"), verify navigation to Home tab, verify tracking starts
  **QA scenarios**: Open Alarm tab, scroll through all lines, tap Manggarai (multi-line station), verify highlights, adjust threshold slider from 1 to 10, verify label updates, tap "Start Trip" without granting background permission, verify permission prompt, deny permission, verify error message or fallback, grant permission on retry, verify trip starts and Home tab shows tracking active, tap "Cancel Alarm", verify destination clears and tracking stops. Evidence: .omo/evidence/task-13-tiba-alarm-config.mp4 (screen recording of destination selection and trip start)
  **Commit**: Y | feat(ui): build alarm config screen with destination picker

- [x] 14. Build Settings screen with permissions info and about section
  **What to do**: Update app/(tabs)/settings.tsx with: (1) "Permissions" section showing location permission status (Granted/Denied) and notification permission status, "Request Location Permission" button that calls requestLocationPermissions and requestBackgroundPermissionsAsync, "Request Notification Permission" button that calls expo-notifications requestPermissionsAsync, (2) "About" section showing app name "Tiba", version from package.json, description "KRL Jabodetabek station alarm app", (3) "Data Source" text crediting "Indonesian Ministry of Transportation, Wikipedia, OpenStreetMap", (4) "Offline Mode" indicator showing green dot "All features work offline", (5) Optional: "Clear Data" button that resets MMKV storage (destination, threshold) with confirmation alert. Style with mono-style info cards, readable 16px body text. Must NOT: Add account login, add analytics toggles, add theme switcher (mono-style only), show map settings, add language settings (English only for MVP).
  **Parallelization**: Wave 4 | Blocked by: task 5 | Blocks: none
  **References**: useTibaStore() hasLocationPermission and hasNotificationPermission state, expo-location permissions (https://docs.expo.dev/versions/latest/sdk/location/#permissions), expo-notifications permissions (https://docs.expo.dev/versions/latest/sdk/notifications/#permissions), package.json version field, MMKV.clearAll() for reset
  **Acceptance criteria**: Open Settings tab, verify permission status shows current state, tap "Request Location Permission", verify iOS prompt (or "Already granted" if granted), tap "Request Notification Permission", verify prompt, verify About section shows "Tiba" and version, verify Offline Mode shows green indicator
  **QA scenarios**: Fresh app install, open Settings, verify permissions show "Denied", tap "Request Location Permission", grant, verify updates to "Granted", tap "Request Notification Permission", grant, verify updates, tap "Clear Data" button, confirm alert, verify destination and threshold reset in Alarm tab, verify version number matches package.json. Evidence: .omo/evidence/task-14-tiba-settings.png (screenshot of settings screen)
  **Commit**: Y | feat(ui): build settings screen with permissions and about info

### Wave 5: Polish & Final QA

- [x] 15. End-to-end integration test with simulated GPS route and alarm verification
  **What to do**: Create integration test script scripts/integration-test.ts that: (1) Simulates GPS route from Depok (seq 21) → Depok Baru (seq 20) → Pondok Cina (seq 19) → UI (seq 18) → Universitas Pancasila (seq 17) → Lenteng Agung (seq 16) on Bogor line toward Jakarta Kota, (2) Sets destination to Jakarta Kota (seq 1), threshold 15 stations, (3) Starts background tracking, (4) Feeds mock locations to background task at 1 location per 10 seconds, (5) Verifies nearestStation updates correctly at each step, (6) Verifies direction locks to 'decreasing' after 3 stations, (7) Verifies stationsRemaining decrements from 20→19→18→17→16→15, (8) Verifies alarm trigger fires when reaching Lenteng Agung (15 stations remaining = threshold), (9) Verifies persistent notification updates show correct countdown at each station, (10) Collects evidence logs to .omo/evidence/task-15-tiba-e2e.txt. Use Detox or manual test runner with mocked expo-location. Must NOT: Require physical GPS movement, test on production KRL train, use actual location spoofing apps.
  **Parallelization**: Wave 5 | Blocked by: all previous tasks | Blocks: none
  **References**: Mock Location.watchPositionAsync with fixture coordinates from data/stations.json, Sequence numbers: Depok=21, Depok Baru=20, Pondok Cina=19, UI=18, UP=17, Lenteng Agung=16, Jakarta Kota=1, Integration test pattern: start tracking → feed locations → assert state changes → verify alarm fires
  **Acceptance criteria**: Run `bun run test:integration`, verify test passes all 10 assertions, verify alarm trigger fires exactly once when reaching threshold station, verify logs show correct state transitions
  **QA scenarios**: Run integration test script, verify console output shows station sequence Depok→Depok Baru→Pondok Cina→UI→UP→Lenteng Agung, verify direction detection locks after 3rd station, verify alarm fires at Lenteng Agung, verify no duplicate alarm triggers, verify stationsRemaining calculation correct at each step. Evidence: .omo/evidence/task-15-tiba-e2e.txt (full integration test log), .omo/evidence/task-15-tiba-e2e-alarm.txt (alarm trigger verification)
  **Commit**: Y | test(e2e): add integration test for GPS tracking and alarm trigger

## Final verification wave
> Runs in parallel after ALL todos. ALL must APPROVE. Surface results and wait for the user's explicit okay before declaring complete.
- [ ] F1. Plan compliance audit
- [ ] F2. Code quality review
- [ ] F3. Real manual QA
- [ ] F4. Scope fidelity

## Commit strategy

- Atomic commits per todo (15 total commits)
- Conventional commits format: `type(scope): description`
- Types: `feat` (new feature), `test` (tests), `chore` (setup/config)
- Scopes: `init`, `data`, `distance`, `store`, `ui`, `location`, `direction`, `alarm`
- Commit after each task passes verification
- NO squashing or rebasing (preserve work history)
- NO commits for drafts or WIP (only completed verified work)

## Success criteria

**Build passes:**
- `bun install` succeeds with zero errors
- `npx expo start` launches Metro bundler
- TypeScript compilation passes with strict mode
- No ESLint errors

**Tests pass:**
- `bun test` passes all unit tests (distance, direction, alarm)
- Test coverage ≥95% for lib/distance.ts, lib/direction.ts, lib/alarm.ts
- Integration test passes with simulated GPS route

**Permissions work:**
- iOS: "While Using" → "Always Allow" permission flow succeeds
- Android: Foreground + background location permissions granted
- Notification permissions granted on both platforms

**Core functionality verified (agent-executed):**
- Station data loads: 93 stations, 5 lines
- Distance calculation: haversine Jakarta Kota→Manggarai ≈ 7800m ±50m
- Nearest station detection: correctly identifies station within 200m
- Direction detection: locks after 3 consecutive station readings
- Alarm trigger: fires when stationsRemaining <= threshold
- Background tracking: continues when app backgrounded for 5+ minutes
- Persistent notification: updates live with current station and countdown
- Full-screen alarm: vibration + sound + dismiss button work
- Offline mode: all features work with airplane mode enabled

**UI verified (manual QA with screenshots/recordings):**
- Mono-style design applied: JetBrains Mono font, #0A0A0A background, 8px grid
- Home screen: shows current station, direction, tracking controls, countdown
- Alarm config: destination picker with 93 stations, threshold slider 1-10
- Settings: permission status, request buttons, about info
- Alarm modal: full-screen red background, station name, dismiss button

**Final acceptance:**
- Complete GPS route simulation from Depok to Lenteng Agung (6 stations)
- Alarm fires at exactly 15 stations before destination (threshold met)
- No duplicate alarm triggers
- All evidence files present in .omo/evidence/
