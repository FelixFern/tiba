# tiba

KRL Jabodetabek commuter rail alarm. Get notified before your stop — never miss it again.

## What it does

1. **Track** — Detects your nearest station using GPS while riding the train
2. **Alert** — Set a destination and get an alarm (sound + vibration) before arrival
3. **Offline** — All station data is bundled. No accounts, no servers, no telemetry

## Screenshots

| Now | Set Destination | Alarm |
|-----|----------------|-------|
| Live station counter + route timeline | Search & pick any KRL station | Full-screen alert with sound |

## Stack

- **Expo 56** / React Native 0.85
- **expo-location** — foreground + background tracking
- **expo-notifications** — alarm delivery when backgrounded
- **react-native-reanimated** — micro-animations (counter roll, pulse, springs)
- **Zustand + MMKV** — state + persistence
- **TypeScript 6**

## Getting started

```bash
bun install
npx expo start
```

### Run on device

```bash
npx expo run:android
npx expo run:ios
```

## Project structure

```
app/
  _layout.tsx          Root stack (tabs + alarm modal)
  alarm-trigger.tsx    Full-screen alarm modal
  (tabs)/
    index.tsx          Now screen — live tracking UI
    alarm.tsx          Set destination + threshold
    settings.tsx       Permissions & app info
    _layout.tsx        Tab bar config

lib/
  animations.ts       Shared animation hooks (reanimated)
  store.ts            Zustand store + MMKV persistence
  location.ts         Foreground location tracking
  background-location.ts  Background task + alarm trigger
  alarm.ts            Alarm logic (stations remaining)
  data.ts             Station & line data accessors
  theme.ts            Colors, fonts, spacing tokens
  types.ts            Shared TypeScript types
```

## Permissions

| Permission | Why |
|---|---|
| Location (always) | Track position while app is backgrounded on the train |
| Notifications | Deliver alarm when screen is off |

## License

Private.
