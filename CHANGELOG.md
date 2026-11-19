# Changelog

All notable changes to NoCrast. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.2.0] - Interface refinements

### Changed
- Only the tracked task shows a live ticking timer. Other open tasks show a quiet "Created … ago", with their clocks still running underneath. Tasks are clearly Active (TRACKING NOW), Queued or Done.
- Break mode leads with a large countdown. The task timer is smaller and dimmed, with a note that task timers keep running.
- Priority is a thin colored left edge (red urgent, amber high, blue low, neutral medium) and is also written out. The OPEN badge was removed, and OVERDUE is a quiet label.
- Notices are anchored bottom-right (full width on a phone), never overlap, show the newest three with a count of the rest, offer Dismiss all, and the page reserves room under them.
- Buttons follow one scheme: amber with dark text, blue with white text, red with white text, with hover, pressed, disabled and focus states.
- Major cards share one faint border, radius and padding. The timer card keeps its blue outline.
- Analytics: "Completed tasks" (a duplicate of "Finished tasks") was replaced by On-time completion. The minutes chart has gridlines, axis labels and exact tooltips.
- Settings number inputs are narrow with their unit beside them, plus a short description each.
- The task card action buttons stay together, and the timer text resizes so nothing scrolls sideways on a phone.

### Added
- Grouped, expandable interruptions with "Mark all as Distraction", Productive and Necessary bulk actions.
- Browser tests for each of the changes above, including a phone-sized screen.

### Known issue
- Lighthouse accessibility is 96: white text on the requested blue (#3d6bff) is 4.43 to 1, just under the AA minimum for small text. See ADR-15.

## [0.1.0] - First release

### Added
- Tasks with title, description, category, priority and an exact deadline, in separate Open and Done lists.
- Task timers that start when a task is created and run until it is done, including past the deadline.
- A large timer that follows the open task with the earliest deadline, then highest priority, then oldest.
- Deadline warnings at 1 month, 2 weeks, 1 week, 5 days, 3 days, 1 day, 5 hours, 3 hours, 1 hour, 30 minutes, 10 minutes, 5 minutes, 1 minute and overdue, sent as desktop notifications, on-screen notices and sound.
- A choice of notification sound: system, beep, none, or your own uploaded file.
- Distraction logging for tab switches and inactivity, with an ignore threshold for accidental switches and user labels.
- Manual breaks with presets or a custom length, extend, skip and end controls, automatic expiry, and separate break history.
- Analytics for daily, weekly and monthly views, including a separate breaks summary and task and break charts.
- Export, import and delete of all data, with validation of imported files.
- Dark theme in red, orange, blue and yellow, with form hint text.
- Documentation: user guide, developer guide, requirements, architecture, decision records, test report and privacy notes.
- Unit, component and browser tests, and a GitHub Actions check.

### Changed
- Offline and installable (PWA) support was built and then removed so NoCrast is a plain web app. See ADR-09.
- Analytics now measure time on finished tasks and leave out break time.
