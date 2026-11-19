# NoCrast Architecture

A short, visual overview. For file-by-file detail, data schemas and how to extend the app, see the [developer guide](DEVELOPER_GUIDE.md). Decisions behind the design are in [DECISIONS.md](DECISIONS.md).

## 1. Layers

The code is split so that the rules which matter can be tested without a browser, and so that screens never talk to storage directly.

```mermaid
flowchart TB
  subgraph UI["React interface"]
    Pages["Pages: Today, Analytics, Settings"]
    Components["Components: TaskCard, TaskForm, BreakPanel, ToastStack"]
    Hooks["Hooks: distraction tracker, deadline warnings, clocks"]
  end
  subgraph Rules["Pure rules (no browser access)"]
    Utils["time, tracking, deadlines, breaks, classify, validation, import"]
  end
  subgraph Services["Storage and browser features"]
    DB[("IndexedDB via Dexie")]
    LS[("localStorage settings")]
    Notif["Notification API"]
    Audio["Audio playback"]
    Worker["Web Worker clock"]
  end
  Pages --> Components
  Pages --> Hooks
  Components --> Utils
  Hooks --> Utils
  Pages --> Services
  Hooks --> Services
```

- **Rules** are plain functions. They take values in and return values out.
- **Services** wrap the database, settings, notifications, sound and break changes.
- **Pages and hooks** read data live from the database, so every screen updates when the data changes.

## 2. One clock, no counters

Nothing stores a running count. Every duration is computed from timestamps:

| Value | Formula |
|---|---|
| Time on a task | (when it was completed, or now) minus when it was created |
| Break time remaining | break start plus planned length, minus now |
| Time on a task excluding breaks (analytics) | time on task minus the overlap with breaks |

A one-second tick only tells the screen to redraw. This is why refreshing, sleeping or throttling cannot cause drift.

## 3. Application state

The app is always in one of three states, derived from the data rather than stored.

```mermaid
stateDiagram-v2
  [*] --> IDLE
  IDLE --> FOCUSING: a task is created
  FOCUSING --> IDLE: the last open task is done
  FOCUSING --> BREAKING: user confirms a break
  BREAKING --> FOCUSING: break ends and a task is open
  BREAKING --> IDLE: break ends and no task is open
```

Distraction detection runs only in `FOCUSING`. Entering `BREAKING` suspends it, and leaving it restarts detection from a clean slate.

## 4. Break lifecycle

```mermaid
stateDiagram-v2
  [*] --> active: user confirms a break
  active --> active: extended
  active --> completed: time runs out, or ended after the planned time
  active --> ended_early: End break before the planned time
  active --> skipped: Skip break
  completed --> [*]
  ended_early --> [*]
  skipped --> [*]
```

Only one break can be active. A break that expires while the app is closed is completed at its planned end time on the next load.

## 5. How a deadline warning reaches you

```mermaid
sequenceDiagram
  participant W as Worker clock
  participant H as Deadline warnings hook
  participant R as Deadline rules
  participant D as IndexedDB
  participant N as Notification API
  participant U as You
  W->>H: tick every second
  H->>R: which stage is due now?
  R-->>H: a stage, or nothing
  H->>D: remember the stages already shown
  H->>N: send a desktop notification
  N-->>U: appears over any tab or app
  H-->>U: on-screen notice and sound
```

The worker clock exists because browsers slow ordinary timers in hidden tabs. The rules decide which single stage is due, so a task created close to its deadline gets one warning, not a pile.

## 6. Data model

```mermaid
erDiagram
  TASK ||--o{ ACTIVITY_EVENT : "tracked while logged"
  TASK ||--o{ BREAK_SESSION : "was open during"
  TASK {
    string id
    string title
    string priority
    number deadline
    number createdAt
    number completedAt
    array warnedMs
  }
  ACTIVITY_EVENT {
    string id
    string kind
    string verdict
    number durationMs
    number reviewedAt
  }
  BREAK_SESSION {
    string id
    string type
    number startTime
    number endTime
    number plannedDuration
    number actualDuration
    string status
    number extensionCount
  }
  SOUND {
    string id
    string name
    bytes data
  }
```

Settings live in `localStorage`. The tables `sessions`, `timer` and `breaks` remain only for older data and export compatibility.

## 7. Folder map

| Folder | Responsibility |
|---|---|
| `src/pages` | Today, Analytics and Settings screens |
| `src/components` | Reusable pieces: common, tasks, breaks, interruptions, analytics, settings |
| `src/hooks` | Browser-aware behavior: tracking, warnings, clocks |
| `src/services` | Database, settings, notifications, sound, breaks, import and export, analytics |
| `src/utils` | The pure rules |
| `src/config` | Icons, messages and navigation in one place each |
| `src/tests` and `e2e` | Unit, component and browser tests |
