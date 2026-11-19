# NoCrast Test Report

Results of the automated checks on the current code (version 0.2.0). Nothing here is claimed unless it was run.

## Summary

| Check | Result |
|---|---|
| TypeScript (strict) | Passed, no errors |
| ESLint | Passed, no errors or warnings |
| Prettier | Passed |
| Unit and component tests (Vitest) | **104 of 104 passed**, in 18 files |
| Browser tests (Playwright, Chromium) | **28 of 28 passed**, in 4 files |
| Production build | Succeeded (main script 361 KB, 114 KB gzipped) |
| Lighthouse (production build) | Performance 100, **accessibility 96**, best practices 100, SEO 100 |

**Accessibility finding.** Lighthouse reports one color-contrast failure: white text on the requested blue button color (#3d6bff) is 4.43 to 1, below the 4.5 AA minimum for small text. The requested red (#f2493d) with white text is 3.62 to 1, which passes only as large text (it sits on the Settings page, which this audit did not load). The amber buttons pass comfortably (8.3 to 1). The colors were used as specified; darker shades (#3a66f5 and #d93a2f) would pass and are a token-only change. See ADR-15 in [DECISIONS.md](DECISIONS.md).

## Environment

- Node.js 22, Vitest 5.1, Playwright 1.65.
- Browser tests ran in a bundled headless Chromium 153 rather than the browser Playwright normally downloads, because the download was not available in the build environment. Results should be the same with the standard browser, but that was not run.
- Browser tests use a fake clock for time and replace the browser's Notification with a recorder. This checks exactly what NoCrast sends, not whether the operating system displays it.
- Lighthouse ran against `npm run preview` on its default mobile settings, analyzing the first screen. Performance varied between 94 and 100 across runs.
- Phone-sized checks use a 375 by 812 viewport (and 390 by 844 for notices). No real phone or touch device was used.

## Unit and component tests

| File | Tests |
|---|---|
| `BreakUI.test.tsx` | 5 |
| `TaskCard.test.tsx` | 7 |
| `TaskForm.test.tsx` | 3 |
| `ToastStack.test.tsx` | 1 |
| `analytics.test.ts` | 6 |
| `analyticsBreaks.test.ts` | 2 |
| `breakService.test.ts` | 5 |
| `breaks.test.ts` | 9 |
| `chartAndLabels.test.ts` | 7 |
| `classify.test.ts` | 3 |
| `deadlines.test.ts` | 8 |
| `eventService.test.ts` | 2 |
| `interruptions.test.ts` | 11 |
| `sound.test.ts` | 7 |
| `time.test.ts` | 5 |
| `tracking.test.ts` | 5 |
| `uiParts.test.tsx` | 14 |
| `validation.test.ts` | 4 |

Storage tests run against an in-memory IndexedDB (`fake-indexeddb`). Component tests run in jsdom.

## Browser tests

| File | Scenario |
|---|---|
| `app.spec.ts` | task timer starts on creation, runs past the deadline, stops when done, persists |
| `app.spec.ts` | manual break: task timer keeps running, break time is shown, break survives refresh |
| `features.spec.ts` | form validation, hint text and saving |
| `features.spec.ts` | editing a task persists after reload |
| `features.spec.ts` | same deadline: the higher priority task is tracked |
| `features.spec.ts` | deadline warnings pop up in stages and overdue keeps the timer running |
| `features.spec.ts` | accidental tab switches are ignored, real ones are logged, labeled ones clear |
| `features.spec.ts` | tab switches during a break are not logged |
| `features.spec.ts` | analytics shows finished tasks and breaks |
| `features.spec.ts` | export, delete all data, then import restores it |
| `notifications.spec.ts` | every close-in stage sends a desktop notification, and urgent ones stay until dismissed |
| `notifications.spec.ts` | days-ahead warnings: 1 week, 5 days, 3 days and 1 day |
| `notifications.spec.ts` | a month and two weeks ahead |
| `notifications.spec.ts` | the page asks the user to allow notifications when they are not on |
| `notifications.spec.ts` | choose, keep and remove a custom notification sound |
| `notifications.spec.ts` | a file that is not audio is refused |
| `ux.spec.ts` | only the tracked task ticks; the others are quiet and say when they were created |
| `ux.spec.ts` | priority is a thin colored left edge, and still named in words |
| `ux.spec.ts` | break mode: countdown first and large, task timer dim, controls kept, detection resumes fresh |
| `ux.spec.ts` | close interruptions are grouped, expandable, and can be labeled one by one or all at once |
| `ux.spec.ts` | notices sit in the corner, never overlap, and leave every button reachable (desktop) |
| `ux.spec.ts` | notices sit in the corner, never overlap, and leave every button reachable (phone) |
| `ux.spec.ts` | buttons use the agreed colors, with hover and keyboard focus states |
| `ux.spec.ts` | major cards share one border, radius and padding, and the timer card keeps its blue outline |
| `ux.spec.ts` | analytics: on-time completion replaces the duplicate metric, and the chart has gridlines and exact tooltips |
| `ux.spec.ts` | analytics: with no deadlines the on-time rate says so instead of inventing one |
| `ux.spec.ts` | settings: narrow inputs with units beside them, and validation unchanged |
| `ux.spec.ts` | no page scrolls sideways, including break mode, long titles, notices and the chart |

## What the interface tests prove

- Only the tracked task shows a live timer; queued tasks show "Created … ago" and change status when the active task is finished.
- Priority edges use the stated colors; there is no OPEN badge.
- During a break the countdown is larger than, and above, the task timer; the task timer sits in a dimmed block; all controls remain; after the break expires, detection resumes with nothing pre-labeled.
- Three close tab switches form one group that expands, labels individually, labels all at once, and clears after a minute; the distraction counter matches.
- Notices stay in the corner, never overlap, leave every button clickable (Playwright refuses to click a covered element) and the reserved space returns when they are dismissed, on a desktop and a phone-sized screen.
- Button, border, radius and padding values match the specification, including hover and keyboard focus.
- On-time completion is 50% for one on-time and one late deadline task (a task with no deadline is ignored); with no deadlines it says "No deadlines yet". The chart has gridlines, axis labels and exact tooltips.
- Settings inputs are between 80 and 100 px wide with units beside them, and out-of-range values are corrected.
- No page scrolls sideways at 375 px wide, including break mode, a very long title and the monthly chart.

## Requirement coverage

Every functional requirement in [REQUIREMENTS.md](REQUIREMENTS.md) names the tests that verify it.

## Not tested, and why

| Gap | Note |
|---|---|
| The operating system showing a notification | Out of reach of a browser test. Check by hand: allow notifications, press "Send test notification" in Settings, switch to another app. |
| A tab left in the background for a long time | The worker clock is designed for it, but a truly hidden tab was not simulated. |
| Idle detection firing in a real idle browser | Only its threshold rule is unit-tested. |
| Browsers other than Chromium, and real phones | Not run. |
| Screen readers and a manual keyboard audit | Lighthouse accessibility is 96, but no manual audit was done. |
| Button contrast on every page | Lighthouse analyzed the first screen only. The ratios for all button colors were computed and are listed above. |
| Visual design | Checked by eye on screenshots only. |

## How to reproduce

```bash
npm install
npm run typecheck
npm run lint
npm test
npx playwright install chromium   # once
npm run test:e2e
npm run build && npm run preview  # then run Lighthouse against http://localhost:4173
```
