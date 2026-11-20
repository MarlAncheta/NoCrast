# NoCrast Developer Guide

For anyone changing or extending the code. For using the app, see [USER_GUIDE.md](USER_GUIDE.md). For diagrams see [ARCHITECTURE.md](ARCHITECTURE.md), and for the reasoning behind the design see [DECISIONS.md](DECISIONS.md).

## Contents

1. [Stack](#stack)
2. [Setup and scripts](#setup-and-scripts)
3. [Project layout](#project-layout)
4. [Architecture](#architecture)
5. [Data model](#data-model)
6. [Core behavior](#core-behavior)
7. [Theming and customization](#theming-and-customization)
8. [Testing](#testing)
9. [Common changes](#common-changes)
10. [Known issues and legacy code](#known-issues-and-legacy-code)

## Stack

React 19, TypeScript 5.9 (strict), Vite, Tailwind CSS v4, Dexie (IndexedDB), lucide-react, Vitest, React Testing Library, Playwright, ESLint, Prettier.

TypeScript is pinned to 5.9 because typescript-eslint does not support 7 yet.

## Setup and scripts

Node.js 20.19+ or 22.12+.

```bash
npm install
npm run dev
```

| Script | Purpose |
|---|---|
| `dev` | Dev server. |
| `build` | Typecheck, then production build into `dist/`. |
| `preview` | Serve `dist/` to check the production build. |
| `typecheck` | `tsc --noEmit` |
| `lint` | ESLint on `src` |
| `format` | Prettier on `src` |
| `test` | Vitest, unit and component tests |
| `test:e2e` | Playwright. Needs `npx playwright install chromium` once. |
\1| `demo` | Records the captioned demo video (`docs/demo`) from the running preview. Needs ffmpeg on the PATH, or set `FFMPEG`. |\n
GitHub Actions (`.github/workflows/ci.yml`) runs the typecheck, lint, unit and component tests and the build on every push and pull request. The Playwright tests are not part of it.

Prettier settings: single quotes, no semicolons, 140 columns.

## Project layout

```
src/
  App.tsx, main.tsx
  pages/        Dashboard (Today), Analytics, Settings
  components/
    common/     Button, Modal, ProgressBar, ToastStack, NotificationBanner
    settings/   SoundSettings, NumberSetting
    analytics/  MinutesChart
    interruptions/  InterruptionsPanel
    tasks/      TaskForm, TaskCard
    breaks/     BreakPicker, BreakPanel
  hooks/        useDistractionTracker, useNow, useTick, useDeadlineWarnings, useNotificationPermission
  services/     database, settings, breakService, eventService, soundService, dataService, analyticsService, notificationService
  utils/        time, date, classify, tracking, breaks, deadlines, interruptions, chart, sound, validation, importData
  config/       icons, messages, navigation
  styles/       globals.css (Tailwind and theme tokens)
  tests/        Vitest tests
e2e/            Playwright test
docs/           This documentation
```

## Architecture

Three layers, kept apart on purpose:

- **utils** are pure functions with no browser or database access. They hold the rules (timer math, tracking choice, break math, validation, classification) and are the easiest to test.
- **services** talk to storage and the browser: Dexie, localStorage, Notifications, Audio.
- **hooks, components and pages** are React. Pages read data with `useLiveQuery`, so the screen updates whenever the database changes.

`App.tsx` is a thin shell: navigation, settings state, and lazy loading for Analytics and Settings. The Dashboard stays mounted (hidden) on other pages so tracking and break expiry keep working there.

### One clock

There is no stored counter anywhere. Task time is `(completedAt or now) - createdAt`. A break's remaining time is `startTime + plannedDuration - now`. `useNow` only triggers re-renders once a second, and only while something on screen needs a live clock. This is why refreshes, sleep and background throttling cannot cause drift.

## Data model

Database name `nocrast`, defined in `src/services/database.ts`.

### Task (`tasks`, indexes `id, done, createdAt`)

| Field | Notes |
|---|---|
| `id` | UUID |
| `title`, `description`, `category` | Strings. |
| `priority` | `low`, `medium`, `high`, `urgent` |
| `deadline` | Timestamp or `null`. Exact local date and time. |
| `done` | Boolean |
| `createdAt` | Timer start. Reopening a task moves this forward by the time it spent done. |
| `completedAt` | Timer stop. `null` while open. |
| `warnedMs` | Deadline warning stages already shown (ms before the deadline), so none repeats. Reset when the deadline is edited. |

### ActivityEvent (`events`, indexes `id, at, sessionId`)

`kind` is `short-interruption`, `extended-interruption` or `inactivity`. `verdict` is `unreviewed`, `productive`, `necessary` or `distraction`. `reviewedAt` is set when labeled and drives the one-minute disappearance. `durationMs` is the time away or idle. The field `sessionId` holds the **task id** being tracked (the name is left over from an earlier design).

### BreakSession (`breakSessions`, indexes `id, startTime`)

| Field | Notes |
|---|---|
| `type` | `short`, `long` or `custom` |
| `startTime`, `endTime` | `endTime` is `null` while active. |
| `plannedDuration` | Total planned ms, including extensions. |
| `actualDuration` | Filled in when the break ends. |
| `status` | `active`, `completed`, `skipped` or `ended_early` |
| `extensionCount` | How many times it was extended. A break counts as "extended" when this is above 0. |
| `relatedTaskId` | The task tracked when it started. |

### Sound (`sounds`, index `id`)

The user's custom notification sound, stored as `{ id: 'notification', name, type, data: ArrayBuffer }` (max 2 MB, audio types only, checked by `validateSoundFile`). It is **not** part of the JSON export, and Delete all data removes it.

### Settings (localStorage key `nocrast.settings`)

Validated and clamped by `sanitize` in `services/settings.ts`. Used: `inactivityMin`, `minAwaySec`, `trackTabs`, `soundMode` (`system`, `beep`, `custom` or `off`), `notifications` (on by default). An older saved `sound: true` is read as `soundMode: 'beep'`. `focusMin`, `shortBreakMin` and `longBreakMin` still exist in the schema but nothing reads them.

### Migrations

Dexie versions: v1 (tasks, sessions, events, timer), v2 (adds `breaks`), v3 (adds `breakSessions` and copies old `breaks` rows into it), v4 (adds `sounds`). Add a new `version(n)` for every schema change, never edit an old one.

### Export format

```json
{ "app": "nocrast", "version": 1, "exportedAt": 0, "tasks": [], "sessions": [], "events": [], "breakSessions": [], "settings": {} }
```

`parseImport` (`utils/importData.ts`) validates before anything is written. Import replaces all data inside one transaction.

## Core behavior

### Which task is tracked

`pickTracked` in `utils/tracking.ts`: open tasks only, sorted by deadline (none last), then priority rank, then `createdAt`.

### Deadline warnings and notifications

`utils/deadlines.ts` lists the stages, furthest to nearest: `1mo` (30 days), `2w`, `1w`, `5d`, `3d`, `1d`, `5h`, `3h`, `1h`, `30m`, `10m`, `5m`, `1m`, `overdue`. `nextWarning(deadline, known, now)` decides what is due. If several stages were passed at once (a task made with a close deadline, or the app was closed for a while) only the nearest one fires and the older ones are marked as handled.

`hooks/useDeadlineWarnings.ts` runs in `App.tsx`, not the Dashboard, because the Dashboard is hidden on other pages. For each open task with a deadline it checks every second, saves the fired stages in `warnedMs`, calls `notify`, and adds an on-screen notice. A ref remembers what was just shown so nothing repeats while the database write catches up. It is keyed by task and deadline, so editing a deadline starts fresh. Notice text lives in `DEADLINE_MESSAGES` in `config/messages.ts`. `ToastStack` draws the notices; they stay until dismissed and at most five show.

**Why a worker clock.** Browsers slow ordinary timers in hidden tabs (to once a second, then once a minute). `hooks/useTick.ts` runs its interval inside a Web Worker made from a Blob, whose timers are not slowed, and falls back to a normal interval if a worker cannot start. Only the warnings use it. Tests that fake the clock in the page still work because the worker only triggers a re-read of `Date.now()`.

**How a notification reaches another app.** `services/notificationService.ts` uses the browser Notification API from the page. The operating system shows it, so it appears over other tabs and applications. `urgent` and `overdue` stages use `requireInteraction` so they stay until dismissed, and a `tag` per task and stage stops duplicates. Clicking one focuses the tab. Permission is requested when a task with a deadline is saved (inside the click, so the browser accepts it), and `NotificationBanner` offers it again if it was missed.

**Limits.** The page must be open, because there is no server to push from and no service worker (offline support was removed on purpose). A closed tab sends nothing, a tab the browser has put to sleep can be late, and mobile browsers generally refuse page notifications. Operating system Focus or Do Not Disturb modes can hide them.

**Sound.** `soundMode` decides who plays what. `system`: the notification plays the OS sound and the page plays nothing. `beep`, `custom`, `off`: the notification is created `silent` and the page plays the beep, the stored file, or nothing. If a notification could not be shown, `system` falls back to a beep so the user still hears something. A custom file is read from the `sounds` table into an object URL (cached, revoked on change) and played with `Audio`; if playback fails it beeps. Web notifications cannot carry a custom sound themselves, which is why the page plays it and why it only plays while the tab is open.

### Today page: task states

`TaskCard` takes a `status` of `active`, `queued` or `done`, decided in `Dashboard.tsx`: done if finished, active if it is the task `pickTracked` returns, otherwise queued. Only the active card receives the live `elapsedMs`; queued cards get an `ageText` from `formatAgo` (coarse, so it changes only once a minute). Every task's time is still computed from timestamps, so nothing is lost, and a done card shows the real total. Priority is a left border colored by a lookup (red urgent, amber high, blue low, neutral medium) and is also printed as text. The active task is listed first in the Open section.

### Break mode layout

When a break is active the timer card renders `BreakPanel` first, with the countdown as the largest text, and puts the task timer below it in a dimmed block (`opacity-70`) with the `role="timer"` element kept so the task timer is still exposed. Break logic is unchanged.

### Interruptions: grouping and bulk labeling

`utils/interruptions.ts` holds the rules. `groupEvents` walks the day's events in time order and joins an event to the previous one when both are short interruptions, or both are inactivity, and the gap from the end of the previous event to the start of this one is at most `GROUP_GAP_MS` (5 minutes). Extended interruptions and any event of another kind in between break a group. `visibleItems` decides grouping on all events (so groups stay stable), then drops labeled events older than `VANISH_MS`; a group left with one event becomes a single card and an empty group disappears. `InterruptionsPanel` renders the items. Labeling, single or bulk, goes through `labelEvents` in `services/eventService.ts`, which updates the chosen ids in one Dexie transaction and sets `reviewedAt`.

### Notices

`ToastStack` is a fixed, `pointer-events-none` column at the bottom-right (full width on a phone) with each notice `pointer-events-auto`, so clicks pass through the gaps. It shows the newest three, summarizes the rest, and offers Dismiss all. While it is mounted it sets two CSS variables on the root element, using a `ResizeObserver`:

- `--toast-gutter` (26rem). On screens 1200px wide or more, `globals.css` turns this into right padding on the page, so the content sits beside the notices and nothing is ever under one.
- `--toast-space` (the stack's height plus a margin). On narrower screens the notices overlay the page, and this becomes bottom padding so anything covered can be scrolled clear.

Both are reset to 0 when the last notice goes. The padding eases back, so tests wait for it.

### Distraction tracking

`hooks/useDistractionTracker.ts`, active only when the app state is `FOCUSING` (an open task exists and no break is active; see `appState` in `utils/breaks.ts`).

- Tab switch: `visibilitychange`. When the tab becomes visible again the away time is checked with `shouldLogAway` (minimum from settings). Anything at or above it is logged and classified by `classifyAway` (30 second split).
- Inactivity: a 5 second interval compares the last `mousemove`, `keydown`, `scroll` or `pointerdown` with the threshold. It is logged once per idle stretch.
- Every time tracking (re)starts, the activity timestamp is reset, so earlier idle time and break time are never counted.
- `countsAsDistraction` decides what counts: `unreviewed` and `distraction`.

### Breaks

`services/breakService.ts` wraps every change in a Dexie transaction. `startBreak` returns `null` if one is already active. `extendBreak` and `endBreak` do nothing on a finished break, so repeated calls are safe.

`finalizeBreak` (`utils/breaks.ts`) decides the end time and status:

| Reason | End time | Status |
|---|---|---|
| `expired` | planned end | `completed` |
| `ended_early` | `min(now, planned end)` | `completed` if that reached the planned end, else `ended_early` |
| `skipped` | `min(now, planned end)` | `skipped` |

The Dashboard ends a break automatically once `now >= plannedEndsAt`. A ref guards against doing it twice. This also runs on load, which handles breaks that expired while the app was closed.

Break activity is not recorded at all. It only stays out of the statistics.

### Analytics

**On-time completion** is `onTimeRate` in `analyticsService.ts`: of the tasks finished in the period that have both a deadline and a finish time, the share where `completedAt <= deadline`, rounded to a whole percent. With no such tasks the rate is `null` and the page says so. **The chart** is `components/analytics/MinutesChart.tsx`; `utils/chart.ts` rounds the top of the scale to an even number (`niceMax`) and picks which x labels to show (`labelStep`). The tooltip is positioned with a percentage-based transform so it stays inside the chart on a phone.


`services/analyticsService.ts` plus `pages/Analytics.tsx`.

- There are no stored sessions. Each finished task becomes one block placed at its `completedAt`, with length `completedAt - createdAt - breakOverlapMs(...)`.
- `breakOverlapMs` sums how much of a time span fell inside breaks. An unfinished break counts up to now or its planned end.
- `summarize` and `summarizeBreaks` produce the stat cards. `bucketFocus` and `bucketBreaks` produce chart bars (hours of today, last 7 days, last 30 days). Minutes are rounded to one decimal so short breaks stay visible.
- Peak finishing hour needs at least 3 finished tasks.

## Theming and customization

- **Colors, radius, font:** the `@theme` block in `src/styles/globals.css`. Tokens: `night`, `panel`, `raised`, `snow`, `ink` (dark text on amber), `brand` (orange, used for break time), `sun` (yellow), `amber`, `blue`, `red`, each with hover and pressed shades where buttons use them. Use the token classes (`bg-panel`, `text-snow`) rather than raw hex.
- **Cards:** the `card` and `card-inner` utilities in `globals.css` give every major container the same faint border (`1px solid rgba(255,255,255,0.08)`), radius and padding. The timer card keeps its own thick blue outline.
- **Buttons:** `VARIANTS` in `components/common/Button.tsx` (primary, blue, danger, secondary, ghost, dangerGhost). One rule: amber background with dark text, blue with white text, red with white text. Hover and pressed shades apply only to enabled buttons (`enabled:` variants), disabled buttons are faded with a not-allowed cursor, and the global focus ring (3px yellow, offset 2px) shows for keyboard focus.
- **Icons:** `config/icons.ts`. Import icons there and nowhere else.
- **Messages:** `config/messages.ts`. All playful and break messages.
- **Navigation:** `config/navigation.ts`.

Reduced motion is respected in `globals.css`.

## Testing

`npm test` runs 104 tests in 18 files.

| File | Covers |
|---|---|
| `time.test.ts` | Legacy timer math and `formatHMS` |
| `classify.test.ts` | Interruption types, inactivity threshold, what counts |
| `tracking.test.ts` | Tracked-task rule including priority tie-break, short-switch threshold |
| `validation.test.ts` | Task validation, exact deadline time |
\1| `TaskCard.test.tsx` | Active, queued and done states, priority edge, OVERDUE wording, buttons (jsdom) |
| `interruptions.test.ts` | Grouping rules (gap, kind, order), visibility and expiry |
| `eventService.test.ts` | Bulk labeling updates exactly the chosen events (fake-indexeddb) |
| `chartAndLabels.test.ts` | Chart scale and label helpers, "created ago" text, on-time completion rate |
| `uiParts.test.tsx` | Button colors and states, chart tooltip, settings input, interruption groups, notice placement, break panel (jsdom) |
| `sound.test.ts` | Sound file checks and the sound/notification settings, including the old `sound` setting |
| `ToastStack.test.tsx` | Notices show as alerts and can be dismissed (jsdom) |
| `breaks.test.ts` | Break timing, statuses, overlap, summary, app state |
| `breakService.test.ts` | One active break, extend, end, skip, expire, persistence (fake-indexeddb) |
| `BreakUI.test.tsx` | Break picker presets, custom, cancel; break panel controls (jsdom) |
| `analytics.test.ts` | Summaries, buckets, settings clamping, import validation |
| `analyticsBreaks.test.ts` | Break buckets |
| `e2e/app.spec.ts` | Browser: task timer through overdue and completion, persistence, export, manual break with refresh |
\1\1| `e2e/ux.spec.ts` | Browser: active versus queued timers, priority edges, break layout and resume, interruption groups, notice placement on desktop and phone, button colors and states, card borders, on-time metric and chart, settings inputs, no sideways scrolling on a phone |\nComponent tests opt into jsdom with a `// @vitest-environment jsdom` comment. Service tests import `fake-indexeddb/auto` first.

`e2e/app.spec.ts`, `e2e/features.spec.ts`, `e2e/notifications.spec.ts` and `e2e/ux.spec.ts` hold 28 Playwright tests. They use a fake clock rather than waiting, and the notification tests swap the browser's `Notification` for a recorder. Run them with `npx playwright install chromium` once, then `npm run test:e2e`. All 28 passed when last run. They cannot prove the operating system displays the notification or that a truly hidden tab keeps ticking; check those by hand.

Lighthouse on the local production build (`npm run preview`, mobile emulation): performance 100, accessibility 96, best practices 100, SEO 100. First contentful paint 0.8 s, largest contentful paint 0.8 s, total blocking time 10 ms, layout shift 0.024. Performance varies a few points between runs. The one accessibility finding is color contrast: white text on the requested blue (#3d6bff) is 4.43 to 1, just under the 4.5 AA minimum for small text. See Known issues.

Not covered by automated tests: the visual design, desktop notifications and sound (the on-screen notices are covered), and inactivity detection firing in a real idle browser (only its threshold rule is unit-tested).

## Common changes

**Add a page:** create it in `pages/`, add an entry to `config/navigation.ts` (and the `Page` type), then render it in `App.tsx` (lazy load it like Analytics).

**Add a setting:** add it to the `Settings` interface, `DEFAULTS` and `sanitize` in `services/settings.ts`, add a control in `pages/Settings.tsx`, and read it where needed. Add a clamping test.

**Add a task field:** add it to `Task` and `TaskInput` in `services/database.ts`, to `validateTask`, `TaskForm` and the task row in the Dashboard. If you need to query by it, add a Dexie version. Give old rows a default in `parseImport`.

**Change the schema:** add `this.version(n+1)` with the new stores and an `upgrade` if data must move. Update `exportData`, `importData`, `clearAll` and `parseImport`.

**Change tracking rules:** thresholds live in `utils/classify.ts` (`SHORT_AWAY_MS`) and settings. Keep rules in `utils` so they stay testable.

## Known issues and legacy code

- Tables `sessions`, `timer` and `breaks` are no longer used by the app. They remain for old data and export compatibility. `sessions` is still exported and imported.
- `pauseTimer`, `resumeTimer`, `resetTimer` and `elapsedMs` in `utils/time.ts` are unused by the app and kept only for their tests. They can be removed along with `time.test.ts` cases and the `TimerState` type.
- Settings `focusMin`, `shortBreakMin`, `longBreakMin` are unused.
- The category field is a label only.
- Tab and inactivity tracking only run while the app is open in a tab. There is no browser extension.
- Analytics place a finished task at its finish time, so a task that spans several days appears on the day it was finished.
- Distraction events are attributed to the tracked task when they happen, not to every open task.
- `main.tsx` removes any service worker and caches left by earlier versions that had offline support. It can be deleted once no browser still has them.
- Desktop notifications only work while NoCrast is open in a browser tab, and are not available on most mobile browsers (see Deadline warnings and notifications).
- Custom sounds play only while the tab is open and are not included in the JSON export.
- A month is fixed at 30 days for the 1 month warning.
- **Button contrast.** The button colors follow the specified palette. Amber with dark text is 8.3 to 1, but blue with white text is 4.43 to 1 and red with white text is 3.62 to 1, which miss AA for normal-size text (the red passes only as large text). Lighthouse flags the blue button. Moving the button blue to `#3a66f5` (4.77 to 1) and red to `#d93a2f` (4.57 to 1) would fix it; only the button tokens would change.
- **Queued tasks do not show a ticking timer** by design; their time is still measured and shows when they are done.
