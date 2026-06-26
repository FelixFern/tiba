# tiba — Design System

A small, mono-aesthetic design language for the app. The source of truth is
`lib/theme.ts` (tokens) and `components/ui/` (primitives). This doc describes the
intent; the code is canonical.

## Principles

1. **Monospace & structural.** JetBrains Mono everywhere. The UI reads like a
   departure board — uppercase labels, generous letter-spacing, tight corners.
2. **Tokens, not literals.** Screens never hardcode colors/sizes. They read the
   active `Theme` via `useTheme()` and build styles with a `makeStyles(theme)`
   factory memoized on the theme.
3. **One accent, themeable.** A single accent drives primary actions and the
   "you are here" affordances. It's user-selectable (Settings → Accent) and
   resolved in `useTheme()`, so every token-driven surface tracks it.
4. **Light & dark are first-class.** Only surfaces, text, and dividers flip
   between palettes; brand colors (line colors, alarm reds/greens) stay constant.
5. **Motion is shared.** Animations come from `lib/animations.ts` hooks
   (`useSpringPress`, `usePulse`, `useFlowDown`, …), never inline ad-hoc timing.
6. **Icons are real.** Ionicons from `@expo/vector-icons` — never unicode glyphs.

## Tokens (`lib/theme.ts`)

### Color — semantic `Theme`
Resolved per mode via `useTheme()`; `darkTheme` / `lightTheme` implement the same
keys: `bg`, `fg`, `border`, `divider`, `sectionBg`, `inputBg`, `textMuted`,
`textDim`, `textFaint`, `dim`, `accent`, `danger`, `dangerBorder`, `warning`,
`success`, plus `mode`.

### Color — constant brand
- `lineColors` — the 5 KRL line colors (bogor/cikarang/rangkasbitung/tangerang/tanjungPriok).
- `badgeColors` — granted/enable/tracking.
- `accentOptions` — the 10 selectable accents.

### Color utilities
- `withAlpha(hex, alpha)` → `rgba()` string.
- `readableTextOn(hex)` → `#0A0A0A` or `#FFFFFF` by WCAG luminance (text on accent).

### Scale
- `spacing` — xs 4 · sm 8 · md 12 · lg 16 · xl 24 · xxl 32.
- `fontSize` — xs 8 · sm 10 · md 12 · body 14 · lg 16 · xl 20 · xxl 28 · display 48.
- `radius` — sm 3 (cards/controls) · md 8 (dialogs) · lg 12 · pill 999.
- `fonts` — `regular` / `bold` (JetBrains Mono).

## Components (`components/ui/`)

### `Button`
`<Button label onPress variant? disabled? style? />` — variants:
`primary` (filled accent, auto-contrast label), `secondary` (outline),
`destructive` (filled danger), `ghost` (text-only). Spring-press feedback.

### `ConfirmDialog`
`<ConfirmDialog visible title message? confirmLabel? cancelLabel? destructive? onConfirm onCancel />`
— the themed replacement for `Alert.alert`. Backdrop-tap or cancel dismisses;
backdrop fades + card zooms in. Use it for any confirm/destructive prompt.

## App-level components (`components/`)
`PageHeader` (shared header on every tab), `TabBar`, `DevTools`, `AlarmOverlay`.

## Conventions

- New reusable, app-agnostic UI → `components/ui/`. Screen-specific composites →
  `components/`.
- Always `const t = useTheme(); const styles = useMemo(() => makeStyles(t), [t]);`.
- Never nest non-style objects inside `StyleSheet.create` — flatten variant
  styles into discrete keys (e.g. `primaryContainer` / `primaryLabel`).
- Prefer `ConfirmDialog` over `Alert.alert` for choices; reserve OS alerts for
  flows that hand off to the OS (e.g. opening system Settings).
