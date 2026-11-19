# NoCrast Privacy Notes

NoCrast is built so that your information never leaves your computer.

## What is stored, and where

| What | Where | Notes |
|---|---|---|
| Tasks, including timer timestamps | IndexedDB in your browser | Title, description, category, priority, deadline, created and completed times |
| Interruption events | IndexedDB | When you left or went idle, for how long, and how you labeled it |
| Breaks | IndexedDB | Start, planned and actual length, how it ended |
| Your notification sound | IndexedDB | Only if you upload one |
| Settings | localStorage | Thresholds and your sound and notification choices |

## What NoCrast does not do

- It has no server and makes no network requests for your data.
- It has no accounts, no sign-in, no analytics and no advertising.
- It does not see your other tabs, other websites or other applications. It only learns that *its own tab* was hidden or visible, and how long for. It never learns where you went.
- It does not watch anything when you have no open task, or while you are on a declared break.

## Browser permission

NoCrast asks for one permission: **desktop notifications**, used for deadline warnings and break endings. You can decline, and the on-screen notices still work. You can turn the permission off at any time in your browser's site settings.

## Your controls

- **Export JSON** gives you a copy of your tasks, events, breaks and settings.
- **Delete all data** in Settings removes everything NoCrast stored, including your sound and settings.
- Clearing the site's data in your browser also removes everything.

## Things to know

- Data lives in one browser on one computer. A private window or another browser starts empty.
- Anyone who can use your computer and browser profile can open NoCrast and see your data.
- Exported files are plain JSON. Keep them somewhere you trust.
