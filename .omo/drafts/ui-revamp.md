---
slug: ui-revamp
status: approved
intent: clear
pending-action: write .omo/plans/ui-revamp.md
approach: Component-by-component UI redesign matching the tiba Screens.html design reference. Theme first, then tab bar, then each screen independently. No business logic changes.
---

# Draft: ui-revamp

## Components (topology ledger)

| ID | Outcome | Status | Evidence |
|----|---------|--------|----------|
| C1 | Theme/design system: extend lib/theme.ts with new semantic tokens, spacing, card variants | active | lib/theme.ts |
| C2 | Tab bar: rename Home→NOW, add geometric icons, restyle active/inactive states | active | app/(tabs)/_layout.tsx |
| C3 | Home screen (Screen 01): stations counter, route timeline, alarm status, tracking badge | active | app/(tabs)/index.tsx |
| C4 | Set Destination screen (Screen 02): search bar, destination card, threshold slider, station list with counts | active | app/(tabs)/alarm.tsx |
| C5 | Wake-up Alarm screen (Screen 03): ARRIVING NOW, curved SVG, SOUND·VIBRATION, tap to silence | active | app/alarm-trigger.tsx |
| C6 | Settings screen (Screen 05): permission rows with descriptions, about with icon, clear data | active | app/(tabs)/settings.tsx |
| C7 | Notification content (Screen 04): configure expo-notifications content format | active | lib/background-location.ts |

## Open assumptions (announced defaults)

| Assumption | Adopted default | Rationale | Reversible? |
|------------|----------------|-----------|-------------|
| Tab icons | Unicode text glyphs (●, ○, ≡) not custom SVG icons | Design shows simple geometric shapes; text is simplest, no new deps | Yes |
| Curved SVG on alarm screen | React Native Svg or View composition | Design shows decorative curved lines; can use react-native-svg or approximate with Views | Yes |
| Search implementation | In-memory filter on getAllStations() | Only 93 stations; instant filtering, no debounce needed | Yes |
| Route timeline component | New inline component in index.tsx | Not complex enough to warrant a separate file; computed from line.stations + sequences | Yes |
| No new dependencies | Avoid adding react-native-svg; use View-based approximation for the curve | Keeps dependency footprint minimal | Yes |
| Line colors shown prominently | Line color dots on route timeline, destination cards, line section headers, alarm screen | User explicitly requested line colors visible across all screens | N/A |

## Findings (cited - path:lines)

- Current theme: lib/theme.ts:1-21 — colors (monoBg, monoFg, monoGray1, monoGray2, monoAccent, monoDanger), lineColors, fonts
- Tab layout: app/(tabs)/_layout.tsx:1-42 — 3 tabs (Home, Alarm, Settings), text-only labels
- Home screen: app/(tabs)/index.tsx:1-199 — simple card with station name, line badge, direction, tracking button
- Alarm screen: app/(tabs)/alarm.tsx:1-272 — SectionList of stations grouped by line, slider, start/cancel buttons
- Settings screen: app/(tabs)/settings.tsx:1-296 — permissions section, about, data source, offline indicator, clear data
- Alarm trigger: app/alarm-trigger.tsx:1-194 — red background, destination name, APPROACHING, dismiss button
- Store: lib/store.ts — Zustand with location, trip, settings state + MMKV persistence
- Data: lib/data.ts — getAllStations(), getStationsByLine(), getAllLines()
- Station data: data/stations.json — 93 stations with sequences per line
- Line data: data/lines.json — 5 lines with ordered station IDs

## Decisions (with rationale)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Screen 04 (notification) | Include | User chose to include notification content styling |
| Search bar | Functional | User chose functional search with real-time filtering |
| Line colors | Show prominently | User explicitly requested line colors visible across screens |
| No new deps | Keep dependency-free | Design achievable with existing RN primitives |
| Business logic | Untouched | Pure UI revamp; store, location, alarm logic stays identical |

## Scope IN

- Extend lib/theme.ts with new design system tokens
- Redesign tab bar (NOW/ALARM/SETTINGS with icons)
- Redesign Home screen to match Screen 01 (stations counter, route timeline, alarm status)
- Redesign Set Destination screen to match Screen 02 (search, destination card, threshold, station list)
- Redesign Wake-up Alarm screen to match Screen 03 (ARRIVING NOW, curved graphic, sound/vibration)
- Redesign Settings screen to match Screen 05 (permission rows, about section, clear data)
- Configure notification content to match Screen 04 format
- Line colors visible on route timeline, destination cards, line headers, alarm screen

## Scope OUT (Must NOT have)

- NO business logic changes (location tracking, alarm calculation, direction detection)
- NO navigation structure changes (tabs stay tabs, modal stays modal)
- NO new animation libraries
- NO store/state shape changes
- NO data layer changes
- NO new screens or routes

## Open questions

None — all forks resolved.

## Approval gate
status: approved
User approved the approach on 2026-06-21. Forks resolved: include notification styling, functional search, show line colors.
