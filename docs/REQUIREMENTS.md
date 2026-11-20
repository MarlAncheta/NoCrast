# NoCrast Requirements

This document states what NoCrast must do and how each requirement is verified. All requirements listed here are implemented. Verification names the automated tests that cover them. See [TEST_REPORT.md](TEST_REPORT.md) for results.

## 1. Scope

**In scope.** A single-user web application that runs in the browser, stores data locally, and helps a person understand their working habits through task timing, deadline warnings, distraction logging, declared breaks and analytics.

**Out of scope.** User accounts, cloud sync, a server, offline or installable (PWA) use, per-website tracking (needs a browser extension), mobile notifications.

**Users.** One person tracking their own work on a desktop browser.

## 2. Functional requirements

### Tasks
| ID | Requirement | Verified by |
|---|---|---|
| FR-01 | The user can create, edit, complete, reopen and delete tasks with a title, description, category, priority (low, medium, high, urgent) and an optional deadline given as an exact date and time. | `validation.test.ts`, `TaskForm.test.tsx`, `features.spec.ts` |
| FR-02 | Invalid input (empty or overlong title, overlong description or category) is rejected with a plain message and nothing is saved. | `validation.test.ts`, `TaskForm.test.tsx`, `features.spec.ts` |
| FR-03 | Open and done tasks are shown in separate lists. Every card states its status in words (TRACKING NOW, Queued or DONE), and an overdue task is labeled OVERDUE, so state never depends on color alone. | `TaskCard.test.tsx`, `ux.spec.ts` |

### Timing
| ID | Requirement | Verified by |
|---|---|---|
| FR-04 | A task's timer starts when the task is created and runs until it is marked done, whether or not the deadline has passed. | `app.spec.ts` |
| FR-04a | Only the tracked (active) task shows a live ticking timer. Other open tasks show a quiet "Created … ago", while their clocks keep running underneath. | `TaskCard.test.tsx`, `chartAndLabels.test.ts`, `ux.spec.ts` |
| FR-05 | Timer values stay correct across page refreshes, computer sleep and background tabs, because they are computed from timestamps. | `time.test.ts`, `app.spec.ts` |
| FR-06 | Reopening a done task does not count the time it spent done. | Not covered by an automated test. Implemented in the task toggle in `Dashboard.tsx`. |
| FR-07 | The large timer follows one open task: earliest deadline, then higher priority, then the older task. Tasks without a deadline come last. | `tracking.test.ts`, `features.spec.ts` |

### Deadline warnings
| ID | Requirement | Verified by |
|---|---|---|
| FR-08 | A task with a deadline triggers warnings at 1 month (30 days), 2 weeks, 1 week, 5 days, 3 days, 1 day, 5 hours, 3 hours, 1 hour, 30 minutes, 10 minutes, 5 minutes and 1 minute before the deadline, and when it passes. | `deadlines.test.ts`, `notifications.spec.ts` |
| FR-09 | Each warning shows once per task. If several stages are already past when a task is created, only the nearest is shown. Editing a deadline resets its warnings. | `deadlines.test.ts`, `features.spec.ts` |
| FR-10 | Each warning is delivered as a desktop notification (visible from other tabs and applications), an on-screen notice that stays until dismissed, and a sound. | `notifications.spec.ts`, `ToastStack.test.tsx` |
| FR-11 | After the deadline an OVERDUE badge appears on the task and by the big timer, and the timer keeps running. | `TaskCard.test.tsx`, `features.spec.ts` |
| FR-12 | The app requests notification permission when a task with a deadline is saved, and shows a banner if permission is missing or blocked. | `notifications.spec.ts` |
| FR-13 | The user can choose the system sound, a beep, no sound, or upload their own audio file (audio types only, up to 2 MB), stored locally. | `sound.test.ts`, `notifications.spec.ts` |

### Distraction detection
| ID | Requirement | Verified by |
|---|---|---|
| FR-14 | While a task is open and no break is active, tab switches at or above a minimum (default 10 seconds) are logged. Under 30 seconds is a short interruption, otherwise extended. Shorter switches are ignored. | `classify.test.ts`, `tracking.test.ts`, `features.spec.ts` |
| FR-15 | No mouse, keyboard, scroll or click for a threshold (default 3 minutes) is logged as possible inactivity, never as confirmed procrastination. | `classify.test.ts` (threshold rule only) |
| FR-16 | The user labels each event productive, necessary or distraction. Only unreviewed and distraction events count as distractions. | `classify.test.ts`, `features.spec.ts` |
| FR-17 | A labeled event leaves the list after one minute but is kept and still counted. | `features.spec.ts` |

### Breaks
| ID | Requirement | Verified by |
|---|---|---|
| FR-18 | A break starts only when the user confirms it, with a 5, 10, 15 or 30 minute preset or a custom length of 1 to 240 minutes. Cancelling starts nothing. | `BreakUI.test.tsx`, `features.spec.ts` |
| FR-19 | During a break the user can extend it (+5, +10 or custom), skip it, or end it. Each outcome is recorded as completed, skipped or ended early, with the actual and planned length. | `breaks.test.ts`, `breakService.test.ts`, `BreakUI.test.tsx` |
| FR-20 | A break ends by itself when its time runs out, including after a page refresh or while the app was closed, and a notification is sent. | `breaks.test.ts`, `breakService.test.ts`, `app.spec.ts` (a break survives a refresh). The expiry notification itself is not covered. |
| FR-21 | Only one break can be active at a time. | `breakService.test.ts` |
| FR-22 | While a break is active, distraction detection is suspended and nothing from the break is judged afterwards. | `features.spec.ts`, `breaks.test.ts` |
| FR-23 | Break time is shown within each task's total, kept out of time on finished tasks and distraction counts, and summarized separately. | `breaks.test.ts`, `analyticsBreaks.test.ts`, `features.spec.ts` |

