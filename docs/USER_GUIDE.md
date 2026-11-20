# NoCrast User Guide

NoCrast tracks how long your tasks take, notices when you wander off, and shows you your own habits. Everything stays in your browser. Nothing is sent anywhere.

## Contents

1. [Getting started](#getting-started)
2. [Tasks](#tasks)
3. [Timers](#timers)
4. [Interruptions](#interruptions)
5. [Breaks](#breaks)
6. [Analytics](#analytics)
7. [Settings](#settings)
8. [Your data](#your-data)
9. [Questions and limits](#questions-and-limits)

## Getting started

Open the app and you land on **Today**. The top bar has three pages: **Today**, **Analytics** and **Settings**.

1. Press **Add task**.
2. Type a title and press **Save task**.

That is all. The task's timer is already running.

## Tasks

### Creating a task

| Field | Required | What it is for |
|---|---|---|
| Title | Yes | Up to 120 characters. |
| Description | No | Notes to yourself, up to 1000 characters. |
| Category | No | A short label such as Work or School, up to 30 characters. It is shown on the task but is not used for filtering or analytics yet. |
| Priority | Yes | Low, medium, high or urgent. Defaults to medium. |
| Deadline | No | An exact date and time. |

If something is wrong (for example an empty title) the form shows a message and does not save.

### Working with tasks

- **Edit** opens the same form with the current values.
- **Mark done** moves the task to the **Done** list. **Reopen** on a done task moves it back to **Open**.
- The **bin** deletes the task after you confirm.

The Tasks panel has two lists, **Open** and **Done**, each with a count. Every card has the same layout: a small status line, the title in large type, a line for time, a line for category and deadline, and the buttons.

| | Active task | Queued task | Done task |
|---|---|---|---|
| What it is | The one being tracked (it also drives the big timer) | Open, waiting its turn | Finished |
| Status label | **TRACKING NOW**, with a blue outline | **Queued** (plain text) | **DONE** with a tick |
| Time shown | **Time on task**, ticking live | A quiet **Created 12 min ago** that does not tick | **Total time** and when it was finished |
| Position | First in the Open list | Below the active task | In the Done list, newest first |
| Main button | **Mark done** | **Mark done** | **Reopen** |

**Priority** is the thin colored edge on the left of a card: **red** urgent, **amber** high, **blue** low, and a neutral edge for medium. It is also written out ("Urgent priority") so it never depends on color.

A task past its deadline shows a quiet red **OVERDUE** label and "Was due …". The active task also says "Overdue, still running".

## Timers

### How task timers work

- A task's timer **starts the moment you create it**. There is no Start button.
- It **keeps running** until you mark the task done, even after the deadline has passed. A task past its deadline shows "Overdue, still running".
- When you mark it done, the time freezes and the row says **Total time**.
- If you **reopen** a done task, the time it spent marked done is not counted. It carries on from where it stopped.
- Only the task being tracked shows a ticking timer. The other open tasks show a quiet "Created … ago" instead, but **their clocks are still running** and their full time is shown as the total when you mark them done.
- Timers are based on the clock, not on counting seconds, so refreshing the page, closing the browser or putting the computer to sleep does not make them wrong.

### Deadline warnings

If a task has a deadline, NoCrast warns you as it gets close: **1 month, 2 weeks, 1 week, 5 days, 3 days, 1 day, 5 hours, 3 hours, 1 hour, 30 minutes, 10 minutes, 5 minutes and 1 minute** before it, and again when it passes. (A month is counted as 30 days.)

Each warning reaches you three ways:

- A **desktop notification**. This is the one that gets to you when you are in another tab, in another window, or in a completely different application. Click it to jump back to NoCrast. The 10 minute, 5 minute, 1 minute and overdue warnings stay on screen until you dismiss them, where your computer allows that.
- A **notice inside NoCrast**, in the bottom-right corner of the window, which stays until you press **Dismiss**. On a screen 1200 pixels wide or more, the page moves over to leave a gutter for the notices, so they never cover anything. On a narrower screen or a phone they overlay the page (full width on a phone), and the page gets extra room underneath so you can scroll anything clear of them. Notices stack without overlapping, the newest three are shown (older ones collapse into "2 earlier notices"), and **Dismiss all** clears them.
- A **sound**, which you choose in Settings (see below).

The 5 and 1 minute warnings say "Nice try" because you are racing the deadline.

Good to know:

- **Allow notifications.** The first time you save a task with a deadline, your browser asks for permission. If you said no or never answered, a yellow bar at the top offers to turn them on. If the browser has blocked them, allow them for this site in the browser's site settings, then come back to the page.
- **NoCrast has to stay open.** Notifications are sent by the page, so the browser must be running and the NoCrast tab must still be open (it can be in the background). If you close the tab or the browser, there are no warnings until you open it again. If your browser puts idle tabs to sleep (Memory Saver or similar), exempt this site or warnings can arrive late.
- **Your computer's own settings win.** Focus, Do Not Disturb and similar modes can hide or silence notifications. Phones and tablets generally do not support these notifications for web pages.
- Each warning shows once per task. If you create a task whose deadline is already close, you only see the nearest warning, not the ones you have already passed. A task due in 2 days starts with the 3 day warning.
- Changing a task's deadline resets its warnings.

When the deadline passes, an **OVERDUE** badge appears on the task and by the big timer if that task is the one being tracked. The timer keeps running and the task keeps saying "Overdue, still running" until you mark it done.

### The big timer on Today

The large timer follows one open task, chosen like this:

1. The task with the **earliest deadline**. Tasks without a deadline come last.
2. If deadlines are equal, the **higher priority** (urgent, then high, medium, low).
3. If that is also equal, the **older** task.

This decides which task is **active**: the one the big timer shows and the one that is shown ticking. Every open task's clock is still running in the background. When the active task is done, the next one takes over.

The cards under the big timer show open tasks, overdue tasks, tasks done today, distractions today and breaks today.

## Interruptions

While you have at least one open task (and are not on a break), NoCrast watches for two things:

- **Tab switches.** You switched to another tab or window and came back.
- **Possible inactivity.** No mouse, keyboard, scroll or click for the inactivity time in Settings (3 minutes by default).

It never treats these as proof of procrastination. You might have been reading, thinking or checking something for the task. That is why you get the final say.

### Accidental switches are ignored

A tab switch shorter than the minimum in Settings (10 seconds by default) is not logged and not counted.

### Types

| Type | Meaning |
|---|---|
| Short interruption | Away from the tab for less than 30 seconds, but longer than the minimum. |
| Extended interruption | Away for 30 seconds or more. |
| Possible inactivity | No input for the inactivity time. |

### Labeling

Each logged event shows three buttons: **Productive**, **Necessary** and **Distraction**.

- Only events you have not reviewed, and events you label **Distraction**, count in your distraction numbers.
- **Productive** and **Necessary** remove it from the count.
- Pressing a different label changes your answer.
- A few seconds after you label an event, a "Clears in Ns" note counts down and the event leaves the list after one minute. It is kept in your data and still counts in analytics. Events you never label stay in the list.

### Groups

Many short blips would clutter the list, so close ones are grouped.

- **What is grouped:** short interruptions, or possible-inactivity periods, of the *same kind*, where each starts within 5 minutes of the end of the one before. Another kind of event in between, or a longer gap, starts a new group. Extended interruptions are never grouped.
- **A group** shows a title such as "3 short interruptions", the total time, the time span, and how many are unreviewed. Press the title to **expand** it and see every event, each with its own Productive, Necessary and Distraction buttons.
- **Bulk labeling:** **Mark all as Distraction**, **Mark all as Productive** and **Mark all as Necessary** label every event in that group in one step. Nothing outside the group changes.
- A group that is labeled clears after a minute like any other event. If only one event of a group is left, it shows as a normal single card.

## Breaks

A break is something you declare. NoCrast never starts one for you and never assumes that being away was a break.

### Taking a break

1. Press **Take a break** in the big timer panel.
2. Choose 5, 10, 15 or 30 minutes, or type your own length (1 to 240 minutes).
3. Press **Start break** to confirm, or **Cancel** to change nothing.

### During a break

The break is the main thing on screen: a **BREAK MODE** badge, a large **countdown**, a progress bar, and how long you have been on break. You can:

- **Extend** by 5 or 10 minutes, or by your own number (1 to 120 minutes).
- **Skip break** to end it right away. It is recorded as skipped.
- **End break** to finish it. It is recorded as ended early, or completed if its time was already up.

Your task timers keep running during a break, but they step back. The task timer sits below the countdown in small, dimmed type with a note that task timers keep running, and the break time is shown inside the task's total so you can see it.

### What a break changes

- Tab switches and idle time are **not recorded** while you are on a break.
- When the break ends, tracking starts fresh. Nothing from the break is judged afterwards.
- Break time is **left out** of time on finished tasks and of distraction counts in Analytics. Breaks have their own section.

### When the time runs out

The break ends by itself and you get a "Break over" notification if notifications are on. This also works if you closed the app or refreshed during the break: the break is closed using its planned end time.

Only one break can be active at a time.

## Analytics

Pick **daily** (today), **weekly** (the last 7 days) or **monthly** (the last 30 days).

Everything is calculated from your own data. If there is not enough, the page says so instead of showing a made-up number.

### Numbers

| Number | Meaning |
|---|---|
| Time on finished tasks | Time from creation to done for tasks you finished in the period, minus time spent on breaks. |
| Finished tasks | How many tasks you marked done in the period. |
| Average per task | Time on finished tasks divided by finished tasks. |
| On-time completion | Of the tasks you finished in the period **that had a deadline**, the share finished on or before it. Finishing exactly at the deadline counts as on time. Tasks with no deadline are left out. If none had a deadline it says "No deadlines yet" instead of showing a number. |
| Distractions per task | Unreviewed and Distraction events in the period divided by finished tasks. |
| Inactivity events | Possible inactivity events in the period, whatever you labeled them. |
| Active days | Days in the period on which you finished at least one task. |
| Peak finishing hour | The hour of day when you finish the most task time. Needs at least 3 finished tasks. |

Finished tasks are placed at the time you finished them, not when you created them.

### Charts

- **Task and break minutes by day (or by hour):** blue bars are task time, orange bars are break time. Faint horizontal gridlines mark the minutes scale on the left, the dates (or hours) run along the bottom, and the top of the scale is rounded up to a tidy number. **Hover a bar, or tab to it with the keyboard, to see the exact minutes** in a tooltip.
- **Focus, interruptions and breaks:** one bar split into focus (blue), interruptions (red) and breaks (orange), with the times written underneath.

### Breaks section

Total breaks, total and average break time, average planned time, and how many were completed, skipped, ended early or extended.

## Settings

| Setting | What it does |
|---|---|
| Inactivity threshold | How long without mouse or keyboard activity before possible inactivity is logged. Type a number from 1 to 60; the unit (**minutes**) is shown beside the box. |
| Ignore short tab switches | Tab switches shorter than this are treated as accidents and not logged. Type a number from 1 to 300; the unit (**seconds**) is shown beside the box. |
| Log tab switches while you have open tasks | Turn tab tracking off completely. |
| Notification sound | **System default** uses your computer's notification sound. **Beep** plays a short beep. **My own sound** lets you choose an audio file (MP3, WAV, OGG or similar, up to 2 MB), which plays with each warning while NoCrast is open. **No sound** is silent. |
| Desktop notifications | Send a real desktop notification with each deadline warning and when a break ends. On by default; your browser still has to allow it. The Settings page shows whether the browser has allowed it and has a **Send test notification** button. On-screen notices always appear whatever you choose. |

Values outside the allowed range are corrected automatically (for example 9999 minutes becomes 60). On a phone the number box moves under its description.

## Your data

Settings has a **Your data** section.

- **Export JSON** downloads a file with your tasks, events, breaks and settings.
- **Import JSON** loads a NoCrast export. The file is checked first. If it is invalid, nothing changes. If it is valid you are asked to confirm, because **importing replaces your current data**.
- **Delete all data** removes everything in this browser after you confirm. This cannot be undone.

Data is stored per browser and per address. A different browser, a private window or a different port starts empty. Export now and then if the data matters to you.

## Questions and limits

**Does it see my other tabs or websites?** No. A web page can only see its own tab. NoCrast knows when you leave and come back, never where you went.

**Why did it log an interruption when I was working?** It cannot tell. Label it Productive or Necessary and it stops counting.

**Why is the big timer not showing my newest task?** It shows the task with the earliest deadline, then highest priority, then oldest. See [The big timer on Today](#the-big-timer-on-today).

**Can I pause a task timer?** No. Timers run until you mark the task done. Use a break to step away without it counting as a distraction. Break time is shown within the task's total and kept out of Analytics.

**Tracking only works while the app is open.** Tab and inactivity tracking need NoCrast open in a browser tab.
