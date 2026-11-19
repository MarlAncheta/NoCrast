# NoCrast Decision Records

Short records of the significant decisions, why they were made and what they cost. All are currently in force.

## ADR-01: Store everything locally in IndexedDB

**Context.** The app tracks personal work habits. A server would add accounts, hosting and privacy risk for a single-user tool.
**Decision.** Keep all data in the browser: IndexedDB (through Dexie) for records and localStorage for settings. No server, accounts or analytics.
**Consequences.** Private by default and trivial to run. Data lives in one browser, so export and import exist to move it, and clearing site data deletes it.

## ADR-02: Timestamps are the only source of time

**Context.** A counter that increments each second drifts when tabs sleep or throttle, and is lost on refresh.
**Decision.** Store start and end timestamps and compute every duration from the current time. An interval only triggers redraws.
**Consequences.** Timers stay correct through refresh, sleep and background tabs. Durations are easy to test with a fake clock.

## ADR-03: Task timers start at creation and never pause

**Context.** Forgetting to press Start is the most common way time tracking fails.
**Decision.** A task's timer starts when the task is created and runs until it is marked done, whether or not the deadline has passed.
**Consequences.** Tracking needs no effort and is honest about overdue work. It needs a separate way to declare rest (ADR-06). Reopening a task moves its start forward by the time it spent done, so that gap is not counted.

## ADR-04: Distractions are possible, and the user decides

**Context.** A computer can see that someone left a tab or stopped typing, not why.
**Decision.** Log tab switches and idle stretches as possible events. The user labels each as productive, necessary or a distraction. Only unreviewed and distraction events count.
**Consequences.** The app never accuses. The numbers depend on the user reviewing events, which is why labeled events clear from the list after a minute to keep review light.

## ADR-05: Ignore very short tab switches

**Context.** Logging every switch flooded the list with accidental clicks.
**Decision.** Switches shorter than a minimum (default 10 seconds, adjustable from 1 to 300) are not logged or counted.
**Consequences.** Far fewer false events. A genuine very quick check is not recorded, which is acceptable for the purpose.

## ADR-06: Breaks are declared, separate, and excluded from analytics

**Context.** Rest should neither count as productive time nor as procrastination, and the app must not guess that someone is resting.
**Decision.** A break exists only when the user confirms it. It is its own record with planned and actual length. Detection is suspended during it and restarts fresh after. Task timers keep running, as requested by the project owner, and the interface shows how much of each task's time was break time. Analytics subtract break overlap from time on finished tasks.
**Consequences.** Stepping away is never held against the user. A task's live timer includes break time, while analytics do not. This difference is shown on screen and explained in the documentation.

## ADR-07: Staged warnings, delivered as desktop notifications

**Context.** A single reminder is easy to miss, and an in-page popup does nothing when the user is in another window.
**Decision.** Warn at fixed stages from 1 month to 1 minute and at the deadline. Each stage shows once, and when several are already past only the nearest is shown. Each warning is a desktop notification plus an on-screen notice and a sound the user can choose.
**Consequences.** Warnings reach the user anywhere in the browser's session. They depend on the tab staying open, which is stated in the documentation. A month is fixed at 30 days.

## ADR-08: Run the warning clock in a Web Worker

**Context.** Browsers slow ordinary timers in hidden tabs, to as little as once a minute, which would delay the 1 minute warning.
**Decision.** Drive the warning check from a timer inside a Web Worker, falling back to a normal interval if a worker cannot start.
**Consequences.** Warnings arrive on time from a background tab. Tests that fake the page clock still work because the worker only triggers a re-read of the time. A tab the browser puts fully to sleep can still be late, and this is documented.

## ADR-09: No offline or installable support

**Context.** Offline support (a service worker and installable app) was built first, then reconsidered.
**Decision.** Remove it. NoCrast is a plain web app. A small piece of startup code removes any service worker or cache left by earlier builds.
**Consequences.** A simpler build, no risk of stale cached files after an update, and no background service worker. The app needs a connection to load. Notifications come from the open page, not from a service worker.

## ADR-10: Keep the rules in pure functions, with strict TypeScript and tests

**Context.** The behavior that matters is subtle and kept changing as requirements evolved.
**Decision.** Put rules (timer math, task choice, warning stages, break endings, validation) in pure functions under `utils`. Use strict TypeScript, ESLint and Prettier. Test rules with unit tests, storage with an in-memory IndexedDB, and behavior in a real browser with a fake clock.
**Consequences.** Changes stayed small and safe. The cost is a clear split between rules and the code that uses them.

## ADR-11: Store a custom sound in IndexedDB, limited to 2 MB

**Context.** Web notifications cannot carry a custom sound, and localStorage is too small for audio.
**Decision.** Let the user upload an audio file (up to 2 MB, audio types only), keep it in IndexedDB, and have the page play it. Exclude it from the JSON export.
**Consequences.** Any sound can be used, but it plays only while the tab is open. Delete all data removes it.

## ADR-12: Derive analytics from tasks

**Context.** Timers run from creation to completion, so a separate session record would duplicate what each task already holds.
**Decision.** Treat each finished task as one block of time placed at its completion, minus any break overlap.
**Consequences.** One source of truth and no sync problems. A task that spans several days appears on the day it was finished. The older `sessions` table is no longer written.

## ADR-13: Only the tracked task shows a ticking timer

**Context.** With several open tasks, identical clocks all counting upward made it unclear which one was actually being tracked, and the screen felt busy.
**Decision.** Show the live timer only on the active task (the one the big timer follows). Queued tasks show a quiet "Created … ago" that changes once a minute. Every task's time is still measured from its creation, so the total is complete when it is marked done.
**Consequences.** One clear focus and a calmer list. The elapsed time of a queued task is not visible until it is finished or becomes active. The underlying tracking rules are unchanged.

## ADR-14: Group close interruptions and allow bulk labeling

**Context.** Several short tab switches or idle stretches in a row filled the list and made review tedious.
**Decision.** Group events of the same kind (short interruptions, or inactivity) when each starts within 5 minutes of the end of the one before, with nothing of another kind between. Extended interruptions are never grouped. A group expands to show its events, which stay individually labelable, and offers bulk labels that update exactly the group's records in one transaction.
**Consequences.** Less clutter and faster review, with the original events preserved. The 5 minute gap is a fixed choice. Grouping is decided on all of the day's events so a group does not split when one of its labeled events expires.

## ADR-15: One button color scheme, following the specified palette

**Context.** Buttons mixed bright yellow, orange and white text inconsistently. A palette was specified: amber with dark text, blue (#3d6bff) with white text, red (#f2493d) with white text.
**Decision.** Use exactly those combinations: amber for primary actions, blue for break actions, red for destructive actions, with distinct hover, pressed, disabled and focus states.
**Consequences.** The amber pair passes AAA (8.3 to 1). The blue pair is 4.43 to 1, just under the 4.5 AA minimum for normal text, and the red pair is 3.62 to 1, which passes only as large text. Lighthouse reports the blue button, lowering accessibility from 100 to 96. This is a known, documented trade-off; darker shades (#3a66f5 and #d93a2f) would meet AA and are a token-only change.