### Analytics and data
| ID | Requirement | Verified by |
|---|---|---|
| FR-24 | Analytics offer daily, weekly and monthly views: time on finished tasks, finished tasks, average per task, on-time completion rate, distractions per task, inactivity events, active days, peak finishing hour, task and break minutes, focus versus interruptions, and a breaks summary. On-time completion is the share of finished tasks that had a deadline and were finished by it, and is shown as "No deadlines yet" when none had one. | `analytics.test.ts`, `chartAndLabels.test.ts`, `analyticsBreaks.test.ts`, `ux.spec.ts` |
| FR-25 | When there is too little data, Analytics says so instead of showing an invented number. | `analytics.test.ts` |
| FR-26 | The user can export all data to JSON, import a previous export, and delete all data. Import validates the file first, asks for confirmation, and changes nothing if the file is invalid. | `analytics.test.ts`, `features.spec.ts` |
| FR-27 | Settings are validated and clamped to safe ranges, and an older saved format is read correctly. | `analytics.test.ts`, `sound.test.ts` |

### Interface refinements
| ID | Requirement | Verified by |
|---|---|---|
| FR-28 | Priority is shown as a thin colored left edge on each task card (red urgent, amber high, blue low, neutral medium) and also in words. There is no OPEN badge in the Open list. | `TaskCard.test.tsx`, `ux.spec.ts` |
| FR-29 | During a break the break countdown is the largest element and the task timer is shown smaller and dimmed beneath it with a note that task timers keep running. Extend, skip and end stay available. | `uiParts.test.tsx`, `ux.spec.ts` |
| FR-30 | Short interruptions, or inactivity periods, of the same kind that follow each other closely are grouped into an expandable group with "Mark all as Distraction", Productive and Necessary actions. Individual events can still be labeled, bulk actions update exactly the group's events, and extended interruptions are never grouped. | `interruptions.test.ts`, `eventService.test.ts`, `uiParts.test.tsx`, `ux.spec.ts` |
| FR-31 | Notices sit in the bottom-right corner (full width on a phone) and never overlap each other. They show the newest three with a count of the rest and a Dismiss all action, and let clicks through their gaps. On screens 1200px wide or more the page leaves them a gutter, so no control is ever under one. On narrower screens the page reserves room underneath so every control can be scrolled clear. | `uiParts.test.tsx`, `ux.spec.ts` |
| FR-32 | Buttons follow one scheme (amber with dark text, blue with white text, red with white text) with distinct hover, pressed, disabled and keyboard-focus states. Major cards share one faint border, radius and padding, and the timer card keeps its blue outline. | `uiParts.test.tsx`, `ux.spec.ts` |
| FR-33 | The minutes chart has gridlines, labeled axes and exact-value tooltips on hover and keyboard focus, and stays inside the screen on a phone. | `chartAndLabels.test.ts`, `uiParts.test.tsx`, `ux.spec.ts` |
| FR-34 | Settings number inputs are 80 to 100 px wide with their unit beside them, keep the existing limits (values outside are corrected), and move under their description on a phone. | `uiParts.test.tsx`, `ux.spec.ts` |
| FR-35 | No page scrolls sideways on a phone-sized screen, including break mode, long task titles, notices and the chart. | `ux.spec.ts` |

## 3. Non-functional requirements

| ID | Requirement | Status and evidence |
|---|---|---|
| NFR-01 **Privacy** | All user data stays in the browser. The app makes no network requests for user data, requires no account and sends no analytics. | Met by design. See [PRIVACY.md](PRIVACY.md). |
| NFR-02 **Performance** | Fast first load and smooth interaction with a small bundle. | Met. Main script 361 KB (114 KB gzipped), secondary pages load on demand, Lighthouse performance 100 at the last run (varies a few points). |
| NFR-03 **Accessibility** | Labeled controls, visible focus, state shown in words as well as color, reduced-motion support, sufficient contrast. | Lighthouse accessibility 96. **Partly met:** the requested blue button color gives white text 4.43 to 1 (AA needs 4.5 for small text) and red gives 3.62 to 1. Amber with dark text is 8.3 to 1. No manual screen-reader or keyboard audit has been done. |
| NFR-04 **Reliability** | Refreshes, closed tabs and invalid imports never lose or corrupt data. Database changes use versioned migrations. | Covered by `breakService.test.ts`, import validation tests and the browser tests. Database versions 1 to 4. |
| NFR-05 **Maintainability** | Rules separated from screens, strict TypeScript, linting and formatting, central theme tokens, icons and messages. | ESLint and typecheck pass with no warnings. See [ARCHITECTURE.md](ARCHITECTURE.md). |
| NFR-06 **Compatibility** | Current desktop browsers that support IndexedDB, Web Workers and the Notification API. | Tested in Chromium only. Safari and mobile browsers are not supported for notifications. |

## 4. Constraints and assumptions

- The app must stay a plain web app: no service worker and no offline mode ([ADR-09](DECISIONS.md#adr-09-no-offline-or-installable-support)).
- Notifications need the browser running and the NoCrast tab open.
- A page can only observe its own tab, so site-level tracking is out of scope.
- A month is fixed at 30 days for the 1 month warning.
