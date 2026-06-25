@AGENTS.md

# tiba

Offline arrival-alarm app for the KRL Jabodetabek commuter rail (Greater Jakarta). It tracks your location, figures out which line/station you're near and which way you're heading, and wakes you a configurable number of stops before your destination. No accounts, no servers, no telemetry — all station data ships with the app.

## Stack

- **Expo SDK 56** / React Native 0.85 — read the versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing native-facing code.
- **expo-router** — file-based routes under `app/` (`(tabs)/` group + a root `alarm-trigger` modal).
- **zustand** — global state in `lib/store.ts` (`useTibaStore`).
- **react-native-mmkv** — persistence (`lib/storage.ts`), with an in-memory fallback in Expo Go.
- **react-native-reanimated** — all animations live in `lib/animations.ts` as reusable hooks.
- **expo-location** + **expo-task-manager** — foreground watch and background location service.
- **expo-notifications** — live tracking notification + arrival alarm.
- **expo-audio** — alarm sound (`assets/sounds/alarm.mp3`).
- **@expo/vector-icons** (Ionicons) — all icons. Do not use unicode glyphs as icons.
- Package manager: **bun** (pinned `bun@1.3.12` in `package.json` → `packageManager`).

## Commands

```bash
bun start                 # Metro dev server (add -c to clear cache)
bun run ios | android     # build + run the native app locally
bun test                  # bun test runner; specs in __tests__/
npx tsc --noEmit          # typecheck
npx expo prebuild --clean # regenerate native android/ & ios/ from app.json (incl. app icon)
eas build --platform android --profile preview   # cloud APK (preview/development = .apk, production = .aab)
```

## Architecture

- **`data/`** — `lines.json` (5 lines, each an ordered `stations` array) and `stations.json` (74 stations with `lat`/`lon`, `lines[]`, and `sequences{ lineId: number }`). The lines are strictly linear; transfers happen at interchange stations (those with >1 line: MRI, JAKK, KPB, DRI, THB).
- **`lib/`** — pure logic, unit-testable without RN:
  - `data.ts` — station/line getters (`getStationById`, `getStationsByLine`, `getAllLines`, …).
  - `distance.ts` — haversine/equirectangular + `findNearestStations`.
  - `direction.ts` — infer travel direction + current line from station history.
  - `alarm.ts` — `calculateStationsRemaining`, `checkAlarmTrigger` (single-line, sequence math).
  - `location.ts` — permission requests, foreground watch, `updateNearestStation`, `updateDirectionDetection`, and `evaluateTrip` (the shared per-update pipeline that sets `stationsRemaining` and fires alarms).
  - `background-location.ts` — the TaskManager background service + live/arrival notifications. Falls back to foreground watching in Expo Go.
  - `store.ts`, `notifications.ts`, `theme.ts`, `animations.ts`, `env.ts`.
- **`app/`** — `(tabs)/index.tsx` (home / live tracking), `(tabs)/alarm.tsx` (set destination + threshold), `(tabs)/settings.tsx`, and `alarm-trigger.tsx` (full-screen arrival alarm modal). Shared header is `components/PageHeader.tsx`; tab bar is `components/TabBar.tsx`.

**Tracking flow:** a location update → `updateNearestStation` (biased to the trip's line) → `updateDirectionDetection` → `evaluateTrip` (writes `stationsRemaining`, buzzes the heads-up within the threshold, arms `isAlarmActive` on arrival) → `app/_layout.tsx` watches `isAlarmActive` and pushes `/alarm-trigger`.

## Conventions

- Style with the tokens in `lib/theme.ts` (`colors`, `fonts`, `spacing`, `fontSize`, `borderColors`, `badgeColors`). Fonts are JetBrains Mono (`fonts.regular`/`fonts.bold`).
- Every tab uses the shared `PageHeader` for a uniform header.
- Icons via `Ionicons` from `@expo/vector-icons`.
- Animations come from `lib/animations.ts` hooks — add new ones there rather than inline.

## Gotchas

- **Expo Go can't run** the background TaskManager service, MMKV, or custom app icons. `lib/env.ts` exposes `isExpoGo`; tracking falls back to a foreground watch there and persistence is in-memory. The alarm/background features only fully work in a dev or production build.
- **App icon** is baked into the native projects at prebuild time. Editing `assets/icon.png` / `app.json` does nothing until you run `npx expo prebuild --clean`, then rebuild and **fully reinstall** (OS launchers cache icons). Expo Go always shows Expo Go's icon.
- **EAS local builds** detect the package manager from the lockfile; the `packageManager` field must be a pinned version (`bun@1.3.12`, not `bun@latest`) or EAS falls back to yarn. Older `eas-build-local` only recognizes the legacy `bun.lockb` — prefer cloud builds (`eas build` without `--local`) if local detection fails.
- **Metro config** (`metro.config.js`) must just be `getDefaultConfig(__dirname)`. Never push `json` into `resolver.assetExts` — it breaks JSON `import`s and the asset pipeline (icon fonts go missing).
- Trips are currently **single-line** — `calculateStationsRemaining` returns `null` across lines. Multi-line transit routing is a planned feature (`lib/transit.ts`).
