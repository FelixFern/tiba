# ui-revamp - Work Plan

## TL;DR (For humans)

**What you'll get:** Every screen in the tiba app redesigned to match the new design reference — a richer home screen with a live route timeline and stations-to-go counter, a searchable destination picker with line-colored headers, a more dramatic alarm screen, cleaner settings with permission badges, and polished notification text. Line colors (Bogor red, Cikarang blue, etc.) shown prominently across all screens.

**Why this approach:** Screen-by-screen redesign with the theme/design tokens updated first, so all screens share consistent spacing, colors, and typography. No core logic is touched — the tracking engine, alarm triggers, direction detection, and data layer stay identical, which keeps risk low and lets each screen be worked on independently.

**What it will NOT do:** Won't change how location tracking, alarms, or notifications actually work under the hood. Won't add new libraries, new screens, or new navigation routes. Won't change the station data or store structure.

**Effort:** Medium (7 tasks across 2 waves)
**Risk:** Low — purely visual changes with minimal new UI logic (search filter, route timeline derivation). All core business logic is untouched.
**Decisions to sanity-check:** "ARRIVING NOW" text on the alarm screen (fires at threshold, e.g. 3 stations away — design's wording, not a logic change). Back arrow on Set Destination is decorative (navigates to NOW tab, not a stack pop). "Tap to silence" is instructional text for DISMISS, not a separate action.

Your next move: Run `$start-work` to begin execution, or request a high-accuracy review first. Full execution detail follows below.

---

> TL;DR (machine): Medium effort, low risk — 7 tasks redesigning all 5 screens + tab bar + notification content to match design reference. Theme tokens first, then parallel screen rewrites. No business logic / store / data changes. Line colors prominent. Search bar functional. Route timeline derived from existing station sequences.

## Scope

### Must have
- Extended design system in `lib/theme.ts` with new semantic tokens (spacing scale, card variants, badge styles, border colors) matching design reference
- Tab bar renamed: Home→NOW, Alarm→ALARM, Settings→SETTINGS with geometric dot/circle icons and redesigned active/inactive states
- Home screen (Screen 01): large stations-to-go counter, line name with line color, destination card, alarm status badge ("● TRACKING"), vertical route timeline with colored dots + "YOU ARE HERE" marker + "DESTINATION" badge, "STOP TRACKING" button
- Set Destination screen (Screen 02): back arrow + "SET DESTINATION" header, functional search bar filtering stations in real-time, blue-bordered destination card with ✕ clear button, threshold slider with "1"–"10" range labels + "N stations before" label, station list grouped by line with station counts per line, "START TRIP →" CTA button
- Wake-up Alarm screen (Screen 03): "ARRIVING NOW" text, large destination name, "Prepare to alight" subtitle, curved decorative graphic, "● SOUND · VIBRATION" indicator, "Tap to silence the alarm" text, DISMISS button
- Settings screen (Screen 05): "Settings" header, permission rows with descriptions + GRANTED/ENABLE badges (Location, Notifications, Precise location), about section with "● tiba" icon + version, offline indicator, data source text, "CLEAR SAVED TRIP DATA" red action
- Notification content (Screen 04): title format "[Station] → [Destination]", body "N stations left · alarm armed"
- Line colors shown prominently: colored dots on route timeline, line section headers, destination cards, alarm screen

### Must NOT have (guardrails, anti-slop, scope boundaries)
- NO core business logic changes — location tracking, alarm calculation, direction detection, background task registration stay identical. New **UI interaction logic** is expected: search filtering (useState + filter), route timeline derivation (slicing station arrays from existing data), stationsRemaining foreground computation (extracting existing background logic into a shared helper).
- NO navigation structure changes — tabs stay as tabs, alarm-trigger stays as fullScreenModal. The "‹" back arrow on the Set Destination tab is **decorative** — tapping it navigates to the NOW tab via `router.push('/(tabs)')`, not a stack pop.
- NO new npm dependencies — use React Native built-in primitives (View, Text, StyleSheet, TextInput). `@expo/vector-icons` is bundled with Expo SDK 56 and may be used if Unicode glyphs render inconsistently, but prefer Unicode first.
- NO store/state shape changes — Zustand store interface stays identical
- NO data layer changes — stations.json, lines.json, lib/data.ts stay identical
- NO new screens or routes — same file structure, same navigation
- NO animation libraries — keep current transition behavior
- NO component library adoption (NativeBase, React Native Paper, Tamagui)

## Verification strategy
> Zero human intervention - all verification is agent-executed.
- **Test decision**: None (unit tests) — these are purely visual/styling changes to existing screens. Existing tests must continue passing.
- **Verification per todo**: `npx tsc --noEmit` passes (TypeScript compilation), `npx expo start` launches without errors, code review against design spec
- **Regression guard**: Run existing `bun test` after each change to confirm no breakage
- **Evidence**: .omo/evidence/task-<N>-ui-revamp.<ext> (TypeScript compilation output, visual structure notes)

## Execution strategy

### Parallel execution waves

- **Wave 1: Foundation** (2 todos) — Theme extension + tab bar redesign. Must complete before screens.
- **Wave 2: Screen Redesigns** (5 todos) — All 5 screens can be done in parallel since they share only the theme and have no cross-screen UI dependencies. Notification content is independent of in-app screens.

### Dependency matrix
| Todo | Depends on | Blocks | Can parallelize with |
| --- | --- | --- | --- |
| T1 (Theme extension) | none | T2, T3, T4, T5, T6, T7 | none |
| T2 (Tab bar) | T1 | none | none (same file area as T1 output) |
| T3 (Home screen) | T1, T2 | none | T4, T5, T6, T7 |
| T4 (Set Destination) | T1, T2 | none | T3, T5, T6, T7 |
| T5 (Wake-up Alarm) | T1 | none | T3, T4, T6, T7 |
| T6 (Settings) | T1, T2 | none | T3, T4, T5, T7 |
| T7 (Notification) | none | none | T3, T4, T5, T6 |

## Todos
> Implementation + Test = ONE todo. Never separate.
<!-- APPEND TASK BATCHES BELOW THIS LINE WITH edit/apply_patch - never rewrite the headers above. -->

### Wave 1: Foundation

- [x] 1. Extend theme/design system with new semantic tokens matching design reference
  **What to do**: Update `lib/theme.ts` to add new design tokens derived from the design reference:
  - Add `spacing` object: `{ xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 }` (8px grid)
  - Add `borderColors` object: `{ subtle: '#333333', active: '#4A90E2', danger: '#E63946' }`
  - Add `badgeColors` object: `{ granted: '#43A047', enable: '#3B82F6', tracking: '#43A047' }`
  - Add `fontSize` object: `{ xs: 8, sm: 10, md: 12, body: 14, lg: 16, xl: 20, xxl: 28, display: 48 }`
  - Keep existing `colors`, `lineColors`, and `fonts` objects unchanged
  - Ensure all existing imports from `lib/theme.ts` continue to work (backward compatible)
  **Must NOT do**: Remove or rename any existing exports. Change the existing `colors` or `lineColors` values. Add platform-specific tokens.
  **Parallelization**: Wave 1 | Blocked by: none | Blocks: T2, T3, T4, T5, T6
  **References**: `lib/theme.ts:1-21` (current theme — keep all existing exports), design reference color palette: primary dark #1A1A1A, accent blue #4A90E2, accent red #E63946, border #333333, success green #43A047, text secondary #999999. Design grid: 8px baseline. Font sizes from reference: 8px (tab labels), 10px (descriptions), 12px (section labels), 14px (body), 16px (labels), 20px (headings), 28px (settings header), 48px (display/station name).
  **Acceptance criteria**: `npx tsc --noEmit` passes. All existing imports from `lib/theme.ts` in `app/_layout.tsx`, `app/(tabs)/_layout.tsx`, `app/(tabs)/index.tsx`, `app/(tabs)/alarm.tsx`, `app/(tabs)/settings.tsx`, `app/alarm-trigger.tsx` still resolve. New exports `spacing`, `borderColors`, `badgeColors`, `fontSize` are available.
  **QA scenarios**: Happy: import `{ colors, spacing, fontSize, borderColors, badgeColors, fonts, lineColors }` from theme — all resolve. Failure: import a removed export — should not happen since we only add. Run `npx tsc --noEmit` to verify. Evidence: .omo/evidence/task-1-ui-revamp-tsc.txt
  **Commit**: Y | feat(theme): extend design system with spacing, border, badge, and font size tokens

- [x] 2. Redesign tab bar with NOW/ALARM/SETTINGS labels and geometric icons
  **What to do**: Update `app/(tabs)/_layout.tsx` to:
  - Rename tab titles: `index` → "NOW", `alarm` → "ALARM", `settings` → "SETTINGS"
  - Add `tabBarIcon` to each tab using Text components with Unicode glyphs: NOW = "●" (U+25CF, filled circle), ALARM = "◎" (U+25CE, bullseye/target), SETTINGS = "⚙" (U+2699, gear) — styled as 20px, colored by active/inactive state
  - Update `tabBarStyle`: background `colors.monoBg` (#0A0A0A), borderTopColor `'#333333'`, borderTopWidth 1, height 56 (including safe area), paddingBottom 8
  - Update `tabBarActiveTintColor` to `colors.monoAccent` (#3B82F6)
  - Update `tabBarInactiveTintColor` to `'#666666'`
  - Update `tabBarLabelStyle`: fontSize 8, fontFamily `fonts.regular`, letterSpacing 1.5, textTransform 'uppercase'
  **Must NOT do**: Change tab route names (index, alarm, settings). Add any icon library. Change screen options beyond tab bar styling.
  **Parallelization**: Wave 1 | Blocked by: T1 | Blocks: none (but should complete before Wave 2 for visual consistency)
  **References**: `app/(tabs)/_layout.tsx:1-42` (current tab layout). Design reference tab bar: 56px height, #1A1A1A background (use existing monoBg #0A0A0A), 1px #333333 top border, active = blue filled, inactive = gray outline, 8px font labels, geometric icons. Unicode glyphs: ● (U+25CF), ◎ (U+25CE), ⚙ (U+2699).
  **Acceptance criteria**: `npx tsc --noEmit` passes. App launches with 3 tabs labeled "NOW", "ALARM", "SETTINGS". Each tab shows its geometric icon. Active tab icon/label is blue (#3B82F6), inactive is gray (#666666). Tab bar height is 56px with dark background.
  **QA scenarios**: Happy: launch app, verify 3 tabs show with correct labels and icons, tap each tab to verify active state styling changes. Failure: verify old "Home" label no longer appears. Evidence: .omo/evidence/task-2-ui-revamp-tabs.txt
  **Commit**: Y | feat(ui): redesign tab bar with NOW/ALARM/SETTINGS labels and geometric icons

### Wave 2: Screen Redesigns

- [x] 3. Redesign Home screen to match Screen 01 (stations counter, route timeline, alarm status)
  **What to do**: Rewrite `app/(tabs)/index.tsx` UI to match Screen 01 design:
  **Screen state matrix** (render the correct layout per state):
  - **(a) Not tracking, no destination**: Show "tiba" header, "No station detected" message, "START TRACKING" blue button
  - **(b) Tracking, no destination**: Show "tiba" header + "● TRACKING" badge, current station name (48px) + line color dot + line name, "START TRACKING" → changes to "STOP TRACKING"
  - **(c) Tracking + destination, direction unknown (<3 stations in history)**: Show stations counter with "—" instead of number, destination card, "Detecting direction…" in place of route timeline
  - **(d) Tracking + destination, direction known (full state)**: Full design: stations counter, route timeline, alarm status
  - **(e) At destination (stationsRemaining = 0)**: Counter shows "0", alarm status shows "● Arrived"
  **Header section**:
  - Top row: "tiba" logo text (left, JetBrains Mono Bold 16px, white) + "● TRACKING" badge (right, green dot + text, only when `isTracking` is true)
  **Stations counter section** (states c, d, e — when destination is set):
  - Left column: "STATIONS TO GO" label (12px, gray, uppercase) + line name with line color dot (e.g., "● BOGOR LINE" where ● uses `currentLine.color`)
  - Right column: Large stations count number (display size 64px+, white, bold) + destination name below (20px) + "final destination" subtitle (12px, gray)
  - **stationsRemaining foreground computation**: The store's `stationsRemaining` is currently only computed in the background task. Add a `useMemo` in this component that computes it from store values when available: import `calculateStationsRemaining` from `lib/alarm.ts`, call it with `(nearestStation, destination, currentLine, direction)`. Use this as fallback when `stationsRemaining` from store is null (foreground-only tracking).
  **Alarm status row** (when destination is set):
  - "● Alarm armed" with colored dot (green when active) + "N stops out · prepare to alight" description (when stationsRemaining <= alarmThreshold)
  **Route timeline section** (state d only — destination set, currentLine known, direction known):
  - "YOUR ROUTE" section label (12px, gray, uppercase)
  - **Route computation**: Call `getStationsByLine(currentLine.id)` to get the ordered station array. Find indices of `nearestStation` and `destination` using their `sequences[currentLine.id]` values. Slice the array between them (inclusive). If `direction === 'decreasing'`, reverse the slice. This gives the ordered list of upcoming stops.
  - Render vertical timeline: each station as a row with a colored dot (using `currentLine.color`) connected by a vertical line (2px, `currentLine.color`, opacity 0.3) on the left. Current station highlighted with blue dot (#3B82F6) + "YOU ARE HERE" label (10px, blue). Destination station highlighted with bordered box (1px border, `currentLine.color`) + "DESTINATION" label (10px, red). Intermediate stations show line-colored dots in normal style.
  **Idle state** (states a, b — no destination):
  - Show current station name in large text (48px) if `nearestStation` exists, or "No station detected" in gray
  - Show line badge with line color dot + line name
  - Show direction indicator if available
  **Bottom button**:
  - If tracking: "STOP TRACKING" outlined button (full width, 44px height, border 1px #333333, transparent bg)
  - If not tracking: "START TRACKING" filled blue button (#3B82F6)
  **Must NOT do**: Change existing imports from `lib/location.ts` (startForegroundTracking, stopForegroundTracking, requestLocationPermissions). Change `useTibaStore` usage pattern (keep selector pattern). Add route planning logic beyond slicing existing station arrays. Fetch data from network.
  **Parallelization**: Wave 2 | Blocked by: T1, T2 | Blocks: none | Can parallelize with: T4, T5, T6, T7
  **References**: `app/(tabs)/index.tsx:1-199` (current home screen — preserve all imports lines 1-9, business logic in handlers lines 22-41). `lib/data.ts:40-47` (`getStationsByLine` for route computation). `lib/alarm.ts:11-35` (`calculateStationsRemaining` for foreground stationsRemaining fallback). `lib/store.ts:21-27` (LocationState — nearestStation, currentLine, direction), `lib/store.ts:29-34` (TripState — destination, stationsRemaining, isAlarmActive, alarmThreshold). `lib/theme.ts` for colors/fonts/spacing/lineColors. `lib/types.ts:1-17` for Station and Line types (Station.sequences for route ordering). Design reference Screen 01: stations counter layout, route timeline with colored dots, "YOU ARE HERE" + "DESTINATION" markers, "TRACKING" badge, "STOP TRACKING" button.
  **Acceptance criteria**: `npx tsc --noEmit` passes. All 5 screen states render without crash. State (d): shows stations counter with line color, route timeline with stations between current and destination, "YOU ARE HERE" on current, "DESTINATION" on destination. State (a): shows "No station detected". State (c): shows counter with "—" and "Detecting direction…". Line color dots are visible on the route timeline and line label.
  **QA scenarios**: Happy — state (d): nearestStation=Citayam, currentLine=Bogor (red), destination=Bogor, stationsRemaining=3, direction='increasing' → large "3" counter, "● BOGOR LINE" with red dot, route timeline shows Citayam→Bojong Gede→Cilebut→Bogor with red dots, "YOU ARE HERE" on Citayam (blue), "DESTINATION" on Bogor (red border). Failure — state (a): no tracking, no destination → "No station detected", "START TRACKING" button. Edge — state (c): direction=null → counter shows "—", no route timeline, shows "Detecting direction…". Evidence: .omo/evidence/task-3-ui-revamp-home.txt
  **Commit**: Y | feat(ui): redesign home screen with stations counter, route timeline, and alarm status

- [x] 4. Redesign Set Destination screen to match Screen 02 (search, destination card, threshold)
  **What to do**: Rewrite `app/(tabs)/alarm.tsx` UI to match Screen 02 design:
  **Screen state matrix**:
  - **(a) No destination selected, no active trip**: Search bar + station list visible, no destination card, START TRIP disabled
  - **(b) Destination selected, trip not started**: Destination card with ✕ shown, START TRIP enabled
  - **(c) Trip already active (destination + tracking)**: Destination card shown, ✕ on card clears destination AND stops background tracking (same as current `handleCancelAlarm` behavior)
  **Header section**:
  - "‹" back arrow (left, tappable) — this is a **decorative navigation shortcut** since alarm.tsx is a tab screen; tapping navigates to the NOW tab via `router.push('/(tabs)')`. Plus "SET DESTINATION" title (center/left, 16px bold, uppercase, letter-spaced)
  **Search bar**:
  - `TextInput` component: height 40px, dark background (#222222), 1px border #333333, placeholder "Search station…" in gray, white text, JetBrains Mono font, 12px
  - Add `searchQuery` local state (useState). Filter stations: `getAllStations().filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))` — pass filtered results to the station list below
  **Destination card** (when destination is set):
  - Blue left border (4px, `borderColors.active` / #4A90E2), dark background (#222222), padding 12px
  - "DESTINATION" label (10px, gray, uppercase)
  - Station name (14px, bold, white) + "● [LINE NAME]" with line color dot (10px)
  - "✕" close button (right side, tappable, calls `setDestination(null)` AND `stopBackgroundTracking()` if tracking is active — same behavior as current `handleCancelAlarm`)
  **Threshold section**:
  - "ALERT THRESHOLD" label (12px, gray, uppercase) + "N stations before" value (right-aligned, 12px)
  - Slider: same as current but with "1" and "10" range labels below the slider (left and right aligned, 10px mono)
  **Station list** (grouped by line):
  - Line section headers: "● [LINE NAME]" with line color dot + "N stations" count (right-aligned, 10px, gray). E.g., "● BOGOR LINE" (red dot) + "25 stations"
  - Station rows: station name (14px), tappable. Selected station shows "✓" checkmark on the right
  - If search query is active, show only matching stations (still grouped by line, hide empty line sections)
  **CTA button** (bottom, above tab bar):
  - "START TRIP →" (full width, 44px, blue background #3B82F6, white text, bold, centered, arrow glyph)
  - Disabled state (opacity 0.4) when no destination selected
  **Must NOT do**: Change business logic (handleSelectStation, handleStartTrip, handleCancelAlarm function bodies). Add external search libraries. Change store actions. Remove the cancel alarm functionality (keep it accessible, e.g. via the ✕ on the destination card which calls setDestination(null) + stopBackgroundTracking).
  **Parallelization**: Wave 2 | Blocked by: T1, T2 | Blocks: none | Can parallelize with: T3, T5, T6, T7
  **References**: `app/(tabs)/alarm.tsx:1-272` (current alarm screen — preserve imports lines 1-12, handlers lines 14-46). `lib/data.ts:31-33` (getAllStations), `lib/data.ts:40-47` (getStationsByLine), `lib/data.ts:53-55` (getAllLines). `lib/theme.ts` for all styling tokens. `lib/types.ts:1-17` for Station type. Design reference Screen 02: search bar, blue-bordered destination card, threshold slider with range labels, line headers with station counts, checkmark on selected station, "START TRIP →" button.
  **Acceptance criteria**: `npx tsc --noEmit` passes. Search bar filters stations as user types. Destination card shows with blue left border and ✕ when station selected. Line section headers show line color dot + station count. Slider shows "1" and "10" range labels. "START TRIP →" button is disabled when no destination.
  **QA scenarios**: Happy: type "bog" in search — only stations containing "bog" appear (Bogor, Bojong Gede). Select Bogor — destination card appears with red dot + "BOGOR LINE", ✕ button visible. Tap ✕ — destination clears. Adjust slider to 5 — label shows "5 stations before". Failure: search with no results — list is empty, no crash. Evidence: .omo/evidence/task-4-ui-revamp-destination.txt
  **Commit**: Y | feat(ui): redesign set destination screen with search, destination card, and threshold controls

- [x] 5. Redesign Wake-up Alarm screen to match Screen 03 (ARRIVING NOW, curved graphic, indicators)
  **What to do**: Rewrite `app/alarm-trigger.tsx` UI to match Screen 03 design:
  **Semantics note**: The design says "ARRIVING NOW" but the alarm fires at threshold (e.g., 3 stations away). This is a **text swap to match the design reference** — not a trigger logic change. The current `checkAlarmTrigger` logic (`stationsRemaining > 0 && stationsRemaining <= threshold`) stays identical. "ARRIVING NOW" is the design's chosen wording for the alarm state.
  **Layout**: Full-screen red background (`colors.monoDanger` / #EF4444), centered content, safe area aware
  **Curved decorative graphic**:
  - Create a decorative element using nested `View` components with `borderRadius` and `transform` to approximate the curved motion lines from the design. Use semi-transparent white (rgba(255,255,255,0.15)) overlapping arcs positioned absolutely behind the main text content. This is purely decorative — approximate the design, don't pixel-match. No `react-native-svg` needed.
  **Main content** (centered vertically):
  - "ARRIVING NOW" text (16px, white, uppercase, letter-spaced, bold) — replaces current "APPROACHING"
  - Destination name (48px, white, bold) — from `destination?.name`
  - "Prepare to alight" subtitle (14px, white, opacity 0.85)
  **Line color indicator**:
  - Show a small line color dot next to or below the destination name to indicate which line. Derive line color from `destination?.lines[0]` and look up in `lineColors` (e.g., destination on Bogor line → red #E53935 dot). Also read `currentLine?.color` from store as primary source if available.
  **Indicators row**:
  - "● SOUND · VIBRATION" text (12px, white, with filled dot, centered). This is **static text** — always shows both since the app always plays both sound and vibration. Not dynamic based on device ringer mode.
  **Bottom section**:
  - "Tap to silence the alarm" — **instructional text** (12px, white, opacity 0.7) guiding the user toward the DISMISS button below. This is NOT a separate "tap to silence" action — it describes what DISMISS does.
  - "DISMISS" button: full-width, white background, red text (#EF4444), bold, 44px height, 12px margin horizontal. Same behavior as current `handleDismiss`.
  **Must NOT do**: Change the alarm sound/vibration logic (useEffect at lines 49-74, handleDismiss at lines 83-94). Remove BackHandler blocking (lines 77-80). Change modal presentation options in `app/_layout.tsx`. Add a separate "silence" action — DISMISS is the only action.
  **Parallelization**: Wave 2 | Blocked by: T1 | Blocks: none | Can parallelize with: T3, T4, T6, T7
  **References**: `app/alarm-trigger.tsx:1-194` (current alarm — preserve all business logic: imports lines 1-13, loadAlarmSound lines 19-31, component logic lines 37-94). `lib/theme.ts` for colors/fonts. `lib/store.ts` for destination, stationsRemaining, currentLine. `lib/types.ts` for Station type. `lineColors` from `lib/theme.ts:11-16` for line color dot. Design reference Screen 03: "ARRIVING NOW" + destination name, curved graphic, "SOUND · VIBRATION" indicator, "Tap to silence" + DISMISS button.
  **Acceptance criteria**: `npx tsc --noEmit` passes. Alarm screen shows "ARRIVING NOW" (not "APPROACHING"). Destination name in large 48px font. "Prepare to alight" subtitle visible. Decorative curved graphic visible behind text. "● SOUND · VIBRATION" indicator shows. DISMISS button is white bg with red text. Line color dot visible near destination name. Vibration and sound still work identically (business logic unchanged).
  **QA scenarios**: Happy: navigate to alarm-trigger with destination=Bogor (Bogor line) — verify "ARRIVING NOW" (not "APPROACHING"), "Bogor" in large text, red (#E53935) dot for Bogor line visible, "● SOUND · VIBRATION" shows, curved graphic visible, DISMISS button is white with red text. Tap DISMISS — modal closes, vibration stops, sound stops. Failure: no destination in store — verify "DESTINATION" fallback text still works. Evidence: .omo/evidence/task-5-ui-revamp-alarm.txt
  **Commit**: Y | feat(ui): redesign alarm screen with ARRIVING NOW layout, indicators, and line color

- [x] 6. Redesign Settings screen to match Screen 05 (permission rows, about section, clear data)
  **What to do**: Rewrite `app/(tabs)/settings.tsx` UI to match Screen 05 design:
  **Header**: "Settings" title (28px, bold, white, JetBrains Mono)
  **Permissions section**:
  - "PERMISSIONS" section label (12px, gray, uppercase, letter-spaced)
  - Permission rows (each 56px height, 1px bottom border #333333):
    1. **Location**: left = "Location" label (14px, white) + "Always · background tracking" description (10px, gray). Right = "● GRANTED" badge (green #43A047 text, 8px with green dot) if granted, or "ENABLE" button (blue text, tappable) if denied. Tap calls `handleRequestLocation`.
    2. **Notifications**: left = "Notifications" label + "Alarms & live updates" description. Right = "● GRANTED" or "ENABLE". Tap calls `handleRequestNotification`.
    3. **Precise location**: left = "Precise location" label + "Improves station accuracy" description. Right = "■ ENABLE" button (blue #3B82F6, tappable). **Note**: No existing code handles precise/approximate location distinction. This row is **informational UI only** — tapping shows an `Alert.alert` explaining that precise location can be enabled in device Settings, with a "Open Settings" button that calls `Linking.openSettings()`. No new native permission logic needed — just the UI row + alert + deep link to settings.
  **About section**:
  - "ABOUT" section label (12px, gray, uppercase)
  - Row with "●" icon (blue dot, 12px) + "tiba" name (16px, bold) + "v1.0.0 · KRL Jabodetabek alarm" (10px, gray)
  - "All features work offline" text with green dot indicator (●)
  - Data source paragraph: "Station data: Indonesian Ministry of Transportation, Wikipedia, OpenStreetMap. No accounts, no servers, no telemetry." (10px, gray, line-height 1.4)
  **Clear data action**:
  - "CLEAR SAVED TRIP DATA" text (red #EF4444, 12px, tappable, uppercase). Tapping calls existing `handleClearData` which shows Alert confirmation. **Scope note**: The label changes from "Clear Data" to "CLEAR SAVED TRIP DATA" but the underlying behavior stays identical (`storage.clearAll()` + `resetStore()`). This is a label change only, not a behavior change.
  **Must NOT do**: Change permission handling logic (checkPermissions, handleRequestLocation, handleRequestNotification, handleClearData function bodies lines 23-83). Add new permission types that require native configuration. Change storage clearing logic.
  **Parallelization**: Wave 2 | Blocked by: T1, T2 | Blocks: none | Can parallelize with: T3, T4, T5, T7
  **References**: `app/(tabs)/settings.tsx:1-296` (current settings — preserve all business logic: imports lines 1-14, component logic lines 16-86). `lib/theme.ts` for colors/fonts/spacing. `lib/store.ts:76` for storage instance. Design reference Screen 05: permission rows with descriptions + GRANTED/ENABLE badges, about section with icon + version, clear data action, data source text. `expo-constants` for version (already imported at line 1).
  **Acceptance criteria**: `npx tsc --noEmit` passes. Settings screen shows "Settings" header at 28px. Permission rows show label + description + status badge (GRANTED green or ENABLE blue). About section shows "tiba" with version and data sources. "CLEAR SAVED TRIP DATA" is red and tappable. All permission request handlers still work.
  **QA scenarios**: Happy: open Settings tab — verify "Settings" header, 3 permission rows with descriptions, GRANTED/ENABLE badges, about section with version, clear data link. Tap "ENABLE" on Location — verify permission prompt. Failure: all permissions denied — verify "ENABLE" badges show on Location and Notifications rows. Evidence: .omo/evidence/task-6-ui-revamp-settings.txt
  **Commit**: Y | feat(ui): redesign settings screen with permission rows, about section, and clear data

- [x] 7. Configure notification content format to match Screen 04 design reference
  **What to do**: Update notification content in `lib/background-location.ts` to match Screen 04:
  **Which notification**: There are TWO notification mechanisms in the codebase. Update BOTH:
  1. **`updateLiveNotification` function** (expo-notifications `scheduleNotificationAsync`) — this is the live-updating notification that shows station progress. This CAN be dynamically updated. Change its content format.
  2. **Android foreground service notification** (`startLocationUpdatesAsync` → `foregroundService` config) — this is the persistent OS notification. Its title/body are set at task start time. Update the initial values; they'll be overridden by `updateLiveNotification` on the first station detection.
  - Update live notification **title** format to: `"[CurrentStation] → [Destination]"` (e.g., "Citayam → Bogor")
  - Update live notification **body** format to: `"N stations left · alarm armed"` (e.g., "3 stations left · alarm armed")
  - When no destination is set but tracking is active, use title: `"Tiba · Tracking"` and body: `"Near [StationName] · [LineName]"` — include the line name so the user sees which line they're on
  - When no station detected, use body: `"Detecting location…"`
  - Update foreground service initial values: title `"Tiba · Tracking"`, body `"Detecting location…"`
  - Also find where the alarm notification is triggered (likely in the background task when `checkAlarmTrigger` returns true) — update its title to `"ALARM: [Destination]"` and body to `"N stations remaining · prepare to alight"`
  **Must NOT do**: Change location tracking logic, alarm trigger logic, or background task registration. Add new notification channels. Change notification scheduling triggers (immediate vs scheduled). Change the foreground service type or permissions.
  **Parallelization**: Wave 2 | Blocked by: none | Blocks: none | Can parallelize with: T3, T4, T5, T6
  **References**: `lib/background-location.ts` (background task with notification — find `updateLiveNotification` function and `startLocationUpdatesAsync` call with `foregroundService` config). `lib/alarm.ts:1-76` (alarm trigger logic — pure function, no notification code). `lib/store.ts:29-34` for TripState (destination, stationsRemaining). Design reference Screen 04: notification card showing "Citayam → Bogor" title, "3 stations left · alarm armed" body.
  **Acceptance criteria**: `npx tsc --noEmit` passes. Live notification uses new format strings. Foreground service initial notification uses new format. When tracking with destination Bogor and current station Citayam with 3 stations remaining: title = "Citayam → Bogor", body = "3 stations left · alarm armed". Line name included in tracking-without-destination notifications.
  **QA scenarios**: Happy: start tracking with destination set → verify notification title shows "[Station] → [Destination]" format and body shows "N stations left · alarm armed". Verify line name appears. Failure: no station detected → verify body shows "Detecting location…". No destination → verify title shows "Tiba · Tracking" and body includes line name. Evidence: .omo/evidence/task-7-ui-revamp-notification.txt
  **Commit**: Y | feat(ui): update notification content format to match design reference

## Final verification wave
> Runs in parallel after ALL todos. ALL must APPROVE. Surface results and wait for the user's explicit okay before declaring complete.
- [x] F1. **Plan compliance audit**: Verify every todo was completed as specified. Check each screen against the design reference snapshot. Confirm line colors are visible on route timeline, destination cards, line headers, and alarm screen.
- [x] F2. **Code quality review**: Run `npx tsc --noEmit` on the full project. Check for unused imports, dead styles, TypeScript errors. Verify no business logic was changed (diff `lib/store.ts`, `lib/alarm.ts`, `lib/distance.ts`, `lib/direction.ts`, `lib/location.ts` — should have zero changes). Verify `lib/data.ts` unchanged.
- [x] F3. **Real manual QA**: Launch app on simulator. Navigate all 3 tabs. Verify search filtering works. Verify alarm trigger modal still vibrates/plays sound. Verify notification content format. Take screenshots of all screens for evidence.
- [x] F4. **Scope fidelity**: Confirm no new dependencies were added (`diff package.json`). Confirm no new routes/screens were created. Confirm store interface unchanged. Confirm data files unchanged.

## Commit strategy

- Atomic commits per todo (7 total commits)
- Conventional commits format: `feat(scope): description`
- Scopes: `theme`, `ui`
- Commit after each task passes TypeScript compilation
- NO squashing (preserve work history)
- Order: T1 → T2 → (T3, T4, T5, T6, T7 in any order)

## Success criteria

**Build passes:**
- `npx tsc --noEmit` passes with zero errors after all changes
- `npx expo start` launches Metro bundler without errors
- Existing `bun test` passes (regression guard)

**Visual matches design reference:**
- Home screen: stations counter, route timeline with line-colored dots, "YOU ARE HERE"/"DESTINATION" markers, tracking badge
- Set Destination: search bar filters, blue-bordered destination card, threshold slider with range labels, line headers with station counts and line colors
- Alarm: "ARRIVING NOW", destination name, curved graphic, "SOUND · VIBRATION", line color dot
- Settings: permission rows with descriptions and GRANTED/ENABLE badges, about section with icon
- Tab bar: NOW/ALARM/SETTINGS with geometric icons, correct active/inactive states
- Line colors prominently visible on all relevant screens

**Functionality preserved:**
- Location tracking starts/stops correctly
- Alarm trigger fires with vibration + sound
- Search filters stations in real-time
- Destination selection persists across app restarts (MMKV)
- Notification shows formatted content
- All permissions requests still work

**No regressions:**
- Zero changes to: `lib/store.ts`, `lib/alarm.ts`, `lib/distance.ts`, `lib/direction.ts`, `lib/location.ts`, `lib/data.ts`, `lib/types.ts`
- Zero changes to: `data/stations.json`, `data/lines.json`
- Zero new dependencies in `package.json`
- Zero new routes in `app/` directory
